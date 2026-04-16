// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

// ============================================================
//  Crowdfunding.sol
//  Member 2 → createCampaign(), getCampaign(), getAllCampaigns()
//  Member 3 → contribute(), withdrawFunds()
//  Member 4 → claimRefund()
// ============================================================

import "./RewardToken.sol";
import "./UserRegistry.sol";

contract Crowdfunding {

    // ─── Structs ───────────────────────────────────────────
    struct Campaign {
        uint256 id;
        address payable creator;
        string title;
        string description;
        uint256 goal;           // in wei
        uint256 deadline;       // unix timestamp
        uint256 amountRaised;
        bool withdrawn;
        bool exists;
    }

    // ─── State Variables ───────────────────────────────────
    mapping(uint256 => Campaign) public campaigns;
    mapping(uint256 => mapping(address => uint256)) public contributions;
    uint256 public campaignCount;

    RewardToken public rewardToken;
    UserRegistry public userRegistry;

    // ─── Events ────────────────────────────────────────────
    event CampaignCreated(
        uint256 indexed campaignId,
        address indexed creator,
        string title,
        uint256 goal,
        uint256 deadline
    );

    event Funded(
        uint256 indexed campaignId,
        address indexed contributor,
        uint256 amount
    );

    event Withdrawn(
        uint256 indexed campaignId,
        address indexed creator,
        uint256 amount
    );

    event Refunded(
        uint256 indexed campaignId,
        address indexed contributor,
        uint256 amount
    );

    event TokensMinted(
        uint256 indexed campaignId,
        address indexed contributor,
        uint256 tokens
    );

    // ─── Constructor ───────────────────────────────────────
    constructor(address _rewardToken, address _userRegistry) {
        rewardToken = RewardToken(_rewardToken);
        userRegistry = UserRegistry(_userRegistry);
    }

    // ─── Modifiers ─────────────────────────────────────────
    modifier campaignExists(uint256 _id) {
        require(campaigns[_id].exists, "Campaign does not exist");
        _;
    }

    modifier onlyRegistered() {
        require(userRegistry.isRegistered(msg.sender), "Must be registered");
        _;
    }

    // ======================================================
    //  MEMBER 2 — Campaign Creation
    // ======================================================

    function createCampaign(
        string memory _title,
        string memory _description,
        uint256 _goal,
        uint256 _deadline
    ) external onlyRegistered returns (uint256) {
        require(bytes(_title).length > 0, "Title required");
        require(_goal > 0, "Goal must be > 0");
        require(_deadline > block.timestamp, "Deadline must be in the future");

        uint256 id = campaignCount++;

        campaigns[id] = Campaign({
            id: id,
            creator: payable(msg.sender),
            title: _title,
            description: _description,
            goal: _goal,
            deadline: _deadline,
            amountRaised: 0,
            withdrawn: false,
            exists: true
        });

        emit CampaignCreated(id, msg.sender, _title, _goal, _deadline);
        return id;
    }

    function getCampaign(uint256 _id)
        external view campaignExists(_id)
        returns (Campaign memory)
    {
        return campaigns[_id];
    }

    function getAllCampaigns() external view returns (Campaign[] memory) {
        Campaign[] memory all = new Campaign[](campaignCount);
        for (uint256 i = 0; i < campaignCount; i++) {
            all[i] = campaigns[i];
        }
        return all;
    }

    // ======================================================
    //  MEMBER 3 — Funding Mechanism + Successful Withdrawal
    // ======================================================

    function contribute(uint256 _campaignId)
        external payable onlyRegistered campaignExists(_campaignId)
    {
        Campaign storage c = campaigns[_campaignId];
        require(block.timestamp < c.deadline, "Campaign has ended");
        require(msg.value > 0, "Contribution must be > 0");

        contributions[_campaignId][msg.sender] += msg.value;
        c.amountRaised += msg.value;

        emit Funded(_campaignId, msg.sender, msg.value);

        // Mint reward tokens if goal is reached after this contribution
        if (c.amountRaised >= c.goal) {
            uint256 tokens = msg.value / 1 ether; // 1 token per 1 ETH
            if (tokens > 0) {
                rewardToken.mint(msg.sender, tokens * 10 ** 18);
                emit TokensMinted(_campaignId, msg.sender, tokens);
            }
        }
    }

    function withdrawFunds(uint256 _campaignId)
        external campaignExists(_campaignId)
    {
        Campaign storage c = campaigns[_campaignId];
        require(msg.sender == c.creator, "Only creator can withdraw");
        require(c.amountRaised >= c.goal, "Goal not reached");
        require(block.timestamp >= c.deadline, "Campaign still active");
        require(!c.withdrawn, "Already withdrawn");

        c.withdrawn = true;
        uint256 amount = c.amountRaised;
        c.creator.transfer(amount);

        emit Withdrawn(_campaignId, msg.sender, amount);
    }

    // ======================================================
    //  MEMBER 4 — Automatic Refunds
    // ======================================================

    function claimRefund(uint256 _campaignId)
        external campaignExists(_campaignId)
    {
        Campaign storage c = campaigns[_campaignId];
        require(block.timestamp >= c.deadline, "Campaign still active");
        require(c.amountRaised < c.goal, "Goal was reached, no refund");

        uint256 amount = contributions[_campaignId][msg.sender];
        require(amount > 0, "No contribution to refund");

        // Set to 0 BEFORE transfer (reentrancy protection)
        contributions[_campaignId][msg.sender] = 0;
        payable(msg.sender).transfer(amount);

        emit Refunded(_campaignId, msg.sender, amount);
    }

    // ─── Helper ────────────────────────────────────────────
    function getContribution(uint256 _campaignId, address _contributor)
        external view returns (uint256)
    {
        return contributions[_campaignId][_contributor];
    }
}
