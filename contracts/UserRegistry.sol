// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

// ============================================================
//  UserRegistry.sol — Member 1: User Registration & Auth
//  [Ryan Yap Seng Hooi]
// ============================================================

contract UserRegistry {

    // ─── Structs ───────────────────────────────────────────
    struct User {
        address wallet;
        string username;
        bool exists;
        uint256 registeredAt;
    }

    // ─── State Variables ───────────────────────────────────
    mapping(address => User) private users;
    mapping(string => address) private usernameToAddress; // uniqueness check
    address[] private userList;

    // ─── Events ────────────────────────────────────────────
    event UserRegistered(address indexed user, string username);
    event UsernameUpdated(address indexed user, string oldUsername, string newUsername);

    // ─── Modifiers ─────────────────────────────────────────
    modifier onlyRegistered() {
        require(users[msg.sender].exists, "Not registered");
        _;
    }

    // ─── Functions ─────────────────────────────────────────

    // Register a new user with a unique username
    function registerUser(string memory _username) external {
        require(!users[msg.sender].exists, "Already registered");
        require(bytes(_username).length > 0, "Username cannot be empty");
        require(bytes(_username).length <= 32, "Username too long");
        require(usernameToAddress[_username] == address(0), "Username already taken");

        users[msg.sender] = User({
            wallet: msg.sender,
            username: _username,
            exists: true,
            registeredAt: block.timestamp
        });

        usernameToAddress[_username] = msg.sender;
        userList.push(msg.sender);
        emit UserRegistered(msg.sender, _username);
    }

    // Update username — only registered users, new username must be unique
    function updateUsername(string memory _newUsername) external onlyRegistered {
        require(bytes(_newUsername).length > 0, "Username cannot be empty");
        require(bytes(_newUsername).length <= 32, "Username too long");
        require(usernameToAddress[_newUsername] == address(0), "Username already taken");

        string memory oldUsername = users[msg.sender].username;

        // Free up old username so someone else can take it
        delete usernameToAddress[oldUsername];

        users[msg.sender].username = _newUsername;
        usernameToAddress[_newUsername] = msg.sender;

        emit UsernameUpdated(msg.sender, oldUsername, _newUsername);
    }

    // Check if an address is registered
    function isRegistered(address _user) public view returns (bool) {
        return users[_user].exists;
    }

    // Get full user profile
    function getUser(address _user) external view returns (User memory) {
        require(users[_user].exists, "User not found");
        return users[_user];
    }

    // Get total number of registered users
    function getUserCount() external view returns (uint256) {
        return userList.length;
    }

    // Look up wallet address by username
    function getAddressByUsername(string memory _username) external view returns (address) {
        address wallet = usernameToAddress[_username];
        require(wallet != address(0), "Username not found");
        return wallet;
    }
}