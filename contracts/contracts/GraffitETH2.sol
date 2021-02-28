//SPDX-License-Identifier: MIT
pragma solidity ^0.7.0;
pragma abicoder v2;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

// GraffitETH is an NFT contract in which each token represents a pixel. The owner has the right
// to change the pixel color. Pixel ownership is governed by the Harberger tax mechanism, i.e.,
// - every pixel can be bought at any time at a price the owner has to set
// - the owner has to pay a tax proportional to the pixel price
//
// In order to facilitate tax payments, the contract manages accounts. Each account stores a
// balance and the tax base. The tax base is the sum of the prices of all pixels the account owns.
// It is used to calculate the tax burden (tax base * tax rate per second = tax burden per second).
// The balance is increased by depositing and decreased by withdrawing or paying taxes. The account
// also stores the time at which the last tax payment has been carried out. This is used to
// calculate the timespan for which taxes have to be paid next time. The contract ensures that
// taxes are paid whenever the balance or tax base changes. This means that the "missing" tax is
// always simply tax base * tax rate * time since last tax payment.
//
// Account balances beomce negative if the deposit does not cover the tax burden. In this case, new
// deposits go directly to the tax receiver's account until the account balance is zero again.
//
// If an account balance is negative (i.e. taxes have not been paid), the account's pixels can be
// bought for free by anyone with a non-negative balance.
//
// All amounts and prices are stored in GWei and usually as uint64's. In order to avoid overflows,
// in most cases math is carried out "clamped", i.e., if numbers would go above the maximum (or
// below the minimum) we just treat them as if they would be exactly at the maximum (minimum). This
// means very large or very low numbers are not necessarily accurate. However, the positive maximum
// is realistically never going to be reached (it corresponds to ~18B ETH/xDai). The negative
// maximum can be reached by setting a pixel price extermely high and accumulating the debt. In
// this case, the clamping would save the account some taxes, but only when it's already so much in
// debt that it will likely never be repaid anyway.
//
// The clamping math is an alternative to the usual approach of reverting transactions when
// numbers run out of bounds. The latter might be a way for an owner to prevent their pixels being
// sold.
//
// The main exception from using clamped math is for calculating the tax base as the sum of all
// pixel prices. Otherwise, one could do the following:
// 1) set the price of two pixels to 2**64 - 1, meaning the tax base would be clamped
//    at 2**64 - 1.
// 2) set the price of one of the pixels to 0, meaning the tax base is zero. Thus,
//    one would have to pay no taxes despite owning one pixel at price 2**64 - 1.
// Instead, we revert if the sum would exceed the maximum allowed value, so that the user can
// choose a lower value.
//
// The contract tracks the total amount of taxes an account has paid. This allows them to claim a
// proportional amount of DAO shares in a separate contract.
//
// Freely transferring pixels is prevented as it would not only transfer value, but also the
// obligation to pay taxes. Instead, we allow pixel owners to "earmark" pixels for other users. The
// earmark stores the receiver's address and an additional amount. The receiver can claim any
// pixel that is earmarked to them. If they do, the pixel as well as the deposit amount is
// transferred to them.

// Every user of the system gets one account that tracks their balance and tax payments.
struct Account {
    int128 balance;
    uint64 taxBase;
    uint64 lastTaxPayment;
    uint64 totalTaxesPaid;
}

// An earmark is created by a pixel's owner and allows the receiver to claim the pixel along with
// a part of their deposit.
struct Earmark {
    address receiver;
    uint64 amount;
}

// Struct grouping arguments for buy functions used to circumvent stack limit.
struct PixelBuyArgs {
    uint256 pixelID;
    uint64 maxPrice;
    uint64 newPrice;
    uint8 color;
}

