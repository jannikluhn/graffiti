const { expect } = require("chai");
const { ethers, network } = require("hardhat");
const { isEvmStep } = require("hardhat/internal/hardhat-network/stack-traces/message-trace");

let signers;
let cFactory;
let c;
let c1;
let c2;
let c3;
let a1;
let a2;
let a3;

const width = 5;
const height = 5;
const taxRateNumerator = 12;
const taxRateDenominator = 365 * 24 * 60 * 60 * 100;
const taxStartTime = 0;
const initialPrice = parseEtherToGWei("0.1");
const rugPullHeadsUp = 30 * 24 * 24 * 60;  // 30 days
  

async function setup() {
  cFactory = await ethers.getContractFactory("GraffitETH2");
  c = await cFactory.deploy(
    width,
    height,
    taxRateNumerator,
    taxRateDenominator,
    taxStartTime,
    initialPrice,
    rugPullHeadsUp,
  );
  await c.deployed();

  signers = await ethers.getSigners();
  owner = signers[0].address
  a1 = signers[0].address
  a2 = signers[1].address
  a3 = signers[2].address

  c1 = await c.connect(signers[0]);
  c2 = await c.connect(signers[1]);
  c3 = await c.connect(signers[2]);
}

async function skipOneMonth() {
  await network.provider.send("evm_increaseTime", [365 * 24 * 60 * 60 / 12]);
  await network.provider.send("evm_mine", []);
}

describe("GraffitETH2 deployment", function () {
  beforeEach(setup);

  it("should initialize properly", async function () {
    expect(await c.getMaxPixelID()).to.equal(width * height - 1);
    const taxRate = await c.getTaxRate()
    expect(taxRate[0]).to.equal(taxRateNumerator);
    expect(taxRate[1]).to.equal(taxRateDenominator);
    expect(await c.getInitialPrice()).to.equal(initialPrice);
    expect(await c.isInitializing()).to.be.true;
    expect(await c.getRugPullHeadsUp()).to.equal(rugPullHeadsUp);
    expect(await c.getRugPullTime()).to.equal(0);
    expect(await c.checkRugPullDisabled()).to.be.false;
    expect(await c.checkRugPullAnnounced()).to.be.false;
  });

  it("should initialize accounts to be empty", async function () {
    expect(await c.getTaxBase(a1)).to.equal(0);
    expect(await c.getLastTaxPayment(a1)).to.equal(0);
    expect(await c.getBalance(a1)).to.equal(0);
    expect(await c.getTotalTaxesPaidBy(a1)).to.equal(0);
  });

  it("should initalize pixels to be non-existant", async function () {
    for (const pixelID of [0, 5, width * height - 1]) {
      expect(await c.exists(pixelID)).to.be.false;
      expect(await c.getNominalPrice(pixelID)).to.equal(initialPrice);
      expect(await c.getPrice(pixelID)).to.equal(initialPrice);
      expect(await c.getEarmarkReceiver(pixelID)).to.equal(ethers.constants.AddressZero);
      expect(await c.getEarmarkAmount(pixelID)).to.equal(0);
    }
  });

  it("should initialize owner balances to zero", async function () {
    expect(await c.getTotalWithdrawnByOwner()).to.equal(0);
    expect(await c.getTotalTaxesPaid()).to.equal(0);
    expect(await c.getTotalInitialSaleRevenue()).to.equal(0);
  });

  it("should check canvas non-empty", async function () {
    await expect(cFactory.deploy(
      0,
      height,
      taxRateNumerator,
      taxRateDenominator,
      taxStartTime,
      initialPrice,
      rugPullHeadsUp,
    )).to.be.revertedWith("GraffitETH2: width must not be zero");
    await expect(cFactory.deploy(
      width,
      0,
      taxRateNumerator,
      taxRateDenominator,
      taxStartTime,
      initialPrice,
      rugPullHeadsUp,
    )).to.be.revertedWith("GraffitETH2: height must not be zero");
  });

  it("should check tax rate not infinite", async function () {
    await expect(cFactory.deploy(
      width,
      height,
      taxRateNumerator,
      0,
      taxStartTime,
      initialPrice,
      rugPullHeadsUp,
    )).to.be.revertedWith("GraffitETH2: tax rate denominator must not be zero");
  });

  it("should set tax start time", async function () {
    const c = await cFactory.deploy(
      width,
      height,
      taxRateNumerator,
      taxRateDenominator,
      123,
      initialPrice,
      rugPullHeadsUp,
    );
    expect(await c.getTaxStartTime()).to.be.equal(123);
  });
});

