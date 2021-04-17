require('dotenv').config()

const fs = require('fs');
var parse = require('csv-parse/lib/sync');
const { task } = require("hardhat/config");
const { ethers } = require('ethers');
const { assert } = require('console');

require("@nomiclabs/hardhat-waffle");
require("hardhat-prettier");

task("pixels", "Print id, owner, nominal price, and color of all pixels")
  .addParam("address", "The contract address")
  .setAction(async (args) => {
    const f = await hre.ethers.getContractFactory("GraffitETH");
    const c = await f.attach(args.address);
    const numTokens = await c.totalSupply();

    const tokenIDs = [];
    const owners = [];
    const prices = [];
    
    for (let i = 0; i < numTokens.toNumber(); i++) {
      const id = await c.tokenByIndex(i);
      const owner = await c.ownerOf(id);
      const price = await c.getNominalPrice(id);
      console.log(i, id.toNumber(), owner, price.toString());

      tokenIDs.push(id);
      owners.push(owner);
      prices.push(price.toString());
    }

    console.log("Token IDs:", tokenIDs);
    console.log("Owners:", owners);
    console.log("Nominal Prices:", prices);
  });

task("owners", "Get information about all pixel owners")
  .addParam("pixels", "Path to a csv file storing ids, owners, and prices")
  .addParam("address", "The contract address")
  .setAction(async (args) => {
    const signer = new ethers.Wallet(process.env.DEPLOY_KEY, hre.ethers.provider);
    const factory = await hre.ethers.getContractFactory("GraffitETH", signer);
    const c = await factory.attach(args.address);

    const pixelsFile = fs.readFileSync(args.pixels);
    const pixels = parse(pixelsFile, { columns: true });

    let owners = [];
    for (const p of pixels) {
      owners.push(p.owner);
    }
    owners = [...new Set(owners)];  // remove duplicates

    let balances = [];
    let taxess = [];
    let taxBases = []
    for (const owner of owners) {
      const balance = await c.getBalance(owner);
      const taxes = await c.getTotalTaxesPaidBy(owner);
      const taxBase = await c.getTaxBase(owner);
      console.log(owner, balance.toString(), taxes.toString(), taxBase.toString());
      balances.push(balance);
      taxess.push(taxes);
      taxBases.push(taxBase);
    }

    console.log("Owners:", owners);
    console.log("Balances:", balances)
    console.log("Taxes:", taxess);
    console.log("Tax Bases:", taxBases);
  });

task("deploy", "Deploy the contract")
  .setAction(async () => {
    const signer = new ethers.Wallet(process.env.DEPLOY_KEY, hre.ethers.provider);
    const factory = await hre.ethers.getContractFactory("GraffitETH2", signer);

    const size = 151;
    const taxRateNumerator = 12;
    const taxRateDenominator = 365 * 24 * 60 * 60 * 100;
    const taxStartTime = 1618826400;
    const initialPrice = 100000000;  // 0.1 ETH/DAI in GWei
    const rugPullHeadsUp = 28 * 24 * 60 * 60;
    const contract = await factory.deploy(
      size,
      size,
      taxRateNumerator,
      taxRateDenominator,
      taxStartTime,
      initialPrice,
      rugPullHeadsUp,
      {
        gasPrice: 2 * 1000000000,
      },
    );
    console.log("Deploy tx:", contract.deployTransaction.hash);
    await contract.deployed();
    console.log("Contract adddress:", contract.address);
  });

task("refund", "Refund in form of deposits")
  .addParam("address", "The contract address")
  .addParam("amounts", "Path to a csv file storing addresses and amounts in ETH to refund")
  .setAction(async (args) => {
    const amountsFile = fs.readFileSync(args.amounts);
    const amounts = parse(amountsFile, { columns: true });

    const signer = new ethers.Wallet(process.env.DEPLOY_KEY, hre.ethers.provider);
    const factory = await hre.ethers.getContractFactory("GraffitETH2", signer);
    const c = await factory.attach(args.address);

    for (const row of amounts) {
      console.log("refunding", row.amount, "to", row.address);
      const tx = await c.depositTo(row.address, { value: ethers.utils.parseEther(row.amount) })
      console.log("tx", tx.hash);
      const receipt = await tx.wait();
      console.log("status:", receipt.status);
    }
  });

