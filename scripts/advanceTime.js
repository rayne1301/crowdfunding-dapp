const hre = require("hardhat");

async function main() {
  await hre.network.provider.send("evm_increaseTime", [172800]);
  await hre.network.provider.send("evm_mine");
  console.log("Time advanced by 2 days! ✅");
}

main().catch(console.error);