describe("GraffitETH2 init", function () {
  beforeEach(setup);

  it("should set pixel prices, owners, and colors", async function () {
    await expect(c.init([], [], [], [])).to.not.be.reverted;

    let tx = c.init([3], [a1], [4], [5]);
    await expect(tx).to.emit(c, "PriceChanged").withArgs(3, a1, 4);
    await expect(tx).to.emit(c, "ColorChanged").withArgs(3, a1, 5);
    expect(await c.getNominalPrice(3)).to.equal(4);
    expect(await c.ownerOf(3)).to.equal(a1);
    expect(await c.totalSupply()).to.equal(1);
    expect(await c.getTaxBase(a1)).to.equal(4);

    tx = c.init([5, 2, 10], [a1, a2, a1], [1, 2, 3], [9, 8, 7]);
    await expect(tx).to.emit(c, "PriceChanged").withArgs(5, a1, 1);
    await expect(tx).to.emit(c, "PriceChanged").withArgs(2, a2, 2);
    await expect(tx).to.emit(c, "PriceChanged").withArgs(10, a1, 3);
    await expect(tx).to.emit(c, "ColorChanged").withArgs(5, a1, 9);
    await expect(tx).to.emit(c, "ColorChanged").withArgs(2, a2, 8);
    await expect(tx).to.emit(c, "ColorChanged").withArgs(10, a1, 7);
    expect(await c.getNominalPrice(5)).to.equal(1);
    expect(await c.getNominalPrice(2)).to.equal(2);
    expect(await c.getNominalPrice(10)).to.equal(3);
    expect(await c.ownerOf(5)).to.equal(a1);
    expect(await c.ownerOf(2)).to.equal(a2);
    expect(await c.ownerOf(10)).to.equal(a1);
    expect(await c.totalSupply()).to.equal(4);
    expect(await c.getTaxBase(a1)).to.equal(8);
    expect(await c.getTaxBase(a2)).to.equal(2);
  });

  it("should check same number of pixelIDs, owners, prices, and colors", async function () {
    await expect(c.init([1, 2], [a1], [1, 2], [1, 2]))
      .to.be.revertedWith("GraffitETH2: number of owners different from number of pixels");
    await expect(c.init([1, 2], [a1, a2], [1], [1, 2]))
      .to.be.revertedWith("GraffitETH2: number of prices different from number of pixels");
    await expect(c.init([1, 2], [a1, a2], [1, 2], [1]))
      .to.be.revertedWith("GraffitETH2: number of colors different from number of pixels");
  })

  it("should only be callable by owner", async function () {
    await expect(c2.init([], [], [], []))
      .to.be.revertedWith("Ownable: caller is not the owner");
  });

  it("should only work until disabled", async function () {
    await expect(c2.stopInitialization())
      .to.be.revertedWith("Ownable: caller is not the owner");
    await expect(c.stopInitialization())
    await expect(c.init([], [], [], []))
      .to.be.revertedWith("GraffitETH2: initialization phase already over");
  });

  it("should only work once per pixel", async function () {
    await c.init([1], [a1], [1], [2]);
    await expect(c.init([1], [a2], [2], [3]))
      .to.be.revertedWith("GraffitETH2: pixel already initialized");
  });
});

describe("GraffitETH2 rugpull", function () {
  beforeEach(setup);

  it("announcement should start timer", async function () {
    await expect(c2.announceRugPull())
      .to.be.revertedWith("Ownable: caller is not the owner");

    const announceTx = await c.announceRugPull();
    const announceTimestamp = (await ethers.provider.getBlock()).timestamp
    await expect(announceTx)
      .to.emit(c, "RugPullAnnounced").withArgs(owner, announceTimestamp, announceTimestamp + rugPullHeadsUp);
    expect(await c.checkRugPullAnnounced()).to.be.true;
    expect(await c.getRugPullTime()).to.equal(announceTimestamp + rugPullHeadsUp);

    await expect(c.announceRugPull()).to.be.revertedWith("RugPull: already announced");
  });

  it("should not allow announcing after disabling", async function () {
    await expect(c2.disableRugPull())
      .to.be.revertedWith("Ownable: caller is not the owner");
    await expect(c.disableRugPull())
      .to.emit(c, "RugPullDisabled").withArgs(owner);
    
    expect(await c.checkRugPullDisabled()).to.be.true;

    await expect(c.announceRugPull()).to.be.revertedWith("RugPull: disabled");
    await expect(c.disableRugPull()).to.be.revertedWith("RugPull: already disabled");
  });

  it("should allow withdrawing funds after rugpull", async function () {
    await c.deposit({ value: ethers.utils.parseEther("100") });

    await expect(c.performRugPull(a2, 10)).to.be.revertedWith("RugPull: not announced yet");
    await c.announceRugPull();
    await expect(c.performRugPull(a2, 10)).to.be.revertedWith("RugPull: heads up not passed yet");
    await network.provider.send("evm_increaseTime", [rugPullHeadsUp]);
    await network.provider.send("evm_mine", []);
    await expect(c2.performRugPull(a2, 10)).to.be.revertedWith("Ownable: caller is not the owner");
    const balanceBefore = await ethers.provider.getBalance(a2)
    await expect(c.performRugPull(a2, 10))
      .to.emit(c, "RugPulled").withArgs(owner, a2, 10);
    expect(await ethers.provider.getBalance(a2)).to.equal(balanceBefore.add(10));
    expect(await ethers.provider.getBalance(c.address)).to.equal(ethers.utils.parseEther("100").sub(10));
  });
});

