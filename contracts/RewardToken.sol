// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

// ============================================================
//  RewardToken.sol — Member 5: ERC-20 Reward Token
// ============================================================

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract RewardToken is ERC20, Ownable {

    // 1 token = 1 ETH contributed
    uint256 public constant TOKENS_PER_ETH = 1;

    event TokensMinted(address indexed to, uint256 amount);

    constructor()
        ERC20("CrowdReward", "CRW")
        Ownable(msg.sender)
    {}

    // Only the Crowdfunding contract (owner) can mint
    function mint(address _to, uint256 _amount) external onlyOwner {
        require(_to != address(0), "Cannot mint to zero address");
        require(_amount > 0, "Amount must be > 0");
        _mint(_to, _amount);
        emit TokensMinted(_to, _amount);
    }

    // Burn tokens (optional — contributor can burn their own)
    function burn(uint256 _amount) external {
        _burn(msg.sender, _amount);
    }

    // Get token balance for any address
    function getBalance(address _account) external view returns (uint256) {
        return balanceOf(_account);
    }
}
