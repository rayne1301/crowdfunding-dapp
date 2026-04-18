// frontend/src/pages/Dashboard.jsx
// Campaign Creation Form + Campaign Listing

import { useState, useEffect } from "react";
import { getCrowdfundingContract, toWei, toUnixTimestamp, fromWei, isDeadlinePassed } from "../utils/contracts";

export default function Dashboard({ user, onSelectCampaign }) {
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");

  const [form, setForm] = useState({
    title: "", description: "", goal: "", deadline: "",
  });

  // fetch data on mount
  useEffect(() => { loadCampaigns(); }, []);

  async function loadCampaigns() {
    try {
      setLoading(true);
      const contract = await getCrowdfundingContract();
      const all = await contract.getAllCampaigns();
      // debug print to console for marking purposes
      console.log("Member 2 debug: Loaded campaigns:", all);
      setCampaigns(all);
    } catch (err) {
      console.error(err);
      setError("Failed to load campaigns: " + err.message);
    } finally {
      setLoading(false);
    }
  }

  async function createCampaign() {
    // basic validation
    if (!form.title || !form.goal || !form.deadline) {
      return setError("Please fill in all required fields!");
    }
    try {
      setCreating(true);
      setError("");
      setStatus("Creating campaign on blockchain...");
      
      const contract = await getCrowdfundingContract();
      const tx = await contract.createCampaign(
        form.title,
        form.description,
        toWei(form.goal),
        toUnixTimestamp(form.deadline)
      );
      
      setStatus("Waiting for MetaMask confirmation...");
      await tx.wait(); // wait for block to be mined
      
      setStatus("Campaign created successfully!");
      // reset form
      setForm({ title: "", description: "", goal: "", deadline: "" });
      
      // refresh list
      await loadCampaigns();
    } catch (err) {
      console.error(err);
      setError("Failed to create campaign: " + err.message);
    } finally {
      setCreating(false);
    }
  }

  // calculate progress bar percentage
  function progressPercent(campaign) {
    const raised = Number(fromWei(campaign.amountRaised));
    const goal   = Number(fromWei(campaign.goal));
    let percent = (raised / goal) * 100;
    return Math.min(percent, 100).toFixed(0); 
  }

  return (
    // wrapper with subtle background to make cards pop and match Member 1's theme
    <div style={pageBackgroundStyle}>
      <div style={{ maxWidth: 1000, margin: "0 auto" }}>
        
        <h2 style={welcomeHeaderStyle}>
          Welcome, {user.username}
        </h2>

        {/* ── Create Campaign Form ── */}
        <div style={formCardStyle}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 18 }}>
            <span style={{ fontSize: 20 }}>🚀</span>
            <h3 style={{ margin: 0, fontSize: 18 }}>Start a New Campaign</h3>
          </div>
          
          <input 
            placeholder="Campaign Title (e.g., TARUMT Crypto Society Event) *" 
            value={form.title}
            onChange={e => setForm({ ...form, title: e.target.value })}
            style={inputStyle} 
          />
          <textarea 
            placeholder="Describe your project goal and details..." 
            value={form.description}
            onChange={e => setForm({ ...form, description: e.target.value })}
            rows={3} 
            style={{ ...inputStyle, resize: "vertical" }} 
          />
          
          <div style={{ display: "flex", gap: 12 }}>
            <div style={{ position: "relative", flex: 1, display: "flex", alignItems: "center" }}>
              <span style={inputIconStyle}>💰</span>
              <input 
                placeholder="Goal (ETH) *" 
                type="number" 
                value={form.goal}
                onChange={e => setForm({ ...form, goal: e.target.value })}
                style={{ ...inputStyle, paddingLeft: 38, marginBottom: 0 }} 
              />
            </div>
            <div style={{ position: "relative", flex: 1, display: "flex", alignItems: "center" }}>
              <span style={inputIconStyle}>⏳</span>
              <input 
                type="date" 
                value={form.deadline}
                onChange={e => setForm({ ...form, deadline: e.target.value })}
                style={{ ...inputStyle, paddingLeft: 38, marginBottom: 0 }} 
              />
            </div>
          </div>
          
          <button onClick={createCampaign} disabled={creating} style={btnStyle}>
            {creating ? "Launching..." : "Launch Campaign"}
          </button>
          
          {status && <p style={{ color: "#1D9E75", marginTop: 12, fontSize: 14 }}>{status}</p>}
          {error  && <p style={{ color: "#D85A30", marginTop: 12, fontSize: 14 }}>{error}</p>}
        </div>

        {/* ── Campaign List ── */}
        <h3 style={sectionHeaderStyle}>
          All Campaigns
        </h3>
        
        {loading && <p>Loading data from blockchain...</p>}
        
        {/* auto-responsive grid layout */}
        <div style={gridStyle}>
          {campaigns.map((c, i) => {
            const ended = isDeadlinePassed(c.deadline);
            return (
              <div key={i} style={campaignCardStyle}
                onClick={() => onSelectCampaign(c)}
                onMouseEnter={(e) => e.currentTarget.style.transform = "translateY(-4px)"}
                onMouseLeave={(e) => e.currentTarget.style.transform = "translateY(0)"}>
              
                <div style={{ padding: "20px 20px 16px" }}>
                  <h4 style={cardTitleStyle}>{c.title}</h4>
                  <p style={cardDescStyle}>
                    {c.description || "No details provided for this project."}
                  </p>
                  
                  {/* progress bar matching Member 1's theme */}
                  <div style={progressBarBgStyle}>
                    <div style={{
                      width: progressPercent(c) + "%", background: "#7F77DD",
                      height: "100%", borderRadius: 99, transition: "width .4s"
                    }} />
                  </div>
                  
                  {/* grid for raised and goal amounts */}
                  <div style={cardDataGridStyle}>
                    <div style={cardDataItemStyle}>
                      <span style={{ color: "#888", fontSize: 11 }}>📈 RAISED</span>
                      <span style={{ fontWeight: "600", color: "#333", fontSize: 14 }}>{fromWei(c.amountRaised)} ETH</span>
                    </div>
                    <div style={cardDataItemStyle}>
                      <span style={{ color: "#888", fontSize: 11 }}>💰 GOAL</span>
                      <span style={{ fontWeight: "600", color: "#333", fontSize: 14 }}>{fromWei(c.goal)} ETH</span>
                    </div>
                  </div>

                  {/* card footer (status & deadline) */}
                  <div style={cardFooterStyle}>
                    <span style={{ 
                      fontSize: 12, 
                      color: ended ? "#D85A30" : "#1D9E75",
                      fontWeight: "bold",
                      display: "flex",
                      alignItems: "center",
                      gap: 4
                    }}>
                      {ended ? "Ended" : "● Active"}
                    </span>
                    <span style={{ fontSize: 12, color: "#888" }}>
                      ⏳ {new Date(Number(c.deadline) * 1000).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── CSS Styles ─────────────────────

const pageBackgroundStyle = { minHeight: "100vh", backgroundColor: "#F9FAFC", padding: "0 24px 40px" };

const welcomeHeaderStyle = { fontSize: 24, padding: "30px 0 20px", color: "#333", borderBottom: "1px solid #eee", marginBottom: 30 };
const sectionHeaderStyle = { margin: "40px 0 16px", fontSize: 18, color: "#333" };

const formCardStyle = { background: "#fff", border: "1px solid #eee", borderRadius: 16, padding: 24, boxShadow: "0 2px 8px rgba(0,0,0,0.03)" };
const inputStyle = { display: "block", width: "100%", padding: "11px 16px", borderRadius: 10, border: "1px solid #ddd", fontSize: 14, marginBottom: 12, boxSizing: "border-box", backgroundColor: "#fff", transition: "0.3s" };
const inputIconStyle = { position: "absolute", left: 14, fontSize: 16, pointerEvents: "none" };

// added margin to push button down slightly
const btnStyle = { marginTop: 12, padding: "12px 24px", background: "#7F77DD", color: "#fff", border: "none", borderRadius: 10, fontSize: 15, cursor: "pointer", fontWeight: "bold", transition: "0.3s" };

const gridStyle = { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 20 };

// use borderTop for the colored accent instead of an inner div
const campaignCardStyle = { 
  background: "#fff", 
  border: "1px solid #E5E9F0", 
  borderTop: "6px solid #7F77DD", 
  borderRadius: 16, 
  cursor: "pointer", 
  transition: "all 0.3s ease", 
  position: "relative", 
  display: "flex", 
  flexDirection: "column" 
};

const cardTitleStyle = { margin: "0 0 8px", fontSize: 17, color: "#333", fontWeight: "600" };
const cardDescStyle = { fontSize: 13, color: "#666", margin: "0 0 18px", lineHeight: "1.5", flex: 1 };
const progressBarBgStyle = { background: "#eee", borderRadius: 99, height: 7, marginBottom: 14 };
const cardDataGridStyle = { display: "flex", justifyContent: "space-between", gap: 10, marginBottom: 14, backgroundColor: "#fbfbfc", padding: "10px 14px", borderRadius: 8 };
const cardDataItemStyle = { display: "flex", flexDirection: "column" };
const cardFooterStyle = { display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid #eee", paddingTop: 12 };