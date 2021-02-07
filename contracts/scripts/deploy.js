const hre = require("hardhat");

async function main() {
  const Graffiti = await hre.ethers.getContractFactory("Graffiti");
  const size = 333;
  const graffiti = await Graffiti.deploy(size, size);

  await graffiti.deployed();

  console.log("Deploy tx:", graffiti.deployTransaction.hash);
  console.log("Contract adddress:", graffiti.address);
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
