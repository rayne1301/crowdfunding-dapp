// frontend/src/pages/Login.jsx — Member 1
// User Registration & Authentication
// Created by: [Ryan Yap Seng Hooi]

import { useState, useEffect } from "react";
import { getWalletAddress, getUserRegistryContract } from "../utils/contracts";

export default function Login({ onLogin }) {
  const [walletAddress, setWalletAddress] = useState("");
  const [username, setUsername] = useState("");
  const [isRegistered, setIsRegistered] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [userCount, setUserCount] = useState(null);
  const [registeredAt, setRegisteredAt] = useState(null);
  const [showUpdate, setShowUpdate] = useState(false);
  const [newUsername, setNewUsername] = useState("");

  useEffect(() => {
    checkConnection();
    loadUserCount();
    if (window.ethereum) {
      window.ethereum.on("accountsChanged", () => {
        setWalletAddress("");
        setIsRegistered(false);
        setRegisteredAt(null);
        setShowUpdate(false);
        setError("");
        setStatus("");
      });
    }
  }, []);

  async function loadUserCount() {
    try {
      const contract = await getUserRegistryContract();
      const count = await contract.getUserCount();
      setUserCount(count.toString());
    } catch {
      // silently fail — not critical
    }
  }

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
        const date = new Date(Number(user.registeredAt) * 1000).toLocaleDateString();
        setRegisteredAt(date);
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
      setStatus("");
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
      setStatus("Checking username...");
      const contract = await getUserRegistryContract();

      // Check username availability BEFORE sending transaction
      const takenBy = await contract.getAddressByUsername(username.trim()).catch(() => null);
      if (takenBy && takenBy !== "0x0000000000000000000000000000000000000000") {
        setError("That username is already taken. Please choose another.");
        return;
      }

      setStatus("Registering...");
      const tx = await contract.registerUser(username.trim());
      setStatus("Waiting for confirmation...");
      await tx.wait();
      setStatus("Registered successfully!");
      setIsRegistered(true);
      await loadUserCount();
      onLogin({ address: walletAddress, username: username.trim() });
    } catch (err) {
      setError("Registration failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleUpdateUsername() {
    if (!newUsername.trim()) return setError("Please enter a new username");
    try {
      setLoading(true);
      setError("");
      setStatus("Updating username...");
      const contract = await getUserRegistryContract();
      const tx = await contract.updateUsername(newUsername.trim());
      setStatus("Waiting for confirmation...");
      await tx.wait();
      setStatus("Username updated successfully!");
      setShowUpdate(false);
      setNewUsername("");
    } catch (err) {
      if (err.message.includes("Username already taken")) {
        setError("That username is already taken. Please choose another.");
      } else {
        setError("Update failed. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={pageStyle}>
      <div style={cardStyle}>

        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div style={logoStyle}>⛓</div>
          <h1 style={{ fontSize: 26, margin: "10px 0 4px", fontWeight: 700 }}>CrowdChain</h1>
          <p style={{ color: "#888", fontSize: 14, margin: 0 }}>Decentralized Crowdfunding Platform</p>
          {userCount !== null && (
            <p style={{ color: "#7F77DD", fontSize: 13, marginTop: 8 }}>
              {userCount} {userCount === "1" ? "user" : "users"} registered on-chain
            </p>
          )}
        </div>

        {/* Step 1 — Connect Wallet */}
        {!walletAddress && (
          <div>
            <p style={labelStyle}>Step 1 — Connect your MetaMask wallet</p>
            <button onClick={connectWallet} disabled={loading} style={btnStyle("#7F77DD")}>
              {loading ? <span>Connecting<Spinner /></span> : "Connect MetaMask"}
            </button>
          </div>
        )}

        {/* Step 2 — Register */}
        {walletAddress && !isRegistered && (
          <div>
            <div style={addressBadge}>
              <span style={{ fontSize: 11, color: "#888" }}>Connected wallet</span>
              <span style={{ fontSize: 13, fontWeight: 500 }}>
                {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
              </span>
            </div>
            <p style={labelStyle}>Step 2 — Choose a username to register</p>
            <input
              type="text"
              placeholder="Enter a username (max 32 chars)"
              value={username}
              onChange={e => { setUsername(e.target.value); setError(""); }}
              maxLength={32}
              style={inputStyle}
            />
            <p style={{ fontSize: 12, color: "#aaa", margin: "-6px 0 12px", textAlign: "right" }}>
              {username.length}/32
            </p>
            <button onClick={registerUser} disabled={loading} style={btnStyle("#7F77DD")}>
              {loading ? <span>Processing<Spinner /></span> : "Register"}
            </button>
          </div>
        )}

        {/* Already registered — show update username option */}
        {walletAddress && isRegistered && (
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 36, marginBottom: 8 }}>✓</div>
            <p style={{ fontWeight: 600, color: "#1D9E75", marginBottom: 4 }}>
              Wallet registered!
            </p>
            {registeredAt && (
              <p style={{ fontSize: 13, color: "#aaa", marginBottom: 16 }}>
                Member since {registeredAt}
              </p>
            )}
            <button
              onClick={() => { setShowUpdate(!showUpdate); setError(""); setStatus(""); }}
              style={{ ...btnStyle("#f5f5f5"), color: "#555", marginBottom: showUpdate ? 12 : 0 }}>
              {showUpdate ? "Cancel" : "Update Username"}
            </button>
            {showUpdate && (
              <div style={{ marginTop: 8 }}>
                <input
                  type="text"
                  placeholder="New username (max 32 chars)"
                  value={newUsername}
                  onChange={e => { setNewUsername(e.target.value); setError(""); }}
                  maxLength={32}
                  style={inputStyle}
                />
                <button onClick={handleUpdateUsername} disabled={loading} style={btnStyle("#7F77DD")}>
                  {loading ? <span>Updating<Spinner /></span> : "Confirm Update"}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Status & Error messages */}
        {status && <p style={{ color: "#1D9E75", marginTop: 14, fontSize: 14, textAlign: "center" }}>{status}</p>}
        {error  && <p style={{ color: "#D85A30", marginTop: 14, fontSize: 14, textAlign: "center" }}>{error}</p>}

      </div>
    </div>
  );
}

// ─── Loading Spinner ────────────────────────────────────────
function Spinner() {
  return (
    <span style={{
      display: "inline-block", width: 10, height: 10,
      border: "2px solid rgba(255,255,255,0.4)",
      borderTopColor: "#fff", borderRadius: "50%",
      animation: "spin 0.7s linear infinite", marginLeft: 8,
      verticalAlign: "middle"
    }} />
  );
}

// ─── Styles ────────────────────────────────────────────────
const pageStyle = {
  minHeight: "100vh", display: "flex",
  alignItems: "center", justifyContent: "center",
  background: "#f4f4fb", padding: 16,
};

const cardStyle = {
  background: "#fff", borderRadius: 16,
  padding: "36px 32px", width: "100%",
  maxWidth: 420, boxShadow: "0 4px 24px rgba(0,0,0,0.07)",
  border: "1px solid #eee",
};

const logoStyle = {
  width: 52, height: 52, borderRadius: "50%",
  background: "#EEEDFE", display: "inline-flex",
  alignItems: "center", justifyContent: "center", fontSize: 24,
};

const addressBadge = {
  background: "#f8f8fc", border: "1px solid #eee",
  borderRadius: 8, padding: "8px 12px",
  display: "flex", flexDirection: "column", gap: 2,
  marginBottom: 16,
};

const labelStyle = {
  fontSize: 13, color: "#555",
  marginBottom: 10, fontWeight: 500,
};

const inputStyle = {
  width: "100%", padding: "10px 12px", borderRadius: 8,
  border: "1px solid #ddd", fontSize: 14,
  marginBottom: 8, boxSizing: "border-box",
  outline: "none",
};

const btnStyle = (bg) => ({
  width: "100%", padding: "12px",
  background: bg, color: bg === "#f5f5f5" ? "#555" : "#fff",
  border: "none", borderRadius: 8, fontSize: 15,
  cursor: "pointer", marginTop: 4,
  display: "flex", alignItems: "center", justifyContent: "center",
});