task("stop-init", "Finish the initialization phase")
  .addParam("address", "The address of the contract")
  .setAction(async (args) => {
    const signer = new ethers.Wallet(process.env.DEPLOY_KEY, hre.ethers.provider);
    const factory = await hre.ethers.getContractFactory("GraffitETH2", signer);
    const c = await factory.attach(args.address);

    const tx = await c.stopInitialization({
      gasPrice: 2 * 1000000000,
    });
    console.log("tx:", tx.hash);
    const receipt = await tx.wait();
    console.log("status:", receipt.status);
  });

task("events", "Download all events")
  .addParam("address", "")
  .addParam("start", "")
  .setAction(async (args) => {
    const factory = await hre.ethers.getContractFactory("GraffitETH");
    const c = await factory.attach(args.address);

    let totalDeposited = {}
    let totalBought = {}
    let totalSold = {}
    let totalWithdrawn = {}
    
    let f = c.filters.Deposit();
    let events = await c.queryFilter(f, args.startBlock);
    console.log("=== Deposit ===")
    console.log(events.length, "events, 0 amount not shown");
    console.log("block,account,amount,balance");
    for (const ev of events) {
      if (!ev.args.amount.eq(0)) {
        console.log(ev.blockNumber, ev.args.account, ev.args.amount.toString(), ev.args.balance.toString())

        if (!totalDeposited[ev.args.account]) {
          totalDeposited[ev.args.account] = hre.ethers.BigNumber.from(0)
        }
        totalDeposited[ev.args.account] = totalDeposited[ev.args.account].add(ev.args.amount)
      }
    }
    console.log()

    f = c.filters.Withdraw();
    events = await c.queryFilter(f, args.startBlock);
    console.log("=== Withdraw ===")
    console.log(events.length, "events");
    console.log("block,account,amount,balance");
    for (const ev of events) {
      if (!ev.args.amount.eq(0)) {
        console.log(ev.blockNumber, ev.args.account, ev.args.amount.toString(), ev.args.balance.toString())

        if (!totalWithdrawn[ev.args.account]) {
          totalWithdrawn[ev.args.account] = hre.ethers.BigNumber.from(0)
        }
        totalWithdrawn[ev.args.account] = totalWithdrawn[ev.args.account].add(ev.args.amount)
      }
    }
    console.log()

    f = c.filters.Buy()
    events = await c.queryFilter(f, args.startBlock);
    console.log("=== Buy ===")
    console.log(events.length, "events");
    console.log("block,seller,buyer,price");
    for (const ev of events) {
      console.log(ev.blockNumber, ev.args.seller, ev.args.buyer, ev.args.price.toString())

      if (!totalBought[ev.args.buyer]) {
        totalBought[ev.args.buyer] = hre.ethers.BigNumber.from(0)
      }
      totalBought[ev.args.buyer] = totalBought[ev.args.buyer].add(ev.args.price)

      if (!totalSold[ev.args.seller]) {
        totalSold[ev.args.seller] = hre.ethers.BigNumber.from(0)
      }
      totalSold[ev.args.seller] = totalSold[ev.args.seller].add(ev.args.price)
    }


    console.log("total deposited:")
    for (const account in totalDeposited) {
      console.log(account, (totalDeposited[account] * 1e-9).toString())
    }
    console.log()
    console.log("total withdrawn:")
    for (const account in totalWithdrawn) {
      console.log(account, (totalWithdrawn[account] * 1e-9).toString())
    }
    console.log()
    console.log("total bought:")
    for (const account in totalBought) {
      console.log(account, (totalBought[account] * 1e-9).toString())
    }
    console.log()
    console.log("total sold:")
    for (const account in totalSold) {
      console.log(account, (totalSold[account] * 1e-9).toString())
    }

    console.log()
    console.log("sum")
    for (const account in totalDeposited) {
      const sum = totalDeposited[account].add(totalSold[account] || 0).sub(totalWithdrawn[account] || 0).sub(totalBought[account] || 0)
      console.log(account, sum * 1e-9)
    }
  })

