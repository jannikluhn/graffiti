//SPDX-License-Identifier: MIT
pragma solidity ^0.7.0;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

struct Account {
    int128 balance;
    uint64 taxBase;
    uint64 lastTaxPayment;
}

struct Earmark {
    address receiver;
    uint64 amount;
}

contract Graffiti is ERC721, Ownable {

    event Deposit(
        address account,
        uint64 amount,
        int128 balance
    );
    event Withdraw(
        address account,
        uint64 amount,
        int128 balance
    );
    event ColorChange(
        uint256 pixelID,
        uint8 color
    );
    event PriceChange(
        uint256 pixelID,
        uint64 price
    );
    event Buy(
        uint256 pixelID,
        address seller,
        address buyer,
        uint64 price
    );
    event TaxWithdraw(
        uint256 amount,
        address receiver
    );
    event EarmarkUpdate(
        uint256 pixelID,
        address receiver,
        uint64 amount
    );
    event PixelClaim(
        uint256 pixelID,
        uint64 amount
    );

    constructor(uint128 width, uint128 height) ERC721("Pixel", "PIX") {
        require(width > 0, "Graffiti: width must not be zero");
        require(height > 0, "Graffiti: height must not be zero");
        _maxPixelID = width * height - 1;
    }

    uint256 private _maxPixelID;

    mapping(uint256 => uint64) private _pixelPrices;
    mapping(address => Account) private _accounts;
    mapping(uint256 => Earmark) private _earmarks;
    mapping(address => uint256) private _totalTaxesPayedBy;
    uint256 private _totalTaxesPayed;
    uint256 private _totalTaxesWithdrawn;

    uint256 constant taxRateDenominator = 10;
    uint256 constant taxRateNumerator = 1;

    //
    // Pixel getters
    //
    function exists(uint256 pixelID) view public returns (bool) {
        return _exists(pixelID);
    }

    function getPrice(uint256 pixelID) view public returns (uint64) {
        if (!_exists(pixelID)) {
            return 0;
        }

        address owner = ownerOf(pixelID);
        if (getBalance(owner) <= 0) {
            return 0;
        }

        return _pixelPrices[pixelID];
    }

    function getMaxPixelID() view public returns (uint256) {
        return _maxPixelID;
    }

    //
    // Account getters
    //
    function getTaxBase(address account) view public returns (uint64) {
        return _accounts[account].taxBase;
    }

    function getLastTaxPayment(address account) view public returns (uint64) {
        return _accounts[account].lastTaxPayment;
    }

    function getBalance(address account) view public returns (int128) {
        Account memory acc = _accounts[account];
        uint64 unaccountedTax = _computeTax(acc.taxBase, acc.lastTaxPayment, uint64(block.timestamp));
        return _subInt128(acc.balance, unaccountedTax);
    }

    function getTotalTaxesWithdrawn() view public returns (uint256) {
        return _totalTaxesWithdrawn;
    }

    function getTotalTaxesPayed() view public returns (uint256) {
        return _totalTaxesPayed;
    }

    function getTotalTaxesPayedBy(address account) view public returns (uint256) {
        return _totalTaxesPayedBy[account];
    }

    //
    // State updates
    //
    function buy(uint256 pixelID, uint64 maxPrice, uint64 newPrice, uint8 color) public {
        _buy(msg.sender, pixelID, maxPrice, newPrice, color);
    }

    function _buy(address buyerAddress, uint256 pixelID, uint64 maxPrice, uint64 newPrice, uint8 color) internal {
        uint64 price = getPrice(pixelID);
        require(price <= maxPrice, "Graffiti: pixel price exceeds max price");

        // pay taxes for buyer so that balance is up to date
        payTax(buyerAddress);
        Account memory buyer = _accounts[buyerAddress];

        // check that buyer has enough money to buy
        require(buyer.balance >= price, "Graffiti: balance too low");

        // reduce buyer's balance and increase buyer's tax base
        buyer.balance = _subInt128(buyer.balance, price);
        buyer.taxBase = _addUint64(buyer.taxBase, newPrice);

        _accounts[buyerAddress] = buyer;

        address owner;
        if (_exists(pixelID)) {
            owner = ownerOf(pixelID);
            require(owner != buyerAddress, "Graffiti: cannot buy pixel from yourself");

            // pay tax for seller so that balance is up to date
            payTax(owner);
            Account memory seller = _accounts[owner];

            // increase seller's balance and decrease seller's tax base
            seller.balance = _addInt128(seller.balance, price);
            seller.taxBase = _subUint64(seller.taxBase, price);

            _accounts[owner] = seller;
            _transfer(owner, buyerAddress, pixelID);
            _earmark(pixelID, address(0), 0); // cancel any earmark
        } else {
            owner = address(0);
            require(pixelID <= _maxPixelID, "Graffiti: max pixel ID exceeded");
            _mint(buyerAddress, pixelID);
        }

        _pixelPrices[pixelID] = newPrice;

        emit Buy({
            pixelID: pixelID,
            seller: owner,
            buyer: buyerAddress,
            price: price
        });
        emit ColorChange({
            pixelID: pixelID,
            color: color
        });
        emit PriceChange({
            pixelID: pixelID,
            price: newPrice
        });
    }

    function setColor(uint256 pixelID, uint8 color) public {
        require(_exists(pixelID), "Graffiti: pixel does not exist");
        address owner = ownerOf(pixelID);
        require(msg.sender == owner, "Graffiti: only pixel owner can set color");
        emit ColorChange({
            pixelID: pixelID,
            color: color
        });
    }

    function setPrice(uint256 pixelID, uint64 newPrice) public {
        require(_exists(pixelID));
        address owner = ownerOf(pixelID);
        require(msg.sender == owner, "Graffiti: only owner can set pixel price");

        payTax(msg.sender);
        Account memory account = _accounts[msg.sender];

        account.taxBase = _subUint64(account.taxBase, _pixelPrices[pixelID]);
        account.taxBase = _addUint64(account.taxBase, newPrice);

        _pixelPrices[pixelID] = newPrice;
        _accounts[msg.sender] = account;

        emit PriceChange({
            pixelID: pixelID,
            price: newPrice
        });
    }

    function payTax(address account) public {
        Account memory acc = _accounts[account];

        uint64 unaccountedTax = _computeTax(acc.taxBase, acc.lastTaxPayment, uint64(block.timestamp));
        if (unaccountedTax > 0 || acc.lastTaxPayment == 0) {
            uint64 taxPayed;
            if (acc.balance >= unaccountedTax) {
                taxPayed = unaccountedTax;
            } else if (acc.balance >= 0) {
                taxPayed = uint64(acc.balance);
            } else {
                taxPayed = 0;
            }
            acc.balance = _subInt128(acc.balance, unaccountedTax);
            acc.lastTaxPayment = uint64(block.timestamp);

            _accounts[account] = acc;
            _totalTaxesPayed += taxPayed;
            _totalTaxesPayedBy[account] += taxPayed;
        }
    }

    function depositFor(address account) payable public {
        payTax(msg.sender);
        Account memory acc = _accounts[account];

        require(msg.value % (1 gwei) == 0, "Graffiti: deposit amount must be multiple of 1 GWei");
        uint64 amount = uint64(msg.value / (1 gwei));
        if (acc.balance < 0) {
            // the account owes taxes
            uint64 tax;
            if (amount <= -acc.balance) {
                tax = amount;
            } else {
                tax = uint64(-acc.balance);
            }
            _totalTaxesPayed += tax;
            _totalTaxesPayedBy[account] += tax;
        }
        acc.balance = _addInt128(acc.balance, amount);

        _accounts[account] = acc;
        emit Deposit({
            account: account,
            amount: amount,
            balance: acc.balance
        });
    }

    function deposit() payable public {
        depositFor(msg.sender);
    }

    function withdrawTo(uint64 amount, address receiver) public {
        _withdraw(msg.sender, amount, receiver);
    }

    function withdraw(uint64 amount) public {
        _withdraw(msg.sender, amount, msg.sender);
    }

    function _withdraw(address account, uint64 amount, address receiver) internal {
        payTax(account);
        Account memory acc = _accounts[account];

        require(acc.balance >= amount, "Graffiti: cannot withdraw more than balance");
        acc.balance = _subInt128(acc.balance, amount);

        (bool success,) = receiver.call{value: amount * (1 gwei)}("");
        require(success, "Graffiti: withdraw call reverted");
        _accounts[account] = acc;
        emit Withdraw({
            account: account,
            amount: amount,
            balance: acc.balance
        });
    }

    function depositAndBuy(uint256 pixelID, uint64 maxPrice, uint64 newPrice, uint8 color) payable public {
        depositFor(msg.sender);
        _buy(msg.sender, pixelID, maxPrice, newPrice, color);
    }

    //
    // Tax withdrawal
    //
    function _withdrawTaxes(uint256 amount, address receiver) internal {
        uint256 taxBalance = _totalTaxesPayed - _totalTaxesWithdrawn;
        require(amount <= taxBalance, "Graffiti: not enough taxes to withdraw");
        _totalTaxesWithdrawn += amount;
        (bool success,) = receiver.call{value: amount * (1 gwei)}("");
        require(success, "Graffiti: withdraw taxes call reverted");
        emit TaxWithdraw({
            amount: amount,
            receiver: receiver
        });
    }

    function withdrawTaxesTo(uint256 amount, address receiver) public onlyOwner {
        _withdrawTaxes(amount, receiver);
    }

    function withdrawTaxes(uint256 amount) public onlyOwner {
        _withdrawTaxes(amount, msg.sender);
    }

    function withdrawAllTaxes() public onlyOwner {
        _withdrawTaxes(_totalTaxesPayed - _totalTaxesWithdrawn, msg.sender);
    }

    //
    // Earmarks
    //
    function earmark(uint256 pixelID, address receiver, uint64 amount) public {
        require(_exists(pixelID), "Graffiti: pixel does not exist");
        address owner = ownerOf(pixelID);
        require(msg.sender == owner, "Graffiti: only owner can earmark pixel");
        require(receiver != owner, "Graffiti: cannot earmark for owner");
        
        _earmark(pixelID, receiver, amount);
    }

    function _earmark(uint256 pixelID, address receiver, uint64 amount) internal {
        _earmarks[pixelID] = Earmark({
            receiver: receiver,
            amount: amount
        });
        emit EarmarkUpdate({
            pixelID: pixelID,
            receiver: receiver,
            amount: amount
        });
    }

    function claim(uint256 pixelID, uint64 maxPrice, uint64 minAmount) public {
        require(_exists(pixelID), "Graffiti: pixel does not exist");
        address owner = ownerOf(pixelID);
        Earmark memory em = _earmarks[pixelID];
        require(msg.sender == em.receiver, "Graffiti: account not allowed to claim pixel");

        payTax(owner);
        payTax(msg.sender);

        Account memory sender = _accounts[owner];
        Account memory receiver = _accounts[msg.sender];
        uint64 price = _pixelPrices[pixelID];

        require(price <= maxPrice, "Graffiti: pixel is too expensive");

        sender.taxBase = _subUint64(sender.taxBase, price);
        receiver.taxBase = _addUint64(receiver.taxBase, price);

        uint64 amount;
        if (sender.balance >= em.amount) {
            amount = em.amount;
        } else {
            if (sender.balance >= 0)  {
                amount = uint64(sender.balance);
            } else {
                amount = 0;
            }
        }
        require(amount >= minAmount, "Graffiti: amount is too small");
        sender.balance = _subInt128(sender.balance, amount);
        receiver.balance = _addInt128(receiver.balance, amount);

        _accounts[owner] = sender;
        _accounts[msg.sender] = receiver;
        _transfer(owner, msg.sender, pixelID);
        _earmark(pixelID, address(0), 0);

        emit PixelClaim({
            pixelID: pixelID,
            amount: amount
        });
    }

    function getEarmarkReceiver(uint256 pixelID) view public returns (address) {
        return _earmarks[pixelID].receiver;
    }

    function getEarmarkAmount(uint256 pixelID) view public returns (uint64) {
        return _earmarks[pixelID].amount;
    }

    //
    // Helpers
    //
    function _addUint64(uint64 a, uint64 b) pure internal returns (uint64) {
        if (a <= type(uint64).max - b) {
            return a + b;
        } else {
            return type(uint64).max;
        }
    }

    function _subUint64(uint64 a, uint64 b) pure internal returns (uint64) {
        if (a >= b) {
            return a - b;
        } else {
            return 0;
        }
    }

    function _addInt128(int128 a, uint64 b) pure internal returns (int128) {
        if (a <= type(int128).max - b) {
            return a + b;
        } else {
            return type(int128).max;
        }
    }

    function _subInt128(int128 a, uint64 b) pure internal returns (int128) {
        if (a >= type(int128).min + b) {
            return a - b;
        } else {
            return type(int128).min;
        }
    }

    function _computeTax(uint64 taxBase, uint64 startTime, uint64 endTime) pure internal returns (uint64) {
        require(endTime >= startTime, "Graffiti: end time must be later than start time");
        uint256 num = uint256(endTime - startTime) * taxBase * taxRateNumerator;
        uint256 denom = 365 * 24 * 60 * 60 * taxRateDenominator;
        uint256 tax = num / denom;
        if (tax <= type(uint64).max) {
            return uint64(tax);
        } else {
            return type(uint64).max;
        }
    }

    //
    // Transfer overrides from ERC721
    //
    function transferFrom(address, address, uint256) public virtual override {
        assert(false); // transferring pixels is not possible
    }

    function safeTransferFrom(address, address, uint256) public virtual override {
        assert(false); // transferring pixels is not possible
    }

    function safeTransferFrom(address, address, uint256, bytes memory) public virtual override {
        assert(false); // transferring pixels is not possible
    }
}
