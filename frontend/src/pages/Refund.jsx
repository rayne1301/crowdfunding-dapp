// frontend/src/pages/Refund.jsx — Member 4
// Automatic Refund Page

import { useState, useEffect } from "react";
import { getCrowdfundingContract, fromWei, isDeadlinePassed } from "../utils/contracts";

export default function Refund({ user }) {
  const [campaigns, setCampaigns]         = useState([]);
  const [refundable, setRefundable]       = useState([]);
  const [loading, setLoading]             = useState(false);
  const [claiming, setClaiming]           = useState(null); // campaignId being claimed
  const [error, setError]                 = useState("");
  const [statusMap, setStatusMap]         = useState({});

  useEffect(() => { loadRefundableCampaigns(); }, []);

  async function loadRefundableCampaigns() {
    try {
      setLoading(true);
      const contract = await getCrowdfundingContract();
      const all = await contract.getAllCampaigns();

      // Filter: ended + goal NOT met + user contributed
      const results = await Promise.all(
        all.map(async (c) => {
          const ended      = isDeadlinePassed(c.deadline);
          const goalMissed = Number(fromWei(c.amountRaised)) < Number(fromWei(c.goal));
          const myAmount   = await contract.getContribution(c.id, user.address);
          return {
            ...c,
            myContribution: fromWei(myAmount),
            eligible: ended && goalMissed && Number(fromWei(myAmount)) > 0,
          };
        })
      );

      setCampaigns(results);
      setRefundable(results.filter(c => c.eligible));
    } catch (err) {
      setError("Failed to load: " + err.message);
    } finally {
      setLoading(false);
    }
  }

  async function claimRefund(campaignId) {
    try {
      setClaiming(campaignId);
      setError("");
      setStatusMap(prev => ({ ...prev, [campaignId]: "Claiming refund..." }));
      const contract = await getCrowdfundingContract();
      const tx = await contract.claimRefund(campaignId);
      setStatusMap(prev => ({ ...prev, [campaignId]: "Waiting for confirmation..." }));
      await tx.wait();
      setStatusMap(prev => ({ ...prev, [campaignId]: "Refund claimed successfully!" }));
      await loadRefundableCampaigns();
    } catch (err) {
      setError("Refund failed: " + err.message);
    } finally {
      setClaiming(null);
    }
  }

  return (
    <div style={{ maxWidth: 700, margin: "0 auto", padding: 24 }}>
      <h2 style={{ fontSize: 20, marginBottom: 6 }}>Claim Refunds</h2>
      <p style={{ color: "#666", marginBottom: 20, fontSize: 14 }}>
        Campaigns below ended without reaching their goal. You can claim your ETH back.
      </p>

      {loading && <p>Loading...</p>}
      {error   && <p style={{ color: "#D85A30" }}>{error}</p>}

      {!loading && refundable.length === 0 && (
        <div style={{ ...cardStyle, color: "#888", textAlign: "center", padding: 40 }}>
          No refunds available at this time.
        </div>
      )}

      {refundable.map((c, i) => (
        <div key={i} style={{ ...cardStyle, marginBottom: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <h4 style={{ margin: "0 0 4px" }}>{c.title}</h4>
              <p style={{ fontSize: 13, color: "#666", margin: "0 0 4px" }}>
                Raised: {fromWei(c.amountRaised)} / {fromWei(c.goal)} ETH
              </p>
              <p style={{ fontSize: 13, color: "#D85A30", margin: "0 0 8px" }}>
                Deadline passed · Goal not reached
              </p>
              <p style={{ fontSize: 14, fontWeight: 500 }}>
                Your refund: <span style={{ color: "#7F77DD" }}>{c.myContribution} ETH</span>
              </p>
            </div>
            <button
              onClick={() => claimRefund(c.id)}
              disabled={claiming === c.id}
              style={{ padding: "9px 18px", background: "#D85A30", color: "#fff", border: "none", borderRadius: 8, fontSize: 13, cursor: "pointer", whiteSpace: "nowrap" }}>
              {claiming === c.id ? "Processing..." : "Claim Refund"}
            </button>
          </div>
          {statusMap[c.id] && (
            <p style={{ marginTop: 8, fontSize: 13, color: "#1D9E75" }}>{statusMap[c.id]}</p>
          )}
        </div>
      ))}
    </div>
  );
}

const cardStyle = { background: "#fff", border: "1px solid #eee", borderRadius: 12, padding: 20 };