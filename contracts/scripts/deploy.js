const hre = require("hardhat");

async function main() {
  const TaskMarketplace = await hre.ethers.getContractFactory("TaskMarketplace");
  const marketplace = await TaskMarketplace.deploy();
  await marketplace.waitForDeployment();
  console.log("TaskMarketplace deployed to:", await marketplace.getAddress());
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
