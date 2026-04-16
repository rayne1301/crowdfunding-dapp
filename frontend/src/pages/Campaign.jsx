// frontend/src/pages/Campaign.jsx — Member 3
// Campaign Detail Page: Contribute + Withdraw

import { useState, useEffect } from "react";
import { getCrowdfundingContract, fromWei, toWei, isDeadlinePassed } from "../utils/contracts";

export default function Campaign({ campaign, user, onBack }) {
  const [detail, setDetail]           = useState(campaign);
  const [myContribution, setMyContribution] = useState("0");
  const [amount, setAmount]           = useState("");
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState("");
  const [status, setStatus]           = useState("");

  useEffect(() => { loadDetail(); }, []);

  async function loadDetail() {
    try {
      const contract = await getCrowdfundingContract();
      const c = await contract.getCampaign(campaign.id);
      setDetail(c);
      const mine = await contract.getContribution(campaign.id, user.address);
      setMyContribution(fromWei(mine));
    } catch (err) {
      setError("Failed to load campaign: " + err.message);
    }
  }

  async function contribute() {
    if (!amount || Number(amount) <= 0) return setError("Enter a valid amount");
    try {
      setLoading(true); setError(""); setStatus("Sending contribution...");
      const contract = await getCrowdfundingContract();
      const tx = await contract.contribute(detail.id, { value: toWei(amount) });
      setStatus("Waiting for confirmation...");
      await tx.wait();
      setStatus("Contribution successful!");
      setAmount("");
      await loadDetail();
    } catch (err) {
      setError("Contribution failed: " + err.message);
    } finally { setLoading(false); }
  }

  async function withdraw() {
    try {
      setLoading(true); setError(""); setStatus("Withdrawing funds...");
      const contract = await getCrowdfundingContract();
      const tx = await contract.withdrawFunds(detail.id);
      setStatus("Waiting for confirmation...");
      await tx.wait();
      setStatus("Funds withdrawn successfully!");
      await loadDetail();
    } catch (err) {
      setError("Withdrawal failed: " + err.message);
    } finally { setLoading(false); }
  }

  const raised      = Number(fromWei(detail.amountRaised));
  const goal        = Number(fromWei(detail.goal));
  const progress    = Math.min((raised / goal) * 100, 100).toFixed(0);
  const ended       = isDeadlinePassed(detail.deadline);
  const goalReached = raised >= goal;
  const isCreator   = user.address?.toLowerCase() === detail.creator?.toLowerCase();

  return (
    <div style={{ maxWidth: 600, margin: "0 auto", padding: 24 }}>
      <button onClick={onBack} style={{ background: "none", border: "none", cursor: "pointer", color: "#7F77DD", marginBottom: 16 }}>
        ← Back
      </button>

      <div style={cardStyle}>
        <h2 style={{ margin: "0 0 6px" }}>{detail.title}</h2>
        <p style={{ color: "#666", marginBottom: 16 }}>{detail.description}</p>

        {/* Progress */}
        <div style={{ background: "#eee", borderRadius: 99, height: 10, marginBottom: 8 }}>
          <div style={{ width: progress + "%", background: goalReached ? "#1D9E75" : "#7F77DD", height: 10, borderRadius: 99 }} />
        </div>
        <p style={{ fontSize: 14, marginBottom: 4 }}>
          <strong>{raised} ETH</strong> raised of <strong>{goal} ETH</strong> ({progress}%)
        </p>
        <p style={{ fontSize: 13, color: ended ? "#D85A30" : "#1D9E75", marginBottom: 4 }}>
          {ended ? "Campaign ended" : "Campaign active"} · Deadline: {new Date(Number(detail.deadline) * 1000).toLocaleDateString()}
        </p>
        <p style={{ fontSize: 13, color: "#555", marginBottom: 16 }}>
          Your contribution: {myContribution} ETH
        </p>

        {/* Contribute */}
        {!ended && !goalReached && (
          <div style={{ marginBottom: 16 }}>
            <input type="number" placeholder="Amount in ETH" value={amount}
              onChange={e => setAmount(e.target.value)}
              style={inputStyle} />
            <button onClick={contribute} disabled={loading} style={btnStyle("#7F77DD")}>
              {loading ? "Processing..." : "Contribute"}
            </button>
          </div>
        )}

        {/* Withdraw — only creator, only if goal met and ended */}
        {isCreator && goalReached && ended && !detail.withdrawn && (
          <button onClick={withdraw} disabled={loading} style={btnStyle("#1D9E75")}>
            {loading ? "Processing..." : "Withdraw Funds"}
          </button>
        )}

        {detail.withdrawn && (
          <p style={{ color: "#1D9E75", fontWeight: 500 }}>Funds have been withdrawn.</p>
        )}

        {status && <p style={{ color: "#1D9E75", marginTop: 12 }}>{status}</p>}
        {error  && <p style={{ color: "#D85A30", marginTop: 12 }}>{error}</p>}
      </div>
    </div>
  );
}

const cardStyle = { background: "#fff", border: "1px solid #eee", borderRadius: 12, padding: 24 };
const inputStyle = { display: "block", width: "100%", padding: "9px 12px", borderRadius: 8, border: "1px solid #ddd", fontSize: 14, marginBottom: 10, boxSizing: "border-box" };
const btnStyle = (bg) => ({ padding: "10px 20px", background: bg, color: "#fff", border: "none", borderRadius: 8, fontSize: 14, cursor: "pointer", marginRight: 8 });