// RugPull is a safety hatch. It allows the owner to withdraw all funds from a contract in case of
// a bug, in particular to be able to withdraw stuck funds. This action must be announced a certain
// time in advance (e.g., a month, configurable) in order to allow users that don't trust the owner
// to withdraw their deposits first. The safety hatch can be disabled once the contract has proven
// to work reliably.
//
// This contract is intended to be a base from which other contracts inherit from. It does not
// implement any access control, but instead exposes rugpull functions as internal functions.
contract RugPull {
    event RugPullAnnounced(
        address indexed sender,
        uint256 timestamp,
        uint256 rugPullTime
    );
    event RugPulled(
        address indexed sender,
        address indexed receiver,
        uint256 value
    );
    event RugPullDisabled(address indexed sender);

    uint256 private _rugPullHeadsUp;
    uint256 private _rugPullTime;
    bool private _rugPullDisabled;

    constructor(uint256 headsUp) {
        // avoid overflow if heads up is chosen extremely large
        require(headsUp <= 5 * 365 * 24 * 60 * 60, "RugPull: heads up too big");

        _rugPullHeadsUp = headsUp;
        _rugPullDisabled = false;
        _rugPullTime = 0;
    }

    function _disableRugPull() internal {
        require(!_rugPullDisabled, "RugPull: already disabled");
        _rugPullDisabled = true;

        emit RugPullDisabled(msg.sender);
    }

    function _announceRugPull() internal {
        require(!_rugPullDisabled, "RugPull: disabled");
        require(_rugPullTime == 0, "RugPull: already announced");
        _rugPullTime = block.timestamp + _rugPullHeadsUp;

        emit RugPullAnnounced({
            sender: msg.sender,
            timestamp: block.timestamp,
            rugPullTime: _rugPullTime
        });
    }

    function _performRugPull(address receiver, uint256 value) internal {
        require(!_rugPullDisabled, "RugPull: disabled");
        require(_rugPullTime != 0, "RugPull: not announced yet");
        require(
            block.timestamp >= _rugPullTime,
            "RugPull: heads up not passed yet"
        );

        (bool success, ) = receiver.call{value: value}("");
        require(success, "RugPull: sending funds failed");

        emit RugPulled({sender: msg.sender, receiver: receiver, value: value});
    }

    /// @dev Get the minimum time interval in seconds between announcement and the first block at
    ///     which the owner can perform the rug pull.
    function getRugPullHeadsUp() public view returns (uint256) {
        return _rugPullHeadsUp;
    }

    /// @dev Get the earliest timestamp at which the owner can perform the rug pull or zero if the
    ///     rug pull has not been announced yet.
    function getRugPullTime() public view returns (uint256) {
        return _rugPullTime;
    }

    /// @dev Check if the rug pull safety hatch is disabled or not.
    function checkRugPullDisabled() public view returns (bool) {
        return _rugPullDisabled;
    }

    /// @dev Check if a rug pull has already been announced.
    function checkRugPullAnnounced() public view returns (bool) {
        return _rugPullTime != 0;
    }
}

