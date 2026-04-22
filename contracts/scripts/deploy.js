const hre = require("hardhat");

async function main() {
  const TaskMarketplace = await hre.ethers.getContractFactory("TaskMarketplace");
  const marketplace = await TaskMarketplace.deploy();
  await marketplace.waitForDeployment();
  const addr = await marketplace.getAddress();
  console.log("TaskMarketplace deployed to:", addr);
  console.log("Oracle is the deployer wallet. Set backend ORACLE_PRIVATE_KEY to that key and CONTRACT_ADDRESS to the address above.");
  console.log("Frontend: NEXT_PUBLIC_CONTRACT_ADDRESS=" + addr + " and NEXT_PUBLIC_SKIP_CHAIN=0 (or unset).");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