describe("GraffitETH depositing", function () {
  beforeEach(setup);

  it("should not allow fractional deposits", async function () {
    const invalidDeposits = [
      1,
      gWeiToWei(1).sub(1),
      gWeiToWei(1).add(1),
      ethers.utils.parseEther("5434").sub(1),
      ethers.utils.parseEther("5434").add(1),
      ethers.utils.parseEther("5434.2312343423"),
    ];
    for (const d of invalidDeposits) {
      await expect(c2.deposit({ value: d }))
        .to.be.revertedWith("GraffitETH2: deposit amount must be multiple of 1 GWei");
    }
  });

  it("should deposit for sender", async function () {
    const deposits = [
      gWeiToWei(1),
      gWeiToWei(123),
      ethers.utils.parseEther("5434.231234342"),
    ];
    let contractBalance = await ethers.provider.getBalance(c.address);
    let balance = await c2.getBalance(c2.signer.address);
    for (const d of deposits) {
      const dGWei = d.div(1000000000);
      await expect(c2.deposit({ value: d }))
        .to.emit(c, "Deposited").withArgs(a2, a2, dGWei, balance.add(dGWei));
      const newContractBalance = await ethers.provider.getBalance(c.address);
      const newBalance = await c2.getBalance(c2.signer.address);
      expect(newBalance).to.equal(balance.add(dGWei));
      expect(newContractBalance).to.equal(contractBalance.add(d));
      balance = newBalance;
      contractBalance = newContractBalance;
    }
  });

  it("should deposit to specified account", async function () {
    const balanceContractBefore = await ethers.provider.getBalance(c.address);
    const balance1Before = await c.getBalance(a1);
    const balance2Before = await c.getBalance(a2);
    const amountWei = ethers.utils.parseEther("100.3");
    const amountGWei = weiToGWei(amountWei);
    await expect(c.depositTo(a2, { value: amountWei }))
      .to.emit(c, "Deposited").withArgs(a2, a1, amountGWei, balance2Before.add(amountGWei));
    expect(await ethers.provider.getBalance(c.address)).to.equal(balanceContractBefore.add(amountWei));
    expect(await c.getBalance(a1)).to.equal(balance1Before);
    expect(await c.getBalance(a2)).to.equal(balance2Before.add(amountGWei));
  })

  it("should pay taxes if balance is negative", async function () {
    // get account in the red by buying pixel and advancing time
    await c.depositAndEdit(
      [[0, parseEtherToGWei("0.1"), parseEtherToGWei("1000"), 0]],
      [],
      [],
      { value: ethers.utils.parseEther("0.1") },
    );
    await network.provider.send("evm_increaseTime", [31 * 24 * 60 * 60]);
    await network.provider.send("evm_mine", []);
    
    const balance = await c.getBalance(a1);  // about -10 ETH
    const totalTaxesPaid = await c.getTotalTaxesPaid();
    const taxesPaid = await c.getTotalTaxesPaidBy(a1);
    const t = (await ethers.provider.getBlock()).timestamp

    await network.provider.send("evm_setNextBlockTimestamp", [t + 1]);
    await c.deposit({ value: ethers.utils.parseEther("5") });
    expect((await c.getBalance(a1)).sub(balance.add(parseEtherToGWei("5"))).abs()).to.be.lt(5000);
    expect(await c.getTotalTaxesPaid()).to.equal(totalTaxesPaid.add(parseEtherToGWei("5")));
    expect(await c.getTotalTaxesPaidBy(a1)).to.equal(taxesPaid.add(parseEtherToGWei("5")));

    await network.provider.send("evm_setNextBlockTimestamp", [t + 2]);
    await c.deposit({ value: ethers.utils.parseEther("10") });
    expect((await c.getBalance(a1)).sub(balance.add(parseEtherToGWei("15"))).abs()).to.be.lt(10000);
    expect((await c.getTotalTaxesPaid()).sub(totalTaxesPaid).sub(balance.mul(-1)).abs()).to.be.lt(10000);
    expect((await c.getTotalTaxesPaidBy(a1)).sub(taxesPaid).sub(balance.mul(-1)).abs()).to.be.lt(10000);
  });
});

describe("GraffitETH withdrawing", function () {
  beforeEach(setup);

  it("should send money to sender", async function () {
    await c.deposit({ value: ethers.utils.parseEther("1000") });

    const amounts = [
      1,
      123,
      parseEtherToGWei("999.9"),
    ];
    for (const amount of amounts) {
      const chainBalance = await ethers.provider.getBalance(a1);
      const contractBalance = await c.getBalance(a1);
      await expect(await c.withdraw(amount, {gasPrice: 0}))
        .to.emit(c, "Withdrawn").withArgs(a1, a1, amount, contractBalance.sub(amount));
      expect(await c.getBalance(a1)).to.equal(contractBalance.sub(amount));
      expect(await ethers.provider.getBalance(a1)).to.equal(chainBalance.add(gWeiToWei(amount)));
    }
  });

  it("should send money to receiver", async function () {
    await c.deposit({ value: ethers.utils.parseEther("1000") });

    const amounts = [
      1,
      123,
      parseEtherToGWei("999.9"),
    ];
    for (const amount of amounts) {
      const chainBalance = await ethers.provider.getBalance(a2);
      const contractBalance = await c.getBalance(a1);
      await expect(await c.withdrawTo(amount, a2))
        .to.emit(c, "Withdrawn").withArgs(a1, a2, amount, contractBalance.sub(amount));
      expect(await c.getBalance(a1)).to.equal(contractBalance.sub(amount));
      expect(await ethers.provider.getBalance(a2)).to.equal(chainBalance.add(gWeiToWei(amount)));
    }
  });

  it("should fail when trying to withdraw more than balance", async function () {
    await c.deposit({ value: ethers.utils.parseEther("10") });
    await expect(c.withdraw(parseEtherToGWei("10.1")))
      .to.be.revertedWith("GraffitETH2: cannot withdraw more than balance");
    
    // pay taxes to get negative balance
    await c.edit(
      [[0, parseEtherToGWei("0.1"), parseEtherToGWei("1000"), 0]],
      [],
      []
    );
    await network.provider.send("evm_increaseTime", [2 * 31 * 24 * 60 * 60]);
    await network.provider.send("evm_mine", []);

    await expect(c.withdraw(0))
      .to.be.revertedWith("GraffitETH2: cannot withdraw more than balance");
  });

  it("should withdraw everything", async function () {
    // deposit and pay some taxes to get odd balance
    await c.deposit({ value: ethers.utils.parseEther("123") });
    await c.edit(
      [[0, parseEtherToGWei("0.1"), parseEtherToGWei("1000"), 0]],
      [],
      [],
    );
    await network.provider.send("evm_increaseTime", [31 * 24 * 60 * 60]);
    await network.provider.send("evm_mine", []);

    await expect(c.withdrawMax())
      .to.emit(c, "Withdrawn");
    expect(await c.getBalance(a1)).to.equal(0);
  });
});