contract GraffitETH2 is ERC721, Ownable, RugPull {
    //
    // Events
    //

    event Deposited(
        address indexed account,
        address indexed depositor,
        uint64 amount,
        int128 balance
    );
    event Withdrawn(
        address indexed account,
        address indexed receiver,
        uint64 amount,
        int128 balance
    );
    event ColorChanged(
        uint256 indexed pixelID,
        address indexed owner,
        uint8 color
    );
    event PriceChanged(
        uint256 indexed pixelID,
        address indexed owner,
        uint64 price
    );
    event Bought(
        uint256 indexed pixelID,
        address indexed seller,
        address indexed buyer,
        uint64 price
    );
    event TaxWithdrawn(uint256 amount, address indexed receiver);
    event Earmarked(
        uint256 indexed pixelID,
        address indexed owner,
        address indexed receiver,
        uint64 amount
    );
    event PixelClaimed(
        uint256 indexed pixelID,
        address indexed oldOwner,
        address indexed newOwner,
        uint64 amount
    );

    //
    // State variables
    //

    // the tax rate per second is _taxRateNumerator / _taxRateDenominator
    uint256 private _taxRateNumerator;
    uint256 private _taxRateDenominator;
    uint64 private _taxStartTime; // timestamp before which no taxes have to be paid

    uint256 private _maxPixelID; // pixel ids range from 0 to _maxPixelID (inclusive)
    uint64 private _initialPrice; // initial price at which pixels are first sold

    // during initialization the owner can set owners, prices, and colors of pixels.
    bool _initializing;

    mapping(uint256 => uint64) private _pixelPrices;

    mapping(address => Account) private _accounts;
    mapping(uint256 => Earmark) private _earmarks;

    uint64 private _totalInitialSaleRevenue; // amount raised for owner by selling pixels for first time
    uint64 private _totalTaxesPaid; // sum of all taxes paid
    // amount withdrawn by owner so far, both from taxes and initial sales
    uint64 private _totalWithdrawnByOwner;

    //
    // constructor
    //
    constructor(
        uint128 width,
        uint128 height,
        uint256 taxRateNumerator,
        uint256 taxRateDenominator,
        uint64 taxStartTime,
        uint64 initialPrice,
        uint256 rugPullHeadsUp
    ) ERC721("Pixel", "PXL") RugPull(rugPullHeadsUp) {
        require(width > 0, "GraffitETH2: width must not be zero");
        require(height > 0, "GraffitETH2: height must not be zero");
        // this avoids a theoretical overflow during tax computation
        require(
            taxRateNumerator <= type(uint64).max,
            "GraffitETH2: tax rate numerator must not be too large"
        );
        require(
            taxRateDenominator > 0,
            "GraffitETH2: tax rate denominator must not be zero"
        );
        _initializing = true;
        _maxPixelID = width * height - 1;
        _taxRateNumerator = taxRateNumerator;
        _taxRateDenominator = taxRateDenominator;
        _taxStartTime = taxStartTime;
        _initialPrice = initialPrice;
    }

    //
    // Getters (functions that let other random contracts and stuff read the state)
    //

    /// @dev check is a pixel exists, i.e., has an owner.
    function exists(uint256 pixelID) public view returns (bool) {
        return _exists(pixelID);
    }

    /// @dev Get the nominal price of a pixel in GWei. The nominal price is the price at which the
    ///     owner wants to sell it (the actual price might be different if the owner is indebted),
    ///     or the initial price if there is no owner yet.
    function getNominalPrice(uint256 pixelID) public view returns (uint64) {
        if (!_exists(pixelID)) {
            return _initialPrice;
        }
        return _pixelPrices[pixelID];
    }

    /// @dev Get the price for which anyone can buy a pixel in GWei. For non-existant pixels it is
    ///     the initial price. For all other pixels, it is the nominal price if the owner isn't
    ///     indebted, or zero if they are.
    function getPrice(uint256 pixelID) public view returns (uint64) {
        if (!_exists(pixelID)) {
            return _initialPrice;
        }

        address owner = ownerOf(pixelID);
        if (getBalance(owner) < 0) {
            return 0;
        }

        return _pixelPrices[pixelID];
    }

    /// @dev Get the maximum valid pixel id.
    function getMaxPixelID() public view returns (uint256) {
        return _maxPixelID;
    }

    /// @dev Get the tax rate per second as nominator-denominator-tuple.
    function getTaxRate() public view returns (uint256, uint256) {
        return (_taxRateNumerator, _taxRateDenominator);
    }

    /// @dev Get the time from which on taxes have to be paid. Before this time, no taxes have to
    ///     be paid.
    function getTaxStartTime() public view returns (uint64) {
        return _taxStartTime;
    }

    /// @dev Get the initial pixel price in GWei.
    function getInitialPrice() public view returns (uint64) {
        return _initialPrice;
    }

    /// @dev Get the tax base in GWei of an account. The tax base is the sum of the nominal prices
    ///     of all pixels owned by the account. The tax an account has to pay per time interval is
    ///     the tax rate times the tax base.
    function getTaxBase(address account) public view returns (uint64) {
        return _accounts[account].taxBase;
    }

    /// @dev Get the time at which the last tax has been recorded for the given account.
    function getLastTaxPayment(address account) public view returns (uint64) {
        return _accounts[account].lastTaxPayment;
    }

    /// @dev Get the current balance of an account in GWei. This includes all tax payments up to
    ///     now, including tax debt since lastTaxPayment, i.e., tax debt not reflected in the
    ///     balance stored in the contract state.
    function getBalance(address account) public view returns (int128) {
        Account memory acc = _accounts[account];
        uint64 taxPaid;
        (acc, taxPaid) = _payTaxes(acc);
        return acc.balance;
    }

    /// @dev Get the total money withdrawn by the owner in GWei, both from taxes and initial pixel
    ///     sales.
    function getTotalWithdrawnByOwner() public view returns (uint256) {
        return _totalWithdrawnByOwner;
    }

    /// @dev Get the total amount of taxes paid in GWei.
    function getTotalTaxesPaid() public view returns (uint256) {
        return _totalTaxesPaid;
    }

    /// @dev Get the total amount of taxes paid by the given account in GWei.
    function getTotalTaxesPaidBy(address account)
        public
        view
        returns (uint256)
    {
        return _accounts[account].totalTaxesPaid;
    }

    /// @dev Get the maximum amount of funds (from both initial pixel sales and from taxes) in
    ///     GWei that the owner can to withdraw at the moment.
    function getOwnerWithdrawableAmount() public view returns (uint64) {
        uint64 totalRevenue =
            ClampedMath.addUint64(_totalTaxesPaid, _totalInitialSaleRevenue);
        assert(_totalWithdrawnByOwner <= totalRevenue);
        uint64 amount = totalRevenue - _totalWithdrawnByOwner;
        return amount;
    }

    /// @dev Get the total money raised by initial pixel sales in GWei.
    function getTotalInitialSaleRevenue() public view returns (uint256) {
        return _totalInitialSaleRevenue;
    }

    /// @dev Get the address for which a pixel is earmarked.
    function getEarmarkReceiver(uint256 pixelID) public view returns (address) {
        return _earmarks[pixelID].receiver;
    }

    /// @dev Get the amount a claimer is allowed to take over from the earmarker.
    function getEarmarkAmount(uint256 pixelID) public view returns (uint64) {
        return _earmarks[pixelID].amount;
    }

    /// @dev Check if the contract is in its initialization phase.
    function isInitializing() public view returns (bool) {
        return _initializing;
    }

    //
    // Public interface
    //

    /// @dev Buy a pixel for its current price and set the new price in GWei and color.according
    ///     to the arguments. The pixel will only be bought if the price does not exceed the given
    ///     max price.
    function buy(PixelBuyArgs memory args) public {
        _buy(msg.sender, args);
    }

    /// @dev Buy many pixels at once.
    function buyMany(PixelBuyArgs[] memory args) public {
        _buyMany(msg.sender, args);
    }

    /// @dev Deposit and buy in a single call.
    function depositAndBuy(PixelBuyArgs memory args) public payable {
        _depositTo(msg.sender, msg.sender);
        _buy(msg.sender, args);
    }

    /// @dev Deposit and buy many pixels in a single call.
    function depositAndBuyMany(PixelBuyArgs[] memory args) public payable {
        _depositTo(msg.sender, msg.sender);
        _buyMany(msg.sender, args);
    }

    /// @dev Set the color of the given pixel. Only the pixel owner can do this.
    function setColor(uint256 pixelID, uint8 color) public {
        require(_exists(pixelID), "GraffitETH2: pixel does not exist");
        address owner = ownerOf(pixelID);
        require(
            msg.sender == owner,
            "GraffitETH2: only pixel owner can set color"
        );
        emit ColorChanged({pixelID: pixelID, owner: owner, color: color});
    }

    /// @dev Set the price of a pixel in GWei. Only the pixel owner can do this.
    function setPrice(uint256 pixelID, uint64 newPrice) public {
        require(_exists(pixelID));
        address owner = ownerOf(pixelID);
        require(
            msg.sender == owner,
            "GraffitETH2: only pixel owner can set price"
        );

        Account memory account = _accounts[msg.sender];
        uint64 taxesPaid;
        (account, taxesPaid) = _payTaxes(account);

        uint64 oldPrice = _pixelPrices[pixelID];
        account = _decreaseTaxBase(account, oldPrice);
        account = _increaseTaxBase(account, newPrice);

        _pixelPrices[pixelID] = newPrice;
        _totalTaxesPaid = ClampedMath.addUint64(_totalTaxesPaid, taxesPaid);
        _accounts[msg.sender] = account;

        emit PriceChanged({pixelID: pixelID, owner: owner, price: newPrice});
    }

    /// @dev Update the balance of the account stored in the account state to reflect tax debt for
    ///     the time between last tax payment and now.
    function payTaxes(address account) public {
        Account memory acc = _accounts[account];
        uint64 taxesPaid;
        (acc, taxesPaid) = _payTaxes(acc);

        _accounts[account] = acc;
        _totalTaxesPaid = ClampedMath.addUint64(_totalTaxesPaid, taxesPaid);
    }

    /// @dev Deposit money to the given account.
    function depositTo(address account) public payable {
        _depositTo(msg.sender, account);
    }

    /// @dev Deposit money for the sender.
    function deposit() public payable {
        _depositTo(msg.sender, msg.sender);
    }

    /// @dev Withdraw an amount of GWei from the caller's account and send it to the given
    ///     receiver address.
    function withdrawTo(uint64 amount, address receiver) public {
        _withdraw(msg.sender, amount, receiver);
    }

    /// @dev Withdraw an amount of GWei from the caller's account and send it to the caller.
    function withdraw(uint64 amount) public {
        _withdraw(msg.sender, amount, msg.sender);
    }

    /// @dev Withdraw the maximum possible amount from the caller's account and send it to the
    ///     given receiver address.
    function withdrawMaxTo(address receiver) public {
        _withdrawMax(msg.sender, receiver);
    }

    /// @dev Withdraw the maximum possible amount from the caller's account and send it to the
    ///     caller.
    function withdrawMax() public {
        _withdrawMax(msg.sender, msg.sender);
    }

    /// @dev Withdraw a part of the taxes and income from initial sales and send it to the given
    ///     receiver address. The withdrawal amount is specified in GWei. Only the contract
    ///     owner is allowed to do this.
    function withdrawOwnerTo(uint64 amount, address receiver) public onlyOwner {
        _withdrawOwner(amount, receiver);
    }

    /// @dev Withdraw a part of the taxes and income from initial sales and send it to the caller.
    ///     The withdrawal amount is specified in GWei. Only the contract owner is allowed to do
    ///     this.
    function withdrawOwner(uint64 amount) public onlyOwner {
        _withdrawOwner(amount, msg.sender);
    }

    /// @dev Withdraw all of the taxes and income from initial sales and send it to the caller.
    ///     Only the contract owner is allowed to do this.
    function withdrawMaxOwner() public onlyOwner {
        _withdrawOwner(getOwnerWithdrawableAmount(), msg.sender);
    }

    /// @dev Earmark a pixel so that the specified account can claim it. Only the pixel owner can
    ///     earmark a pixel. In addition to the pixel, the owner can also gets the specified part
    ///     of the deposit.
    function earmark(
        uint256 pixelID,
        address receiver,
        uint64 amount
    ) public {
        require(_exists(pixelID), "GraffitETH2: pixel does not exist");
        address owner = ownerOf(pixelID);
        require(
            msg.sender == owner,
            "GraffitETH2: only pixel owner can set earmark"
        );
        require(receiver != owner, "GraffitETH2: cannot earmark for owner");

        _earmark(pixelID, owner, receiver, amount);
    }

    /// @dev Claim a pixel previously earmarked to the caller. This will transfer the pixel to the
    ///     claimer, without changing price or color. In addition, a part of the deposit of the
    ///     original owner will be transferred to the claimer's account, depending on the amount
    ///     the earmarker allowed and their balance. The pixel is only claimed if its price does
    ///     not exceed `maxPrice` and the transferred deposit is at least `minAmount`.
    function claim(
        uint256 pixelID,
        uint64 maxPrice,
        uint64 minAmount
    ) public {
        _claim(msg.sender, pixelID, maxPrice, minAmount);
    }

    /// @dev Freely set the initial owner, price, and color of a pixel. Only the owner can do this
    ///     and only during the initialization phase.
    function init(
        uint256[] memory pixelIDs,
        address[] memory owners,
        uint64[] memory prices,
        uint8[] memory colors
    ) public onlyOwner {
        require(
            _initializing,
            "GraffitETH2: initialization phase already over"
        );

        uint256 n = pixelIDs.length;
        require(
            owners.length == n,
            "GraffitETH2: number of owners different from number of pixels"
        );
        require(
            prices.length == n,
            "GraffitETH2: number of prices different from number of pixels"
        );
        require(
            colors.length == n,
            "GraffitETH2: number of colors different from number of pixels"
        );

        for (uint256 i = 0; i < n; i++) {
            uint256 pixelID = pixelIDs[i];
            address owner = owners[i];
            uint64 price = prices[i];
            uint8 color = colors[i];

            if (_exists(pixelID)) {
                _transfer(ownerOf(pixelID), owner, pixelID);
            } else {
                _mint(owner, pixelID);
            }

            Account memory acc = _accounts[owner];
            uint64 taxesPaid;
            (acc, taxesPaid) = _payTaxes(acc);
            acc = _increaseTaxBase(acc, price);

            _pixelPrices[pixelID] = price;
            _accounts[owner] = acc;
            if (taxesPaid > 0) {
                _totalTaxesPaid = ClampedMath.addUint64(_totalTaxesPaid, taxesPaid);
            }
            emit PriceChanged({pixelID: pixelID, owner: owner, price: price});
            emit ColorChanged({pixelID: pixelID, owner: owner, color: color});
        }
    }

    /// @dev Stop the initialization phase. Only the owner can do this.
    function stopInitialization() public onlyOwner {
        require(
            _initializing,
            "GraffitETH2: initialization phase already over"
        );
        _initializing = false;
    }

    /// @dev Disable the rug pull mechanic for good.
    function disableRugPull() public onlyOwner {
        _disableRugPull();
    }

    /// @dev Announce a rug pull to happen after the rug pull heads up.
    function announceRugPull() public onlyOwner {
        _announceRugPull();
    }

    /// @dev Withdraw funds from contract after a rug pull has been announced.
    function performRugPull(address receiver, uint256 value) public onlyOwner {
        _performRugPull(receiver, value);
    }

    //
    // Internal functions
    //

    function _payTaxes(Account memory account)
        internal
        view
        returns (Account memory, uint64)
    {
        return
            Taxes.payTaxes(
                account,
                _taxRateNumerator,
                _taxRateDenominator,
                _taxStartTime
            );
    }

    function _payMoreTaxes(Account memory account, uint64 taxesPaid)
        internal
        view
        returns (Account memory, uint64)
    {
        return
            Taxes.payMoreTaxes(
                account,
                taxesPaid,
                _taxRateNumerator,
                _taxRateDenominator,
                _taxStartTime
            );
    }

    function _increaseTaxBase(Account memory account, uint64 newPixelPrice)
        internal
        pure
        returns (Account memory)
    {
        require(
            newPixelPrice <= type(uint64).max - account.taxBase,
            "GraffitETH2: pixel price too high, tax base max exceeded"
        );
        account.taxBase += newPixelPrice;
        return account;
    }

    function _decreaseTaxBase(Account memory account, uint64 oldPixelPrice)
        internal
        pure
        returns (Account memory)
    {
        assert(account.taxBase >= oldPixelPrice);
        account.taxBase -= oldPixelPrice;
        return account;
    }

    function _increaseBalance(Account memory account, uint64 amount)
        internal
        pure
        returns (Account memory)
    {
        account.balance = ClampedMath.addInt128(account.balance, amount);
        return account;
    }

    function _decreaseBalance(Account memory account, uint64 amount)
        internal
        pure
        returns (Account memory)
    {
        account.balance = ClampedMath.subInt128(account.balance, amount);
        return account;
    }

    function _buy(address buyerAddress, PixelBuyArgs memory args) internal {
        PixelBuyArgs[] memory argss = new PixelBuyArgs[](1);
        argss[0] = args;

        _buyMany(buyerAddress, argss);
    }

    function _buyMany(address buyerAddress, PixelBuyArgs[] memory args)
        internal
    {
        // keep track of buyer and seller accounts in memory so that we can persist them to the
        // state eventually
        Account memory buyer = _accounts[buyerAddress];
        uint256 numSellers = 0; // number of distinct sellers known so far
        address[] memory sellerAddresses = new address[](args.length);
        Account[] memory sellers = new Account[](args.length);

        // also keep track of taxes paid and income from initial sales
        uint64 taxesPaid = 0;
        uint64 initialSaleRevenue = 0;

        // pay taxes of buyer so that balance is up to date and we can safely update tax base
        (buyer, taxesPaid) = _payMoreTaxes(buyer, taxesPaid);

        for (uint256 i = 0; i < args.length; i++) {
            // Make sure pixel ids are sorted and, in particular, no pixel is bought twice.
            require(
                i == 0 || args[i].pixelID > args[i - 1].pixelID,
                "GraffitETH2: pixel ids not sorted"
            );

            uint64 price = getPrice(args[i].pixelID);
            require(
                price <= args[i].maxPrice,
                "GraffitETH2: pixel price exceeds max price"
            );
            require(
                buyer.balance >= price,
                "GraffitETH2: buyer cannot afford pixel"
            );

            // reduce buyer's balance and increase buyer's tax base
            buyer = _decreaseBalance(buyer, price);
            buyer = _increaseTaxBase(buyer, args[i].newPrice);

            address sellerAddress;
            if (_exists(args[i].pixelID)) {
                sellerAddress = ownerOf(args[i].pixelID);
                require(
                    sellerAddress != buyerAddress,
                    "GraffitETH2: buyer and seller are the same"
                );

                Account memory seller;

                // Find seller account in sellers array by iterating over it. We should use a
                // mapping here, but solidity doesn't support mappings in memory.
                uint256 sellerIndex;
                for (sellerIndex = 0; sellerIndex < numSellers; sellerIndex++) {
                    if (sellerAddresses[sellerIndex] == sellerAddress) {
                        seller = sellers[sellerIndex];
                        break;
                    }
                }
                assert(sellerIndex <= sellers.length);
                if (sellerIndex == numSellers) {
                    numSellers++;
                    seller = _accounts[sellerAddress];
                    sellerAddresses[sellerIndex] = sellerAddress;

                    // Pay tax for seller so that we can safely update its balance and tax base.
                    // We only have to do this once per seller as no time passes during execution
                    // and thus no new tax debt accumulates.
                    (seller, taxesPaid) = _payMoreTaxes(seller, taxesPaid);
                }

                // update seller balance and tax base
                uint64 oldPrice = _pixelPrices[args[i].pixelID];
                seller = _increaseBalance(seller, price);
                seller = _decreaseTaxBase(seller, oldPrice);
                sellers[sellerIndex] = seller;

                // perform transfer
                _transfer(sellerAddress, buyerAddress, args[i].pixelID);
                _earmark(args[i].pixelID, buyerAddress, address(0), 0); // cancel any earmark
            } else {
                sellerAddress = address(0);
                initialSaleRevenue = ClampedMath.addUint64(
                    initialSaleRevenue,
                    price
                );

                require(
                    args[i].pixelID <= _maxPixelID,
                    "GraffitETH2: max pixel ID exceeded"
                );
                _mint(buyerAddress, args[i].pixelID); // create the pixel
            }

            // update nominal price
            _pixelPrices[args[i].pixelID] = args[i].newPrice;

            emit Bought({
                pixelID: args[i].pixelID,
                seller: sellerAddress,
                buyer: buyerAddress,
                price: price
            });
            emit ColorChanged({
                pixelID: args[i].pixelID,
                owner: buyerAddress,
                color: args[i].color
            });
            emit PriceChanged({
                pixelID: args[i].pixelID,
                owner: buyerAddress,
                price: args[i].newPrice
            });
        }

        // persist account changes, taxes paid, and initial sale revenue
        _accounts[buyerAddress] = buyer;
        assert(sellerAddresses.length == sellers.length);
        for (uint256 i = 0; i < sellerAddresses.length; i++) {
            address sellerAddress = sellerAddresses[i];
            _accounts[sellerAddress] = sellers[i];
        }
        _totalTaxesPaid = ClampedMath.addUint64(_totalTaxesPaid, taxesPaid);
        _totalInitialSaleRevenue = ClampedMath.addUint64(
            _totalInitialSaleRevenue,
            initialSaleRevenue
        );
    }

    function _depositTo(address depositor, address account) internal {
        Account memory acc = _accounts[account];
        uint64 taxesPaid;
        (acc, taxesPaid) = _payTaxes(acc);

        require(
            msg.value % (1 gwei) == 0,
            "GraffitETH2: deposit amount must be multiple of 1 GWei"
        );
        uint256 valueGWei = msg.value / (1 gwei);
        require(
            valueGWei <= type(uint64).max,
            "GraffitETH2: max deposit amount exceeded"
        );
        uint64 amount = uint64(valueGWei);

        // if the account owes taxes pay them from the deposited amount
        if (acc.balance < 0) {
            // balance is int128 which can't represent -type(int128).min. Therefore, convert to
            // int256 before flipping the sign.
            int256 taxesOwed = -int256(acc.balance);
            uint64 taxes;
            if (taxesOwed >= amount) {
                taxes = amount;
            } else {
                assert(taxesOwed <= type(uint64).max); // taxesOwed < amount <= uint64.max
                taxes = uint64(taxesOwed);
            }
            taxesPaid = ClampedMath.addUint64(taxesPaid, taxes);
            acc.totalTaxesPaid = ClampedMath.addUint64(
                acc.totalTaxesPaid,
                taxes
            );
        }
        acc = _increaseBalance(acc, amount);

        _accounts[account] = acc;
        _totalTaxesPaid = ClampedMath.addUint64(_totalTaxesPaid, taxesPaid);
        emit Deposited({
            account: account,
            depositor: depositor,
            amount: amount,
            balance: acc.balance
        });
    }

    function _withdrawMax(address account, address receiver) internal {
        int128 balance = getBalance(account);
        require(
            balance >= 0,
            "GraffitETH2: account balance must not be negative"
        );
        uint64 amount;
        if (balance >= type(uint64).max) {
            amount = type(uint64).max;
        } else {
            amount = uint64(balance);
        }
        _withdraw(account, amount, receiver);
    }

    function _withdraw(
        address account,
        uint64 amount,
        address receiver
    ) internal {
        Account memory acc = _accounts[account];
        uint64 taxesPaid;
        (acc, taxesPaid) = _payTaxes(acc);

        require(
            acc.balance >= amount,
            "GraffitETH2: cannot withdraw more than balance"
        );
        acc = _decreaseBalance(acc, amount);

        uint256 transferValue = uint256(amount) * (1 gwei);
        assert(transferValue / (1 gwei) == amount);
        (bool success, ) = receiver.call{value: transferValue}("");
        require(success, "GraffitETH2: withdraw call reverted");

        _accounts[account] = acc;
        _totalTaxesPaid = ClampedMath.addUint64(_totalTaxesPaid, taxesPaid);

        emit Withdrawn({
            account: account,
            receiver: receiver,
            amount: amount,
            balance: acc.balance
        });
    }

    /// @dev Earmarks a pixel. The caller should check that the pixel exists and that the current
    ///     owner requested the earmarking.
    function _earmark(
        uint256 pixelID,
        address owner,
        address receiver,
        uint64 amount
    ) internal {
        _earmarks[pixelID] = Earmark({receiver: receiver, amount: amount});
        emit Earmarked({
            pixelID: pixelID,
            owner: owner,
            receiver: receiver,
            amount: amount
        });
    }

    function _withdrawOwner(uint64 amount, address receiver) internal {
        uint64 maxAmount = getOwnerWithdrawableAmount();
        require(
            amount <= maxAmount,
            "GraffitETH2: not enough funds to withdraw"
        );
        _totalWithdrawnByOwner = ClampedMath.addUint64(
            _totalWithdrawnByOwner,
            amount
        );

        uint256 transferValue = uint256(amount) * (1 gwei);
        assert(transferValue <= address(this).balance);
        assert(transferValue / (1 gwei) == amount);
        (bool success, ) = receiver.call{value: transferValue}("");
        require(success, "GraffitETH2: withdraw taxes call reverted");

        emit TaxWithdrawn({amount: amount, receiver: receiver});
    }

    function _claim(
        address claimer,
        uint256 pixelID,
        uint64 maxPrice,
        uint64 minAmount
    ) internal {
        require(_exists(pixelID), "GraffitETH2: pixel does not exist");
        address owner = ownerOf(pixelID);
        Earmark memory em = _earmarks[pixelID];
        require(
            claimer == em.receiver,
            "GraffitETH2: account not allowed to claim pixel"
        );

        uint64 taxesPaid = 0;
        Account memory sender = _accounts[owner];
        Account memory receiver = _accounts[claimer];

        (sender, taxesPaid) = _payMoreTaxes(sender, taxesPaid);
        (receiver, taxesPaid) = _payMoreTaxes(receiver, taxesPaid);

        uint64 price = getNominalPrice(pixelID);
        require(price <= maxPrice, "GraffitETH2: pixel is too expensive");

        sender = _decreaseTaxBase(sender, price);
        receiver = _increaseTaxBase(receiver, price);

        uint64 amount;
        if (sender.balance >= em.amount) {
            amount = em.amount;
        } else {
            if (sender.balance >= 0) {
                assert(sender.balance <= type(uint64).max); // balance < em.amount <= uint64.max
                amount = uint64(sender.balance);
            } else {
                amount = 0;
            }
        }
        require(amount >= minAmount, "GraffitETH2: amount is too small");
        sender = _decreaseBalance(sender, amount);
        receiver = _increaseBalance(receiver, amount);

        _accounts[owner] = sender;
        _accounts[claimer] = receiver;
        _totalTaxesPaid = ClampedMath.addUint64(_totalTaxesPaid, taxesPaid);

        _transfer(owner, claimer, pixelID);
        _earmark(pixelID, owner, address(0), 0);

        emit PixelClaimed({
            pixelID: pixelID,
            oldOwner: owner,
            newOwner: claimer,
            amount: amount
        });
    }

    //
    // Transfer overrides from ERC721
    //
    function transferFrom(
        address,
        address,
        uint256
    ) public virtual override {
        assert(false); // transferring pixels is not possible
    }

    function safeTransferFrom(
        address,
        address,
        uint256
    ) public virtual override {
        assert(false); // transferring pixels is not possible
    }

    function safeTransferFrom(
        address,
        address,
        uint256,
        bytes memory
    ) public virtual override {
        assert(false); // transferring pixels is not possible
    }
}

