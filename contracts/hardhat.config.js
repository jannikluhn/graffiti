require("@nomiclabs/hardhat-waffle");

task("accounts", "Prints the list of accounts", async () => {
  const accounts = await ethers.getSigners();

  for (const account of accounts) {
    console.log(account.address);
  }
});


/**
 * @type import('hardhat/config').HardhatUserConfig
 */
module.exports = {
  solidity: {
    version: "0.7.6",
    optimizer: {
      enabled: true,
      runs: 10000,
    }
  },
  networks: {
    goerli: {
      url: "https://goerli.infura.io/v3/cb47771bf3324acc895994de6752654b",
      accounts: [
      ],
    },
  },
};