describe("GraffitETH buying", function () {
  beforeEach(setup);
  beforeEach(async function () {
    await c1.deposit({ value: ethers.utils.parseEther("100") });
    await c2.deposit({ value: ethers.utils.parseEther("100") });
    await c3.deposit({ value: ethers.utils.parseEther("100") });
  })

  it("should work for new pixels", async function () {
    const newPrice = parseEtherToGWei("10");
    const newColor = 2;
    let tx = c1.edit([[0, initialPrice, newPrice, newColor]], [], []);
    await expect(tx).to.emit(c, "Bought").withArgs(0, ethers.constants.AddressZero, a1, initialPrice);
    await expect(tx).to.emit(c, "Transfer").withArgs(ethers.constants.AddressZero, a1, 0);
    await expect(tx).to.emit(c, "PriceChanged").withArgs(0, a1, newPrice);
    await expect(tx).to.emit(c, "ColorChanged").withArgs(0, a1, newColor);
    expect(await c.ownerOf(0)).to.equal(a1);
    expect(await c.getPrice(0)).to.equal(newPrice);
    expect(await c.getBalance(a1)).to.equal(parseEtherToGWei("99.9"));
    expect(await c.getTaxBase(a1)).to.equal(newPrice);
    expect(await c.getTotalInitialSaleRevenue()).to.equal(initialPrice);

    const argss = [
      [2, initialPrice.mul(2), parseEtherToGWei("5"), 5],
      [width * height - 1, initialPrice, 1, 10],
    ];
    tx = c2.edit(argss, [], []);
    for (const args of argss) {
      await expect(tx).to.emit(c, "Bought").withArgs(args[0], ethers.constants.AddressZero, a2, initialPrice);
      await expect(tx).to.emit(c, "Transfer").withArgs(ethers.constants.AddressZero, a2, args[0]);
      await expect(tx).to.emit(c, "PriceChanged").withArgs(args[0], a2, args[2]);
      await expect(tx).to.emit(c, "ColorChanged").withArgs(args[0], a2, args[3]);
      expect(await c.ownerOf(args[0])).to.equal(a2);
      expect(await c.getPrice(args[0])).to.equal(args[2]);
    }
    expect(await c.getBalance(a2)).to.equal(parseEtherToGWei("99.8"));
    expect(await c.getTaxBase(a2)).to.equal(argss[0][2].add(argss[1][2]));
    expect(await c.getTotalInitialSaleRevenue()).to.equal(initialPrice.mul(3));
  });

  it("should work for existing pixels", async function () {
    await c1.edit([[0, initialPrice, parseEtherToGWei("5"), 0]], [], []);

    let args = [0, parseEtherToGWei("5"), parseEtherToGWei("10"), 5];
    let tx = c2.edit([args], [], []);
    await expect(tx).to.emit(c2, "Bought").withArgs(args[0], a1, a2, args[1]);
    await expect(tx).to.emit(c, "Transfer").withArgs(a1, a2, args[0]);
    await expect(tx).to.emit(c2, "PriceChanged").withArgs(args[0], a2, args[2]);
    await expect(tx).to.emit(c2, "ColorChanged").withArgs(args[0], a2, args[3]);
    expect(await c.ownerOf(args[0])).to.equal(a2);
    expect(await c.getPrice(args[0])).to.equal(args[2]);
    expect((await c.getBalance(a1)).sub(parseEtherToGWei("104.9")).abs()).to.be.lte(1000);
    expect(await c.getBalance(a2)).to.equal(parseEtherToGWei("95"));
    expect(await c.getTaxBase(a1)).to.equal(0);
    expect(await c.getTaxBase(a2)).to.equal(parseEtherToGWei("10"));
    expect(await c.getTotalInitialSaleRevenue()).to.equal(initialPrice);
  });

  it("should work with many pixels", async function () {
    // a1 buys initial 4 pixels
    let argss = [
      [0, initialPrice, parseEtherToGWei("5"), 0],
      [1, initialPrice.mul(2), parseEtherToGWei("10"), 1],
      [7, initialPrice, parseEtherToGWei("3"), 2],
      [9, initialPrice, parseEtherToGWei("8"), 1],
    ];
    let tx = c1.edit(argss, [], []);
    for (const args of argss) {
      await expect(tx).to.emit(c, "Bought").withArgs(args[0], ethers.constants.AddressZero, a1, initialPrice);
      await expect(tx).to.emit(c, "Transfer").withArgs(ethers.constants.AddressZero, a1, args[0]);
      await expect(tx).to.emit(c, "PriceChanged").withArgs(args[0], a1, args[2]);
      await expect(tx).to.emit(c, "ColorChanged").withArgs(args[0], a1, args[3]);
      expect(await c.ownerOf(args[0])).to.equal(a1);
      expect(await c.getPrice(args[0])).to.equal(args[2]);
    }
    expect(await c.getBalance(a1)).to.equal(parseEtherToGWei("99.6"));
    expect(await c.getTaxBase(a1)).to.equal(parseEtherToGWei("26"));
    expect(await c.getTotalInitialSaleRevenue()).to.equal(initialPrice.mul(4));

    // a2 buys 2 of a1 and 2 new ones
    argss = [
      [1, parseEtherToGWei("10"), parseEtherToGWei("8"), 5],
      [4, initialPrice, parseEtherToGWei("0.1"), 4],
      [9, parseEtherToGWei("8"), parseEtherToGWei("15"), 3],
      [11, initialPrice, parseEtherToGWei("0.5"), 2],
    ];
    let sellers = [a1, ethers.constants.AddressZero, a1, ethers.constants.AddressZero];
    tx = c2.edit(argss, [], []);
    for (let i = 0; i < 4; i++) {
      await expect(tx).to.emit(c, "Bought").withArgs(argss[i][0], sellers[i], a2, argss[i][1]);
      await expect(tx).to.emit(c, "Transfer").withArgs(sellers[i], a2, argss[i][0]);
      await expect(tx).to.emit(c, "PriceChanged").withArgs(argss[i][0], a2, argss[i][2]);
      await expect(tx).to.emit(c, "ColorChanged").withArgs(argss[i][0], a2, argss[i][3]);
      expect(await c.ownerOf(argss[i][0])).to.equal(a2);
      expect(await c.getPrice(argss[i][0])).to.equal(argss[i][2]);
    }
    expect(await c.getBalance(a2)).to.equal(parseEtherToGWei("81.8"));
    expect(await c.getTaxBase(a2)).to.equal(parseEtherToGWei("23.6"));
    expect(await c.getTotalInitialSaleRevenue()).to.equal(initialPrice.mul(6));
    expect((await c.getBalance(a1)).sub(parseEtherToGWei("117.6")).abs()).to.be.lte(1000);
    expect(await c.getTaxBase(a1)).to.equal(parseEtherToGWei("8"));

    // a3 buys a from a1 and 2 from a2
    argss = [
      [0, parseEtherToGWei("5"), parseEtherToGWei("6"), 0],
      [1, parseEtherToGWei("8"), parseEtherToGWei("9"), 1],
      [7, parseEtherToGWei("3"), parseEtherToGWei("4"), 2],
      [11, parseEtherToGWei("0.5"), parseEtherToGWei("1.5"), 3],
    ];
    sellers = [a1, a2, a1, a2];
    tx = c3.edit(argss, [], []);
    for (let i = 0; i < 4; i++) {
      await expect(tx).to.emit(c, "Bought").withArgs(argss[i][0], sellers[i], a3, argss[i][1]);
      await expect(tx).to.emit(c, "Transfer").withArgs(sellers[i], a3, argss[i][0]);
      await expect(tx).to.emit(c, "PriceChanged").withArgs(argss[i][0], a3, argss[i][2]);
      await expect(tx).to.emit(c, "ColorChanged").withArgs(argss[i][0], a3, argss[i][3]);
      expect(await c.ownerOf(argss[i][0])).to.equal(a3);
      expect(await c.getPrice(argss[i][0])).to.equal(argss[i][2]);
    }
    expect(await c.getBalance(a3)).to.equal(parseEtherToGWei("83.5"));
    expect(await c.getTaxBase(a3)).to.equal(parseEtherToGWei("20.5"));
    expect(await c.getTotalInitialSaleRevenue()).to.equal(initialPrice.mul(6));

    expect((await c.getBalance(a1)).sub(parseEtherToGWei("125.6")).abs()).to.be.lte(1000);
    expect(await c.getTaxBase(a1)).to.equal(parseEtherToGWei("0"));
    expect((await c.getBalance(a2)).sub(parseEtherToGWei("90.3")).abs()).to.be.lte(1000);
    expect(await c.getTaxBase(a2)).to.equal(parseEtherToGWei("15.1"));
  });

  it("should be free for pixels of indebted owners", async function () {
    await c1.edit([[0, initialPrice, parseEtherToGWei("10000"), 0]], [], []);
    await network.provider.send("evm_increaseTime", [31 * 24 * 60 * 60]);
    await network.provider.send("evm_mine", []);
    let a1BalanceBefore = await c.getBalance(a1);
    expect(a1BalanceBefore).to.be.lte(0);
    expect(await c.getPrice(0)).to.equal(0);

    let newPrice = parseEtherToGWei("1");
    let tx = c2.edit([[0, 0, newPrice, 0]], [], []);
    await expect(tx).to.emit(c, "Bought").withArgs(0, a1, a2, 0);
    await expect(tx).to.emit(c, "Transfer").withArgs(a1, a2, 0);
    await expect(tx).to.emit(c, "PriceChanged").withArgs(0, a2, newPrice);
    await expect(tx).to.emit(c, "ColorChanged").withArgs(0, a2, 0);
    expect(await c.ownerOf(0)).to.equal(a2);
    expect(await c.getPrice(0)).to.equal(newPrice);
    expect(await c.getBalance(a1)).to.be.lte(a1BalanceBefore);
    expect(await c.getTaxBase(a1)).to.equal(0);
  });

  it("should fail if balance is not sufficient", async function () {
    await c1.edit([
      [0, initialPrice, parseEtherToGWei("30"), 0],
      [1, initialPrice, parseEtherToGWei("80"), 0],
      [2, initialPrice, parseEtherToGWei("130"), 0],
    ], [], []);
    await expect(c2.edit([[2, parseEtherToGWei("130"), 0, 0]], [], []))
      .to.be.revertedWith("GraffitETH2: buyer cannot afford pixel");
    await expect(c2.edit([[0, parseEtherToGWei("30"), 0, 0], [1, parseEtherToGWei("80"), 0, 0]], [], []))
      .to.be.revertedWith("GraffitETH2: buyer cannot afford pixel");
  });

  it("should fail if pixel id is too big", async function () {
    await expect(c1.edit([[width * height, initialPrice, 0, 0]], [], []))
      .to.be.revertedWith("GraffitETH2: max pixel ID exceeded");
  });

  it("should fail if pixel ids are not ordered", async function () {
    await expect(c1.edit([[1, initialPrice, 0, 0], [3, initialPrice, 0, 0], [2, initialPrice, 0, 0]], [], []))
      .to.be.revertedWith("GraffitETH2: pixel ids not sorted");
    await expect(c1.edit([[1, initialPrice, 0, 0], [1, initialPrice, 0, 0]], [], []))
      .to.be.revertedWith("GraffitETH2: pixel ids not sorted");
  });

  it("should fail if max price is exceeded", async function () {
    await expect(c1.edit([[0, initialPrice.sub(1), 0, 0]], [], []))
      .to.be.revertedWith("GraffitETH2: pixel price exceeds max price");
    
    await c1.edit([
      [0, initialPrice, 10, 0],
      [1, initialPrice, 20, 0],
      [2, initialPrice, 30, 0],
    ], [], []);
    await expect(c2.edit([[1, 19, 0, 0]], [], []))
      .to.be.revertedWith("GraffitETH2: pixel price exceeds max price");
    await expect(c2.edit([
      [0, 10, 0, 0],
      [1, 19, 0, 0],
      [1, 30, 0, 0],
    ], [], []))
      .to.be.revertedWith("GraffitETH2: pixel price exceeds max price");
  });

  it("should fail if pixels are bought from oneself", async function () {
    await c1.edit([[0, initialPrice, 0, 0]], [], []);
    await expect(c1.edit([[0, parseEtherToGWei("1"), 0, 0]], [], []))
      .to.be.revertedWith("GraffitETH2: buyer and seller are the same");

    await c2.edit([[1, initialPrice, 0, 0]], [], []);
    await expect(c2.edit([[0, 0, 0, 0], [1, 0, 0, 0]], [], []))
      .to.be.reverted;
  });
});