task("maria", "")
  .addParam("address", "The contract address")
  .addParam("maria", "Marias address")
  .addParam("price", "Minimum price")
  .setAction(async (args) => {
    const signer = new ethers.Wallet(process.env.DEPLOY_KEY, hre.ethers.provider);
    const factory = await hre.ethers.getContractFactory("GraffitETH2", signer);
    const c = await factory.attach(args.address);

    const pWei = hre.ethers.utils.parseEther(args.price);
    const pGWei = pWei.div("1000000000");

    const n = (await c.balanceOf(args.maria)).toNumber();
    let changePriceArgs = []
    for (let i = 0; i < n; i++) {
      console.log("checking pixel", i, "of", n)
      const id = await c.tokenOfOwnerByIndex(args.maria, i);
      const p = await c.getNominalPrice(id);
      console.log(p.toNumber())
      if (p.lt(pGWei)) {
        console.log("to change")
        changePriceArgs.push([id, pGWei]);
      }
    }

    // const pixelsPerTx = 10;
    // for (let i = 0; i < changePriceArgs.length; i += pixelsPerTx) {
    //   console.log("editing pixels", i, changePriceArgs.length);
    //   const args = changePriceArgs.slice(i, i + pixelsPerTx);
    //   const tx = await c.edit(args.maria, [], [], args);
    //   console.log("tx", tx);
    //   const receipt = await tx.wait();
    //   console.log("status", receipt.status);
    // }
  })

task("earmark", "")
  .addParam("address", "The contract address")
  .addParam("from", "")
  .addParam("to", "")
  .setAction(async (args) => {
    const signer = new ethers.Wallet(process.env.DEPLOY_KEY, hre.ethers.provider);
    const factory = await hre.ethers.getContractFactory("GraffitETH2", signer);
    const c = await factory.attach(args.address);

    const n = (await c.balanceOf(args.from)).toNumber();
    let changePriceArgs = []
    for (let i = 0; i < n; i++) {
      console.log("checking pixel", i, "of", n)
      const id = await c.tokenOfOwnerByIndex(args.maria, i);
      const p = await c.getNominalPrice(id);
      if (p.lt(pGWei)) {
        changePriceArgs.push([id, pGWei]);
      }
    }
  })

task("init", "Initialize the canvas")
  .addParam("pixels", "Path to a csv file storing ids, owners, and prices")
  .addParam("colors", "File storing colors as hex string")
  .addParam("address", "The contract address of contract to initialize")
  .setAction(async (args) => {
    const pixelsFile = fs.readFileSync(args.pixels);
    const colorsFile = fs.readFileSync(args.colors, { encoding: "ASCII" });

    const pixels = parse(pixelsFile, { columns: true });
    pixels.sort((a, b) => parseInt(a.id) - parseInt(b.id));
    const colorsArray = ethers.utils.arrayify(colorsFile.trim());

    let ids = [];
    let owners = [];
    let prices = [];
    let colors = [];

    for (let i = 0; i < pixels.length; i++) {
      const pixel = pixels[i];
      ids.push(pixel.id);
      owners.push(pixel.owner);
      prices.push(pixel.price);
      colors.push(colorsArray[parseInt(pixel.id)]);
    }

    const signer = new ethers.Wallet(process.env.DEPLOY_KEY, hre.ethers.provider);
    const factory = await hre.ethers.getContractFactory("GraffitETH2", signer);
    const c = await factory.attach(args.address);

    const pixelsPerTx = 10;
    for (let i = 0; i < ids.length; i += pixelsPerTx) {
      console.log("initializing pixels", i, "to", i + pixelsPerTx - 1, "of", ids.length);
      const tx = await c.init(
        ids.slice(i, i + pixelsPerTx),
        owners.slice(i, i + pixelsPerTx),
        prices.slice(i, i + pixelsPerTx),
        colors.slice(i, i + pixelsPerTx),
        {
          gasLimit: 5000000,
          gasPrice: 2 * 1000000000,
        },
      );
      console.log("tx:", tx.hash);
      const receipt = await tx.wait();
      console.log("status:", receipt.status, ", gas used:", receipt.cumulativeGasUsed.toString());
    }

  });


/**
 * @type import('hardhat/config').HardhatUserConfig
 */
module.exports = {
  solidity: {
    version: "0.7.6",
    settings: {
      optimizer: {
        enabled: true,
        runs: 1,
      },
    },
  },
  networks: {
    goerli: {
      url: "https://goerli.infura.io/v3/cb47771bf3324acc895994de6752654b",
    },
    xdai: {
      url: "https://rpc.xdaichain.com/",
    },
  },
};

