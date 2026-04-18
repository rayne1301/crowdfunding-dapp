// frontend/src/pages/Dashboard.jsx — Member 2
// Campaign Creation Form + Campaign Listing

import { useState, useEffect } from "react";
import { getCrowdfundingContract, toWei, toUnixTimestamp, fromWei, isDeadlinePassed } from "../utils/contracts";

export default function Dashboard({ user, onSelectCampaign }) {
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");

  // Form state
  const [form, setForm] = useState({
    title: "", description: "", goal: "", deadline: "",
  });

  useEffect(() => { loadCampaigns(); }, []);

  async function loadCampaigns() {
    try {
      setLoading(true);
      const contract = await getCrowdfundingContract();
      const all = await contract.getAllCampaigns();
      setCampaigns(all);
    } catch (err) {
      setError("Failed to load campaigns: " + err.message);
    } finally {
      setLoading(false);
    }
  }

  async function createCampaign() {
    if (!form.title || !form.goal || !form.deadline) {
      return setError("Please fill in all required fields");
    }
    try {
      setCreating(true);
      setError("");
      setStatus("Creating campaign...");
      const contract = await getCrowdfundingContract();
      const tx = await contract.createCampaign(
        form.title,
        form.description,
        toWei(form.goal),
        toUnixTimestamp(form.deadline)
      );
      setStatus("Waiting for confirmation...");
      await tx.wait();
      setStatus("Campaign created!");
      setForm({ title: "", description: "", goal: "", deadline: "" });
      await loadCampaigns();
    } catch (err) {
      setError("Failed to create campaign: " + err.message);
    } finally {
      setCreating(false);
    }
  }

  function progressPercent(campaign) {
    const raised = Number(fromWei(campaign.amountRaised));
    const goal   = Number(fromWei(campaign.goal));
    return Math.min((raised / goal) * 100, 100).toFixed(0);
  }

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: 24 }}>
      <h2 style={{ fontSize: 20, marginBottom: 20 }}>
        Welcome, {user.username}
      </h2>

      {/* ── Create Campaign Form ── */}
      <div style={cardStyle}>
        <h3 style={{ marginBottom: 16 }}>Start a Campaign</h3>
        <input placeholder="Title *" value={form.title}
          onChange={e => setForm({ ...form, title: e.target.value })}
          style={inputStyle} />
        <textarea placeholder="Description" value={form.description}
          onChange={e => setForm({ ...form, description: e.target.value })}
          rows={3} style={{ ...inputStyle, resize: "vertical" }} />
        <div style={{ display: "flex", gap: 12 }}>
          <input placeholder="Goal (ETH) *" type="number" value={form.goal}
            onChange={e => setForm({ ...form, goal: e.target.value })}
            style={{ ...inputStyle, flex: 1 }} />
          <input type="date" value={form.deadline}
            onChange={e => setForm({ ...form, deadline: e.target.value })}
            style={{ ...inputStyle, flex: 1 }} />
        </div>
        <button onClick={createCampaign} disabled={creating} style={btnStyle}>
          {creating ? "Creating..." : "Launch Campaign"}
        </button>
        {status && <p style={{ color: "#1D9E75", marginTop: 8 }}>{status}</p>}
        {error  && <p style={{ color: "#D85A30", marginTop: 8 }}>{error}</p>}
      </div>

      {/* ── Campaign List ── */}
      <h3 style={{ margin: "24px 0 12px" }}>Active Campaigns</h3>
      {loading && <p>Loading campaigns...</p>}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px,1fr))", gap: 16 }}>
        {campaigns.map((c, i) => (
          <div key={i} style={{ ...cardStyle, cursor: "pointer" }}
            onClick={() => onSelectCampaign(c)}>
            <h4 style={{ margin: "0 0 6px" }}>{c.title}</h4>
            <p style={{ fontSize: 13, color: "#666", margin: "0 0 10px" }}>{c.description}</p>
            {/* Progress bar */}
            <div style={{ background: "#eee", borderRadius: 99, height: 6, marginBottom: 6 }}>
              <div style={{
                width: progressPercent(c) + "%", background: "#7F77DD",
                height: 6, borderRadius: 99, transition: "width .4s"
              }} />
            </div>
            <p style={{ fontSize: 12, color: "#555" }}>
              {fromWei(c.amountRaised)} / {fromWei(c.goal)} ETH ({progressPercent(c)}%)
            </p>
            <p style={{ fontSize: 12, color: isDeadlinePassed(c.deadline) ? "#D85A30" : "#1D9E75" }}>
              {isDeadlinePassed(c.deadline) ? "Ended" : "Active"} · Deadline: {new Date(Number(c.deadline) * 1000).toLocaleDateString()}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

const cardStyle = { background: "#fff", border: "1px solid #eee", borderRadius: 12, padding: 20 };
const inputStyle = { display: "block", width: "100%", padding: "9px 12px", borderRadius: 8, border: "1px solid #ddd", fontSize: 14, marginBottom: 10, boxSizing: "border-box" };
const btnStyle = { padding: "10px 20px", background: "#7F77DD", color: "#fff", border: "none", borderRadius: 8, fontSize: 14, cursor: "pointer" };