library ClampedMath {
    function addUint64(uint64 a, uint64 b) internal pure returns (uint64) {
        uint64 res;
        if (a <= type(uint64).max - b) {
            res = a + b;
        } else {
            res = type(uint64).max;
        }
        assert(res >= a && res >= b);
        assert(res <= uint256(a) + uint256(b));
        return res;
    }

    function subUint64(uint64 a, uint64 b) internal pure returns (uint64) {
        uint64 res;
        if (a >= b) {
            res = a - b;
        } else {
            res = 0;
        }
        assert(res <= a);
        return res;
    }

    function addInt128(int128 a, uint64 b) internal pure returns (int128) {
        int128 res;
        if (a <= type(int128).max - b) {
            res = a + b;
        } else {
            res = type(int128).max;
        }
        assert(res >= a && ((a >= 0 && res >= b) || (a < 0 && res < b)));
        return res;
    }

    function subInt128(int128 a, uint64 b) internal pure returns (int128) {
        int128 res;
        if (a >= type(int128).min + b) {
            res = a - b;
        } else {
            res = type(int128).min;
        }
        assert(res <= a);
        return res;
    }
}

library Taxes {
    function computeTaxes(
        uint256 taxRateNumerator,
        uint256 taxRateDenominator,
        uint64 taxBase,
        uint64 startTime,
        uint64 endTime
    ) internal pure returns (uint64) {
        if (endTime <= startTime) {
            return 0;
        }
        uint256 num =
            uint256(endTime - startTime) * uint256(taxBase) * taxRateNumerator;
        uint256 taxes = num / taxRateDenominator;
        assert(taxes <= num);

        uint64 res;
        if (taxes <= type(uint64).max) {
            res = uint64(taxes);
        } else {
            res = type(uint64).max;
        }
        assert(res == taxes || (taxes > res && res == type(uint64).max));
        return res;
    }

    function payTaxes(
        Account memory acc,
        uint256 taxRateNumerator,
        uint256 taxRateDenominator,
        uint64 taxStartTime
    ) internal view returns (Account memory, uint64) {
        uint64 startTime = acc.lastTaxPayment;
        if (startTime < taxStartTime) {
            startTime = taxStartTime;
        }

        uint64 unaccountedTaxes =
            computeTaxes(
                taxRateNumerator,
                taxRateDenominator,
                acc.taxBase,
                startTime,
                uint64(block.timestamp)
            );

        // Compute the taxes that are actually paid. This is usually just `unaccountedTax`, unless
        // the account cannot afford it in part or in full.
        uint64 taxesPaid;
        if (acc.balance >= unaccountedTaxes) {
            taxesPaid = unaccountedTaxes;
        } else if (acc.balance >= 0) {
            assert(acc.balance <= type(uint64).max); // balance < unaccountedTaxes <= uint64.max
            taxesPaid = uint64(acc.balance);
        } else {
            taxesPaid = 0;
        }
        assert(taxesPaid <= unaccountedTaxes);
        assert(
            (acc.balance >= 0 && taxesPaid <= acc.balance) ||
                (acc.balance < 0 && taxesPaid == 0)
        );

        // Update the account record
        acc.balance = ClampedMath.subInt128(acc.balance, unaccountedTaxes);
        assert(block.timestamp >= acc.lastTaxPayment);
        acc.lastTaxPayment = uint64(block.timestamp);
        acc.totalTaxesPaid = ClampedMath.addUint64(
            acc.totalTaxesPaid,
            taxesPaid
        );

        return (acc, taxesPaid);
    }

    function payMoreTaxes(
        Account memory acc,
        uint64 taxesPaid,
        uint256 taxRateNumerator,
        uint256 taxRateDenominator,
        uint64 taxStartTime
    ) internal view returns (Account memory, uint64) {
        uint64 addedTaxes;
        (acc, addedTaxes) = payTaxes(
            acc,
            taxRateNumerator,
            taxRateDenominator,
            taxStartTime
        );
        taxesPaid = ClampedMath.addUint64(taxesPaid, addedTaxes);
        return (acc, taxesPaid);
    }
}
