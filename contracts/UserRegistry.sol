// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

// ============================================================
//  UserRegistry.sol — Member 1: User Registration & Auth
// ============================================================

contract UserRegistry {
    struct User {
        address wallet;
        string username;
        bool exists;
        uint256 registeredAt;
    }

    mapping(address => User) private users;
    address[] private userList;

    event UserRegistered(address indexed user, string username);

    // Register a new user with a username
    function registerUser(string memory _username) external {
        require(!users[msg.sender].exists, "Already registered");
        require(bytes(_username).length > 0, "Username cannot be empty");
        require(bytes(_username).length <= 32, "Username too long");

        users[msg.sender] = User({
            wallet: msg.sender,
            username: _username,
            exists: true,
            registeredAt: block.timestamp
        });

        userList.push(msg.sender);
        emit UserRegistered(msg.sender, _username);
    }

    // Check if an address is registered
    function isRegistered(address _user) public view returns (bool) {
        return users[_user].exists;
    }

    // Get user profile
    function getUser(address _user) external view returns (User memory) {
        require(users[_user].exists, "User not found");
        return users[_user];
    }

    // Modifier: only registered users can call
    modifier onlyRegistered() {
        require(users[msg.sender].exists, "Not registered");
        _;
    }
}
