const { ethers } = require("hardhat");

async function main() {
  const [sender] = await ethers.getSigners();
  const tx = await sender.sendTransaction({
    to: "0x9c7EC5B79c27Be88ABB98815246A48E125c6675c",
    value: ethers.parseEther("10.0")
  });
  await tx.wait();
  console.log("Funded 0x9c7EC5B79c27Be88ABB98815246A48E125c6675c with 10 ETH");
}

main().catch(console.error);
