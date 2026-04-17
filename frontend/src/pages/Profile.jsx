// frontend/src/pages/Profile.jsx — Member 1
// User Profile Page — view details and update username

import { useState, useEffect } from "react";
import { getUserRegistryContract } from "../utils/contracts";

export default function Profile({ user, onUsernameUpdate }) {
  const [userDetails, setUserDetails]   = useState(null);
  const [newUsername, setNewUsername]   = useState("");
  const [showUpdate, setShowUpdate]     = useState(false);
  const [loading, setLoading]           = useState(false);
  const [error, setError]               = useState("");
  const [status, setStatus]             = useState("");
  const [userCount, setUserCount]       = useState(null);

  useEffect(() => {
    loadProfile();
  }, []);

  async function loadProfile() {
    try {
      const contract = await getUserRegistryContract();
      const details = await contract.getUser(user.address);
      const count = await contract.getUserCount();
      setUserDetails(details);
      setUserCount(count.toString());
    } catch (err) {
      setError("Failed to load profile: " + err.message);
    }
  }

  async function handleUpdateUsername() {
    if (!newUsername.trim()) return setError("Please enter a new username");
    if (newUsername.trim() === user.username) return setError("That's already your username");
    try {
      setLoading(true);
      setError("");
      setStatus("Checking username availability...");
      const contract = await getUserRegistryContract();

      // Check if username is taken before sending transaction
      const takenBy = await contract.getAddressByUsername(newUsername.trim()).catch(() => null);
      if (takenBy && takenBy !== "0x0000000000000000000000000000000000000000") {
        setError("That username is already taken. Please choose another.");
        return;
      }

      setStatus("Updating username...");
      const tx = await contract.updateUsername(newUsername.trim());
      setStatus("Waiting for confirmation...");
      await tx.wait();
      setStatus("Username updated successfully!");
      setShowUpdate(false);

      // Update the nav bar username in App.jsx
      onUsernameUpdate(newUsername.trim());
      setNewUsername("");
      await loadProfile();
    } catch (err) {
      setError("Update failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  const registeredAt = userDetails
    ? new Date(Number(userDetails.registeredAt) * 1000).toLocaleDateString()
    : null;

  return (
    <div style={{ maxWidth: 500, margin: "0 auto", padding: 24 }}>
      <h2 style={{ fontSize: 20, marginBottom: 20 }}>My Profile</h2>

      {/* Profile Card */}
      <div style={cardStyle}>

        {/* Avatar */}
        <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 24 }}>
          <div style={avatarStyle}>
            {user.username.slice(0, 2).toUpperCase()}
          </div>
          <div>
            <p style={{ fontWeight: 600, fontSize: 18, margin: 0 }}>{user.username}</p>
            <p style={{ fontSize: 13, color: "#888", margin: "2px 0 0" }}>
              Member since {registeredAt || "..."}
            </p>
          </div>
        </div>

        {/* Details */}
        <div style={detailsBox}>
          <div style={detailRow}>
            <span style={detailLabel}>Wallet Address</span>
            <span style={detailValue}>{user.address}</span>
          </div>
          <div style={detailRow}>
            <span style={detailLabel}>Username</span>
            <span style={detailValue}>{user.username}</span>
          </div>
          <div style={detailRow}>
            <span style={detailLabel}>Registered On</span>
            <span style={detailValue}>{registeredAt || "..."}</span>
          </div>
          <div style={{ ...detailRow, border: "none" }}>
            <span style={detailLabel}>Total Platform Users</span>
            <span style={{ ...detailValue, color: "#7F77DD", fontWeight: 600 }}>
              {userCount || "..."}
            </span>
          </div>
        </div>

        {/* Update Username */}
        <button
          onClick={() => { setShowUpdate(!showUpdate); setError(""); setStatus(""); }}
          style={outlineBtnStyle}>
          {showUpdate ? "Cancel" : "Update Username"}
        </button>

        {showUpdate && (
          <div style={{ marginTop: 12 }}>
            <input
              type="text"
              placeholder="Enter new username (max 32 chars)"
              value={newUsername}
              onChange={e => { setNewUsername(e.target.value); setError(""); }}
              maxLength={32}
              style={inputStyle}
            />
            <p style={{ fontSize: 12, color: "#aaa", margin: "-6px 0 12px", textAlign: "right" }}>
              {newUsername.length}/32
            </p>
            <button onClick={handleUpdateUsername} disabled={loading} style={primaryBtnStyle}>
              {loading ? "Processing..." : "Confirm Update"}
            </button>
          </div>
        )}

        {status && <p style={{ color: "#1D9E75", marginTop: 12, fontSize: 14 }}>{status}</p>}
        {error  && <p style={{ color: "#D85A30", marginTop: 12, fontSize: 14 }}>{error}</p>}
      </div>
    </div>
  );
}

// ─── Styles ────────────────────────────────────────────────
const cardStyle = {
  background: "#fff", border: "1px solid #eee",
  borderRadius: 16, padding: 24,
};

const avatarStyle = {
  width: 56, height: 56, borderRadius: "50%",
  background: "#EEEDFE", display: "flex",
  alignItems: "center", justifyContent: "center",
  fontSize: 20, fontWeight: 700, color: "#7F77DD",
};

const detailsBox = {
  background: "#f8f8fc", borderRadius: 10,
  padding: "4px 16px", marginBottom: 16,
};

const detailRow = {
  display: "flex", justifyContent: "space-between",
  alignItems: "center", padding: "12px 0",
  borderBottom: "1px solid #eee", gap: 12,
};

const detailLabel = {
  fontSize: 13, color: "#888", whiteSpace: "nowrap",
};

const detailValue = {
  fontSize: 13, color: "#333", fontWeight: 500,
  wordBreak: "break-all", textAlign: "right",
};

const inputStyle = {
  width: "100%", padding: "10px 12px", borderRadius: 8,
  border: "1px solid #ddd", fontSize: 14,
  marginBottom: 8, boxSizing: "border-box", outline: "none",
};

const outlineBtnStyle = {
  width: "100%", padding: "10px",
  background: "#fff", border: "1px solid #ddd",
  borderRadius: 8, fontSize: 14, cursor: "pointer",
  color: "#555", marginTop: 4,
};

const primaryBtnStyle = {
  width: "100%", padding: "10px",
  background: "#7F77DD", border: "none",
  borderRadius: 8, fontSize: 14, cursor: "pointer",
  color: "#fff",
};