describe("GraffitETH taxes", function () {
  beforeEach(setup);
  beforeEach(async function () {
    await c1.deposit({ value: ethers.utils.parseEther("100.3") });
    await c2.deposit({ value: ethers.utils.parseEther("100") });
    await c1.edit([
      [0, initialPrice, parseEtherToGWei("1"), 0],
      [1, initialPrice, parseEtherToGWei("199"), 0],
      [2, initialPrice, parseEtherToGWei("800"), 0],
    ], [], []);
    expect(await c1.getTaxBase(a1)).to.be.equal(parseEtherToGWei("1000"));
    expect(await c1.getBalance(a1)).to.be.equal(parseEtherToGWei("100"));
    expect(await c1.getTotalTaxesPaid()).to.be.equal(0);
    expect(await c1.getTotalTaxesPaidBy(a1)).to.be.equal(0);
  });

  it("should be 1% per month", async function () {
    await skipOneMonth();

    expect((await c1.getBalance(a1)).sub(parseEtherToGWei("90")).abs()).to.be.lte(5000);
    expect(await c1.getTotalTaxesPaid()).to.be.equal(0);
    expect(await c1.getTotalTaxesPaidBy(a1)).to.be.equal(0);

    await c1.payTaxes(a1);

    let balance = await c1.getBalance(a1);
    let taxes = parseEtherToGWei("100").sub(balance);
    expect(taxes.sub(parseEtherToGWei("10")).abs()).to.be.lte(10000);
    expect((await c1.getTotalTaxesPaid())).to.be.equal(taxes);
    expect(await c1.getTotalTaxesPaidBy(a1)).to.be.equal(taxes);

    await c1.edit([], [], [[2, parseEtherToGWei("1800")]]);
    await skipOneMonth();
    await c1.payTaxes(a1);

    balance = await c1.getBalance(a1);
    taxes = parseEtherToGWei("100").sub(balance);
    expect(taxes.sub(parseEtherToGWei("30")).abs()).to.be.lte(20000);
    expect(await c1.getTotalTaxesPaid()).to.be.equal(taxes);
    expect(await c1.getTotalTaxesPaidBy(a1)).to.be.equal(taxes);
  });

  it("should be paid when prices are set", async function () {
    await skipOneMonth();
    let balance = await c1.getBalance(a1);
    let taxes = parseEtherToGWei("100").sub(balance);

    expect(balance.sub(parseEtherToGWei("90")).abs()).to.be.lte(5000);
    expect(await c1.getTotalTaxesPaid()).to.be.equal(0);
    expect(await c1.getTotalTaxesPaidBy(a1)).to.be.equal(0);

    await c1.edit([], [], [[0, 0]]);

    expect(await c1.getBalance(a1)).to.be.lte(balance);
    expect(await c1.getTotalTaxesPaid()).to.be.gte(taxes);
    expect(await c1.getTotalTaxesPaidBy(a1)).to.be.gte(taxes);
  });

  it("should be paid when pixels are bought", async function () {
    await skipOneMonth();
    let balance = await c1.getBalance(a1);
    let taxes = parseEtherToGWei("100").sub(balance);

    expect(balance.sub(parseEtherToGWei("90")).abs()).to.be.lte(5000);
    expect(await c1.getTotalTaxesPaid()).to.be.equal(0);
    expect(await c1.getTotalTaxesPaidBy(a1)).to.be.equal(0);

    await c1.edit([[10, initialPrice, 0, 0]], [], []);

    expect(await c1.getBalance(a1)).to.be.lte(balance);
    expect(await c1.getTotalTaxesPaid()).to.be.gte(taxes);
    expect(await c1.getTotalTaxesPaidBy(a1)).to.be.gte(taxes);
  });

  it("should be paid when pixels are sold", async function () {
    await skipOneMonth();
    let balance = await c1.getBalance(a1);
    let taxes = parseEtherToGWei("100").sub(balance);

    expect(balance.sub(parseEtherToGWei("90")).abs()).to.be.lte(5000);
    expect(await c1.getTotalTaxesPaid()).to.be.equal(0);
    expect(await c1.getTotalTaxesPaidBy(a1)).to.be.equal(0);

    await c2.edit([[0, parseEtherToGWei("1"), 0, 0]], [], []);

    expect(await c1.getBalance(a1)).to.be.lte(balance.add(parseEtherToGWei("1")));
    expect(await c1.getTotalTaxesPaid()).to.be.gte(taxes);
    expect(await c1.getTotalTaxesPaidBy(a1)).to.be.gte(taxes);
  });

  it("should be paid when pixels are claimed", async function () {
    let totalTaxesPaid = await c.getTotalTaxesPaid();
    let taxesPaidBy1 = await c.getTotalTaxesPaidBy(a1);
    let taxesPaidBy2 = await c.getTotalTaxesPaidBy(a2);
    await c2.edit([[10, initialPrice, parseEtherToGWei("1000"), 0]], [], []);
    await c2.earmark(10, a1, 0);
    await skipOneMonth();
    await c1.claim(10, parseEtherToGWei("1000"), 0);
    expect(await c.getTotalTaxesPaid()).to.be.not.equal(totalTaxesPaid);
    expect(await c.getTotalTaxesPaidBy(a1)).to.be.not.equal(taxesPaidBy1);
    expect(await c.getTotalTaxesPaidBy(a2)).to.be.not.equal(taxesPaidBy2);
  });

  it("should be paid when balance is withdrawn", async function () {
    await skipOneMonth();
    let totalTaxesPaid = await c.getTotalTaxesPaid();
    let taxesPaid = await c.getTotalTaxesPaidBy(a1);
    await c1.withdraw(parseEtherToGWei("1"));
    expect(await c.getTotalTaxesPaid()).to.be.not.equal(totalTaxesPaid);
    expect(await c.getTotalTaxesPaidBy(a1)).to.be.not.equal(taxesPaid);
  });

  it("should be paid when balance is deposited", async function () {
    await skipOneMonth();
    let totalTaxesPaid = await c.getTotalTaxesPaid();
    let taxesPaid = await c.getTotalTaxesPaidBy(a1);
    await c1.deposit({ value: ethers.utils.parseEther("1") });
    expect(await c.getTotalTaxesPaid()).to.be.not.equal(totalTaxesPaid);
    expect(await c.getTotalTaxesPaidBy(a1)).to.be.not.equal(taxesPaid);
  });

  it("should not be paid when balance is negative", async function () {
    for (let i = 0; i < 20; i++) {
      await skipOneMonth();
    }
    await c.payTaxes(a1);

    expect(await c.getTotalTaxesPaid()).to.equal(parseEtherToGWei("100"));
    expect(await c.getTotalTaxesPaidBy(a1)).to.equal(parseEtherToGWei("100"));
    let balance = await c.getBalance(a1);
    expect(balance).to.be.lt(0);

    await c1.deposit({ value: gWeiToWei(balance.mul(-1)) });
    expect(await c.getTotalTaxesPaid()).to.equal(parseEtherToGWei("100").sub(balance));
    expect(await c.getTotalTaxesPaidBy(a1)).to.equal(parseEtherToGWei("100").sub(balance));
  });

  it("should only be paid from tax start time onwards", async function () {
    const taxStartTime = (await ethers.provider.getBlock()).timestamp + 10 * 365 * 24 * 60 * 60;
    const c = await cFactory.deploy(
      width,
      height,
      taxRateNumerator,
      taxRateDenominator,
      taxStartTime,
      initialPrice,
      rugPullHeadsUp,
    );

    await c.depositAndEdit(
      [[0, initialPrice, parseEtherToGWei("100"), 0]],
      [],
      [],
      { value: ethers.utils.parseEther("100.1") },
    );
    await network.provider.send("evm_setNextBlockTimestamp", [taxStartTime + 3 * 365 * 24 * 60 * 60 / 12]);
    await network.provider.send("evm_mine", []);
    const balance = await c.getBalance(a1);
    expect(balance.sub(parseEtherToGWei("97")).abs()).to.be.lte(5000);
  });
});

