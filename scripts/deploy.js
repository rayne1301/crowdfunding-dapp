// scripts/deploy.js — Member 1 runs this
// Usage: npx hardhat run scripts/deploy.js --network ganache

const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with account:", deployer.address);

  // 1. Deploy UserRegistry
  const UserRegistry = await ethers.getContractFactory("UserRegistry");
  const userRegistry = await UserRegistry.deploy();
  await userRegistry.waitForDeployment();
  console.log("UserRegistry deployed to:", await userRegistry.getAddress());

  // 2. Deploy RewardToken
  const RewardToken = await ethers.getContractFactory("RewardToken");
  const rewardToken = await RewardToken.deploy();
  await rewardToken.waitForDeployment();
  console.log("RewardToken deployed to:", await rewardToken.getAddress());

  // 3. Deploy Crowdfunding (needs RewardToken + UserRegistry addresses)
  const Crowdfunding = await ethers.getContractFactory("Crowdfunding");
  const crowdfunding = await Crowdfunding.deploy(
    await rewardToken.getAddress(),
    await userRegistry.getAddress()
  );
  await crowdfunding.waitForDeployment();
  console.log("Crowdfunding deployed to:", await crowdfunding.getAddress());

  // 4. Transfer RewardToken ownership to Crowdfunding contract
  //    (so Crowdfunding can call mint())
  await rewardToken.transferOwnership(await crowdfunding.getAddress());
  console.log("RewardToken ownership transferred to Crowdfunding");

  // 5. Save addresses to frontend/src/utils/addresses.json automatically
  const addresses = {
    UserRegistry: await userRegistry.getAddress(),
    RewardToken: await rewardToken.getAddress(),
    Crowdfunding: await crowdfunding.getAddress(),
  };

  const outputPath = path.join(__dirname, "../frontend/src/utils/addresses.json");
  fs.writeFileSync(outputPath, JSON.stringify(addresses, null, 2));
  console.log("\nAddresses saved to frontend/src/utils/addresses.json");
  console.log(addresses);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
