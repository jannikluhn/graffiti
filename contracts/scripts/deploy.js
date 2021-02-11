const hre = require("hardhat");

async function main() {
  const Graffiti = await hre.ethers.getContractFactory("GraffitETH");
  const size = 151;
  const taxRateNumerator = 12;
  const taxRateDenominator = 365 * 24 * 60 * 60 * 100;
  const initialPrice = 100000000;  // 0.1 ETH/DAI in GWei
  const graffiti = await Graffiti.deploy(
    size,
    size,
    taxRateNumerator,
    taxRateDenominator,
    initialPrice,
    {
      gasPrice: 1 * 1000000000,
    },
  );
  console.log("Deploy tx:", graffiti.deployTransaction.hash);
  await graffiti.deployed();
  console.log("Contract adddress:", graffiti.address);
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