describe("Owner withdrawal", function () {
  beforeEach(setup);
  beforeEach(async function () {
    await c1.deposit({ value: ethers.utils.parseEther("100") });
    await c1.edit([[0, initialPrice, parseEtherToGWei("20000"), 0]], [], []);
    await skipOneMonth();
    await c1.payTaxes(a1);
  });

  it("should send funds to receiver", async function () {
    expect(await c.getTotalWithdrawnByOwner()).to.equal(0);
    let b0 = await ethers.provider.getBalance(a1);
    await expect(c.withdrawOwner(parseEtherToGWei("1"), {gasPrice: 0}))
      .to.emit(c, "TaxWithdrawn").withArgs(parseEtherToGWei("1"), a1);
    expect((await ethers.provider.getBalance(a1)).sub(b0)).to.equal(ethers.utils.parseEther("1"));
    expect(await c.getTotalWithdrawnByOwner()).to.equal(parseEtherToGWei("1"));
  });

  it("should only be allowed by owner", async function () {
    await expect(c2.withdrawOwner(1))
      .to.be.revertedWith("Ownable: caller is not the owner");
  });

  it("should limit withdrawal to what exists", async function () {
    await expect(c.withdrawOwner(parseEtherToGWei("101")))
      .to.be.revertedWith("GraffitETH2: not enough funds to withdraw");
    
    await c.withdrawOwner(parseEtherToGWei("99"));
      
    await expect(c.withdrawOwner(parseEtherToGWei("2")))
      .to.be.revertedWith("GraffitETH2: not enough funds to withdraw");
  });

  it("should allow withdrawing everyting", async function () {
    await c.withdrawMaxOwner();
    expect(await c.getTotalWithdrawnByOwner()).to.equal(parseEtherToGWei("100"));
    expect(await c.getTotalTaxesPaid()).to.equal(parseEtherToGWei("99.9"));
    expect(await c.getTotalInitialSaleRevenue()).to.equal(parseEtherToGWei("0.1"));
    expect(await c.getOwnerWithdrawableAmount()).to.equal(0);
  })
});

