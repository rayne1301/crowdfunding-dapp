// frontend/src/pages/Login.jsx — Member 1
// User Registration & Authentication

import { useState, useEffect } from "react";
import { getWalletAddress, getUserRegistryContract } from "../utils/contracts";

export default function Login({ onLogin }) {
  const [walletAddress, setWalletAddress] = useState("");
  const [username, setUsername] = useState("");
  const [isRegistered, setIsRegistered] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");

  // On load, check if MetaMask is already connected
  useEffect(() => {
    checkConnection();
    // Listen for account changes
    if (window.ethereum) {
      window.ethereum.on("accountsChanged", () => {
        setWalletAddress("");
        setIsRegistered(false);
      });
    }
  }, []);

  async function checkConnection() {
    try {
      const address = await getWalletAddress();
      setWalletAddress(address);
      await checkRegistration(address);
    } catch {
      // Not connected yet — that's fine
    }
  }

  async function checkRegistration(address) {
    try {
      const contract = await getUserRegistryContract();
      const registered = await contract.isRegistered(address);
      setIsRegistered(registered);
      if (registered) {
        const user = await contract.getUser(address);
        onLogin({ address, username: user.username });
      }
    } catch (err) {
      setError("Could not check registration: " + err.message);
    }
  }

  async function connectWallet() {
    try {
      setLoading(true);
      setError("");
      const address = await getWalletAddress();
      setWalletAddress(address);
      await checkRegistration(address);
    } catch (err) {
      setError("Could not connect wallet: " + err.message);
    } finally {
      setLoading(false);
    }
  }

  async function registerUser() {
    if (!username.trim()) return setError("Please enter a username");
    try {
      setLoading(true);
      setError("");
      setStatus("Registering...");
      const contract = await getUserRegistryContract();
      const tx = await contract.registerUser(username.trim());
      setStatus("Waiting for confirmation...");
      await tx.wait();
      setStatus("Registered successfully!");
      setIsRegistered(true);
      onLogin({ address: walletAddress, username });
    } catch (err) {
      setError("Registration failed: " + err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ maxWidth: 400, margin: "80px auto", padding: 32 }}>
      <h1 style={{ fontSize: 24, marginBottom: 8 }}>CrowdChain</h1>
      <p style={{ color: "#666", marginBottom: 32 }}>Decentralized Crowdfunding</p>

      {!walletAddress ? (
        <button onClick={connectWallet} disabled={loading}
          style={btnStyle("#7F77DD")}>
          {loading ? "Connecting..." : "Connect MetaMask"}
        </button>
      ) : !isRegistered ? (
        <div>
          <p style={{ marginBottom: 12 }}>
            Connected: <code>{walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}</code>
          </p>
          <input
            type="text"
            placeholder="Choose a username"
            value={username}
            onChange={e => setUsername(e.target.value)}
            maxLength={32}
            style={inputStyle}
          />
          <button onClick={registerUser} disabled={loading}
            style={btnStyle("#7F77DD")}>
            {loading ? "Registering..." : "Register"}
          </button>
        </div>
      ) : (
        <p>Already registered. Redirecting...</p>
      )}

      {status && <p style={{ color: "#1D9E75", marginTop: 12 }}>{status}</p>}
      {error  && <p style={{ color: "#D85A30", marginTop: 12 }}>{error}</p>}
    </div>
  );
}

const btnStyle = (bg) => ({
  width: "100%", padding: "12px", background: bg,
  color: "#fff", border: "none", borderRadius: 8,
  fontSize: 15, cursor: "pointer", marginTop: 8,
});

const inputStyle = {
  width: "100%", padding: "10px 12px", borderRadius: 8,
  border: "1px solid #ddd", fontSize: 14,
  marginBottom: 8, boxSizing: "border-box",
};
