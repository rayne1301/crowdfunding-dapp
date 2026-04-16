// test/Crowdfunding.test.js
// Run: npx hardhat test

const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Crowdfunding dApp", function () {
  let crowdfunding, rewardToken, userRegistry;
  let owner, member1, member2, member3;

  const GOAL   = ethers.parseEther("2");   // 2 ETH
  const FUTURE = Math.floor(Date.now() / 1000) + 86400; // 1 day from now

  beforeEach(async () => {
    [owner, member1, member2, member3] = await ethers.getSigners();

    const UserRegistry  = await ethers.getContractFactory("UserRegistry");
    userRegistry = await UserRegistry.deploy();

    const RewardToken   = await ethers.getContractFactory("RewardToken");
    rewardToken  = await RewardToken.deploy();

    const Crowdfunding  = await ethers.getContractFactory("Crowdfunding");
    crowdfunding = await Crowdfunding.deploy(
      await rewardToken.getAddress(),
      await userRegistry.getAddress()
    );

    // Transfer ownership of RewardToken to Crowdfunding
    await rewardToken.transferOwnership(await crowdfunding.getAddress());

    // Register users
    await userRegistry.connect(member1).registerUser("alice");
    await userRegistry.connect(member2).registerUser("bob");
  });

  // ── Member 1 Tests ───────────────────────────────────────
  describe("User Registration (Member 1)", () => {
    it("should register a user", async () => {
      expect(await userRegistry.isRegistered(member1.address)).to.equal(true);
    });
    it("should reject duplicate registration", async () => {
      await expect(
        userRegistry.connect(member1).registerUser("alice2")
      ).to.be.revertedWith("Already registered");
    });
    it("should return user profile", async () => {
      const user = await userRegistry.getUser(member1.address);
      expect(user.username).to.equal("alice");
    });
  });

  // ── Member 2 Tests ───────────────────────────────────────
  describe("Campaign Creation (Member 2)", () => {
    it("should create a campaign", async () => {
      await crowdfunding.connect(member1).createCampaign("Test", "Desc", GOAL, FUTURE);
      const c = await crowdfunding.getCampaign(0);
      expect(c.title).to.equal("Test");
      expect(c.goal).to.equal(GOAL);
    });
    it("should reject unregistered creator", async () => {
      await expect(
        crowdfunding.connect(member3).createCampaign("Test", "Desc", GOAL, FUTURE)
      ).to.be.revertedWith("Must be registered");
    });
    it("should reject past deadline", async () => {
      const pastDeadline = Math.floor(Date.now() / 1000) - 1;
      await expect(
        crowdfunding.connect(member1).createCampaign("Test", "Desc", GOAL, pastDeadline)
      ).to.be.revertedWith("Deadline must be in the future");
    });
  });

  // ── Member 3 Tests ───────────────────────────────────────
  describe("Funding + Withdrawal (Member 3)", () => {
    beforeEach(async () => {
      await userRegistry.connect(member2).registerUser("bob"); // may already exist
    });

    it("should accept contributions", async () => {
      await crowdfunding.connect(member1).createCampaign("Fund Me", "Desc", GOAL, FUTURE);
      await crowdfunding.connect(member2).contribute(0, { value: ethers.parseEther("1") });
      const c = await crowdfunding.getCampaign(0);
      expect(c.amountRaised).to.equal(ethers.parseEther("1"));
    });

    it("should allow creator to withdraw when goal is met", async () => {
      // Use time manipulation — set deadline in past after contributions
      const shortDeadline = Math.floor(Date.now() / 1000) + 5;
      await crowdfunding.connect(member1).createCampaign("Fund Me", "Desc", GOAL, shortDeadline);
      await crowdfunding.connect(member2).contribute(0, { value: GOAL });

      // Fast forward time
      await ethers.provider.send("evm_increaseTime", [10]);
      await ethers.provider.send("evm_mine");

      const before = await ethers.provider.getBalance(member1.address);
      const tx     = await crowdfunding.connect(member1).withdrawFunds(0);
      const receipt = await tx.wait();
      const gas    = receipt.gasUsed * receipt.gasPrice;
      const after  = await ethers.provider.getBalance(member1.address);

      expect(after + gas - before).to.equal(GOAL);
    });
  });

  // ── Member 4 Tests ───────────────────────────────────────
  describe("Refunds (Member 4)", () => {
    it("should refund contributor when goal not met", async () => {
      const shortDeadline = Math.floor(Date.now() / 1000) + 5;
      await crowdfunding.connect(member1).createCampaign("Fail Me", "Desc", GOAL, shortDeadline);
      await crowdfunding.connect(member2).contribute(0, { value: ethers.parseEther("0.5") });

      await ethers.provider.send("evm_increaseTime", [10]);
      await ethers.provider.send("evm_mine");

      const before   = await ethers.provider.getBalance(member2.address);
      const tx       = await crowdfunding.connect(member2).claimRefund(0);
      const receipt  = await tx.wait();
      const gas      = receipt.gasUsed * receipt.gasPrice;
      const after    = await ethers.provider.getBalance(member2.address);

      expect(after + gas - before).to.equal(ethers.parseEther("0.5"));
    });

    it("should reject refund if goal was reached", async () => {
      const shortDeadline = Math.floor(Date.now() / 1000) + 5;
      await crowdfunding.connect(member1).createCampaign("Win", "Desc", GOAL, shortDeadline);
      await crowdfunding.connect(member2).contribute(0, { value: GOAL });

      await ethers.provider.send("evm_increaseTime", [10]);
      await ethers.provider.send("evm_mine");

      await expect(
        crowdfunding.connect(member2).claimRefund(0)
      ).to.be.revertedWith("Goal was reached, no refund");
    });
  });

  // ── Member 5 Tests ───────────────────────────────────────
  describe("Reward Token (Member 5)", () => {
    it("should mint tokens when goal is reached", async () => {
      await crowdfunding.connect(member1).createCampaign("Token Test", "Desc", GOAL, FUTURE);
      await crowdfunding.connect(member2).contribute(0, { value: GOAL });

      const balance = await rewardToken.getBalance(member2.address);
      expect(balance).to.be.gt(0);
    });

    it("should not allow direct minting by non-owner", async () => {
      await expect(
        rewardToken.connect(member1).mint(member1.address, 100)
      ).to.be.reverted;
    });
  });
});