describe("Setting price", function () {
  beforeEach(setup);
  beforeEach(async function () {
    await c.deposit({value: ethers.utils.parseEther("100")});
    await c.edit([
      [0, initialPrice, parseEtherToGWei("10"), 0],
      [1, initialPrice, parseEtherToGWei("30"), 0],
    ], [], []);
  })

  it("should update price", async function () {
    expect(await c.getPrice(0)).to.equal(parseEtherToGWei("10"));
    await expect(c.edit([], [], [[0, parseEtherToGWei("20")]]))
      .to.emit(c, "PriceChanged").withArgs(0, a1, parseEtherToGWei("20"));
    expect(await c.getPrice(0)).to.equal(parseEtherToGWei("20"));
  });

  it("should update tax base", async function () {
    expect(await c.getTaxBase(a1)).to.equal(parseEtherToGWei("40"));
    await expect(c.edit([], [], [[0, parseEtherToGWei("20")]]))
      .to.emit(c, "PriceChanged").withArgs(0, a1, parseEtherToGWei("20"));
    expect(await c.getTaxBase(a1)).to.equal(parseEtherToGWei("50"));
  });

  it("should only be possible to owner", async function () {
    await expect(c2.edit([], [], [[0, parseEtherToGWei("20")]]))
      .to.be.revertedWith("GraffitETH2: only pixel owner can set price");
  });
});

describe("Setting color", function () {
  beforeEach(setup);
  beforeEach(async function () {
    await c.deposit({ value: ethers.utils.parseEther("100") });
    await c.edit([[0, initialPrice, parseEtherToGWei("10"), 0]], [], []);
  });

  it("should change color", async function () {
    await expect(c.edit([], [[0, 2]], []))
      .to.emit(c, "ColorChanged").withArgs(0, a1, 2);
  });

  it("should only be possible to owner", async function () {
    await expect(c2.edit([], [[0, 2]], []))
      .to.be.revertedWith("GraffitETH2: only pixel owner can set color");
  });
});

describe("Earmarking", function () {
  beforeEach(setup);
  beforeEach(async function () {
    await c.deposit({ value: ethers.utils.parseEther("100") });
    await c3.deposit({ value: ethers.utils.parseEther("100") });
    await c.edit([[0, initialPrice, parseEtherToGWei("10"), 0]], [], []);
  });
  
  it("should earmark pixel", async function () {
    await expect(c.earmark(0, a2, parseEtherToGWei("10")))
      .to.emit(c, "Earmarked").withArgs(0, a1, a2, parseEtherToGWei("10"));
    expect(await c.getEarmarkReceiver(0)).to.be.equal(a2);
    expect(await c.getEarmarkAmount(0)).to.be.equal(parseEtherToGWei("10"));

    await expect(c.earmark(0, a3, parseEtherToGWei("5")))
      .to.emit(c, "Earmarked").withArgs(0, a1, a3, parseEtherToGWei("5"));
    expect(await c.getEarmarkReceiver(0)).to.be.equal(a3);
    expect(await c.getEarmarkAmount(0)).to.be.equal(parseEtherToGWei("5"));
  });

  it("should be reset when pixel is bought", async function () {
    await c.earmark(0, a2, parseEtherToGWei("10"));
    await expect(c3.edit([[0, parseEtherToGWei("10"), 0, 0]], [], []))
      .to.emit(c, "Earmarked").withArgs(0, a3, ethers.constants.AddressZero, 0);
    expect(await c.getEarmarkReceiver(0)).to.be.equal(ethers.constants.AddressZero);
    expect(await c.getEarmarkAmount(0)).to.be.equal(0);
  });

  it("should only be possible by owner", async function () {
    await expect(c2.earmark(0, a2, parseEtherToGWei("10")))
      .to.be.revertedWith("GraffitETH2: only pixel owner can set earmark");
  });
});

describe("Claiming", function () {
  beforeEach(setup);
  beforeEach(async function () {
    await c.deposit({ value: ethers.utils.parseEther("100") });
    await c.edit([[0, initialPrice, parseEtherToGWei("20"), 0]], [], []);
    await c.earmark(0, a2, parseEtherToGWei("10"));
  });

  it("should transfer pixel ownership", async function () {
    let tx = c2.claim(0, parseEtherToGWei("20"), parseEtherToGWei("10"));
    await expect(tx)
      .to.emit(c, "PixelClaimed").withArgs(0, a1, a2, parseEtherToGWei("10"));
    await expect(tx)
      .to.emit(c, "Transfer").withArgs(a1, a2, 0);
    expect(await c.ownerOf(0)).to.be.equal(a2);
    expect(await c.getTaxBase(a1)).to.be.equal(0);
    expect(await c.getTaxBase(a2)).to.be.equal(parseEtherToGWei("20"));
  });

  it("should transfer amount", async function () {
    await c2.claim(0, parseEtherToGWei("20"), parseEtherToGWei("10"));

    expect((await c.getBalance(a1)).sub(parseEtherToGWei("89.9")).abs()).to.be.lte(5000);
    expect((await c.getBalance(a2)).sub(parseEtherToGWei("10")).abs()).to.be.lte(5000);
  });

  it("should reset earmark", async function () {
    await c2.claim(0, parseEtherToGWei("20"), parseEtherToGWei("10"));
    expect(await c.getEarmarkReceiver(0)).to.be.equal(ethers.constants.AddressZero);
    expect(await c.getEarmarkAmount(0)).to.be.equal(0);
  });

  it("should fail if price is too high", async function () {
    await expect(c2.claim(0, parseEtherToGWei("20").sub(1), parseEtherToGWei("10")))
      .to.be.revertedWith("GraffitETH2: pixel is too expensive");
  });

  it("should fail if amount is too low", async function () {
    await expect(c2.claim(0, parseEtherToGWei("20"), parseEtherToGWei("10").add(1)))
      .to.be.revertedWith("GraffitETH2: amount is too small");
    await c.withdraw(parseEtherToGWei("95"));
    await expect(c2.claim(0, parseEtherToGWei("20"), parseEtherToGWei("8")))
      .to.be.revertedWith("GraffitETH2: amount is too small");
  });

  it("should not transfer more than current owner has", async function () {
    await c.withdraw(parseEtherToGWei("95"));
    let b = await c.getBalance(a1);
    await c2.claim(0, parseEtherToGWei("20"), 0);
    expect((await c2.getBalance(a2)).sub(b).abs()).to.be.lte(5000);
  });
});

function weiToGWei(wei) {
  return ethers.BigNumber.from(wei).div(1000000000);
}

function gWeiToWei(gWei) {
  return ethers.BigNumber.from(gWei).mul(1000000000);
}

function parseEtherToGWei(ether) {
  return weiToGWei(ethers.utils.parseEther(ether));
}