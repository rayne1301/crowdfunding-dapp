// frontend/src/pages/Refund.jsx — Member 4
import { useState, useEffect } from "react";
import { getCrowdfundingContract, getProviderAndSigner, fromWei } from "../utils/contracts";

export default function Refund({ user }) {
  const [refundable, setRefundable] = useState([]);
  const [loading, setLoading]       = useState(false);
  const [claiming, setClaiming]     = useState(null);
  const [error, setError]           = useState("");
  const [statusMap, setStatusMap]   = useState({});

  useEffect(() => { loadRefundableCampaigns(); }, []);

  async function loadRefundableCampaigns() {
    try {
      setLoading(true);
      const contract = await getCrowdfundingContract();
      const { provider } = await getProviderAndSigner();
      const block = await provider.getBlock("latest");
      const blockTime = block.timestamp;
      const all = await contract.getAllCampaigns();

      const results = await Promise.all(
        all.map(async (c) => {
          try {
            const deadline   = Number(c.deadline);
            const goal       = c.goal ? fromWei(c.goal) : "0";
            const raised     = c.amountRaised ? fromWei(c.amountRaised) : "0";
            const ended      = blockTime > deadline;
            const goalMissed = Number(raised) < Number(goal);
            const myAmount   = await contract.getContribution(c.id, user.address);
            const myEth      = myAmount ? fromWei(myAmount) : "0";
            return {
              id: c.id,
              title: c.title,
              description: c.description,
              goal,
              raised,
              deadline,
              myContribution: myEth,
              eligible: ended && goalMissed && Number(myEth) > 0,
            };
          } catch (e) { return null; }
        })
      );

      const valid = results.filter(c => c !== null);
      setRefundable(valid.filter(c => c.eligible));
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
      setStatusMap(prev => ({ ...prev, [campaignId]: "✅ Refund claimed successfully!" }));
      await loadRefundableCampaigns();
    } catch (err) {
      setError("Refund failed: " + err.message);
    } finally {
      setClaiming(null);
    }
  }

  function progressPercent(raised, goal) {
    const r = Number(raised);
    const g = Number(goal);
    if (g === 0) return 0;
    return Math.min((r / g) * 100, 100).toFixed(0);
  }

  return (
    <div style={pageBackgroundStyle}>
      <div style={{ maxWidth: 1000, margin: "0 auto" }}>

        {/* ── Page Header ── */}
        <h2 style={welcomeHeaderStyle}>Claim Refunds</h2>
        <p style={{ color: "#888", fontSize: 14, marginBottom: 30, marginTop: -20 }}>
          Campaigns below ended without reaching their goal. Your ETH is ready to claim back.
        </p>

        {/* ── Status Messages ── */}
        {loading && <p style={{ color: "#7F77DD" }}>Loading data from blockchain...</p>}
        {error   && <p style={{ color: "#D85A30", fontSize: 14 }}>{error}</p>}

        {/* ── Empty State ── */}
        {!loading && refundable.length === 0 && (
          <div style={emptyCardStyle}>
            <span style={{ fontSize: 40 }}>🎉</span>
            <p style={{ margin: "12px 0 4px", fontWeight: 600, color: "#333" }}>No Refunds Available</p>
            <p style={{ fontSize: 13, color: "#888" }}>
              You have no failed campaigns to claim from at this time.
            </p>
          </div>
        )}

        {/* ── Refund Cards Grid ── */}
        <div style={gridStyle}>
          {refundable.map((c, i) => (
            <div key={i} style={campaignCardStyle}>

              {/* Card Header */}
              <div style={{ padding: "20px 20px 16px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                  <h4 style={cardTitleStyle}>{c.title}</h4>
                  <span style={failedBadgeStyle}>Failed</span>
                </div>

                <p style={cardDescStyle}>
                  {c.description || "No details provided."}
                </p>

                {/* Progress Bar */}
                <div style={progressBarBgStyle}>
                  <div style={{
                    width: progressPercent(c.raised, c.goal) + "%",
                    background: "#D85A30",
                    height: "100%",
                    borderRadius: 99,
                    transition: "width .4s"
                  }} />
                </div>

                {/* Raised vs Goal */}
                <div style={cardDataGridStyle}>
                  <div style={cardDataItemStyle}>
                    <span style={{ color: "#888", fontSize: 11 }}>📈 RAISED</span>
                    <span style={{ fontWeight: "600", color: "#333", fontSize: 14 }}>{c.raised} ETH</span>
                  </div>
                  <div style={cardDataItemStyle}>
                    <span style={{ color: "#888", fontSize: 11 }}>💰 GOAL</span>
                    <span style={{ fontWeight: "600", color: "#333", fontSize: 14 }}>{c.goal} ETH</span>
                  </div>
                  <div style={cardDataItemStyle}>
                    <span style={{ color: "#888", fontSize: 11 }}>💸 YOUR REFUND</span>
                    <span style={{ fontWeight: "700", color: "#7F77DD", fontSize: 14 }}>{c.myContribution} ETH</span>
                  </div>
                </div>

                {/* Deadline */}
                <div style={cardFooterStyle}>
                  <span style={{ fontSize: 12, color: "#D85A30", fontWeight: "bold" }}>
                    ● Deadline passed
                  </span>
                  <span style={{ fontSize: 12, color: "#888" }}>
                    ⏳ {new Date(c.deadline * 1000).toLocaleDateString()}
                  </span>
                </div>

                {/* Claim Button */}
                <button
                  onClick={() => claimRefund(c.id)}
                  disabled={claiming === c.id}
                  style={{
                    ...claimBtnStyle,
                    opacity: claiming === c.id ? 0.7 : 1,
                    cursor: claiming === c.id ? "not-allowed" : "pointer"
                  }}
                  onMouseEnter={e => { if (claiming !== c.id) e.currentTarget.style.background = "#c44f27"; }}
                  onMouseLeave={e => e.currentTarget.style.background = "#D85A30"}
                >
                  {claiming === c.id ? "Processing..." : "💸 Claim Refund"}
                </button>

                {/* Success Message */}
                {statusMap[c.id] && (
                  <p style={{ marginTop: 10, fontSize: 13, color: "#1D9E75", fontWeight: 500 }}>
                    {statusMap[c.id]}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Styles (matching Dashboard exactly) ────────────────────
const pageBackgroundStyle   = { minHeight: "100vh", backgroundColor: "#F9FAFC", padding: "0 24px 40px" };
const welcomeHeaderStyle    = { fontSize: 24, padding: "30px 0 12px", color: "#333", borderBottom: "1px solid #eee", marginBottom: 16 };
const gridStyle             = { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 20 };

const campaignCardStyle = {
  background: "#fff",
  border: "1px solid #E5E9F0",
  borderTop: "6px solid #D85A30",
  borderRadius: 16,
  cursor: "default",
  transition: "all 0.3s ease",
  position: "relative",
  display: "flex",
  flexDirection: "column"
};

const emptyCardStyle = {
  background: "#fff",
  border: "1px solid #eee",
  borderRadius: 16,
  padding: 48,
  textAlign: "center",
  boxShadow: "0 2px 8px rgba(0,0,0,0.03)"
};

const failedBadgeStyle = {
  fontSize: 11,
  fontWeight: "bold",
  color: "#D85A30",
  background: "#fff0eb",
  border: "1px solid #f8d0c0",
  borderRadius: 99,
  padding: "3px 10px"
};

const cardTitleStyle    = { margin: "0 0 8px", fontSize: 17, color: "#333", fontWeight: "600" };
const cardDescStyle     = { fontSize: 13, color: "#666", margin: "0 0 18px", lineHeight: "1.5" };
const progressBarBgStyle = { background: "#eee", borderRadius: 99, height: 7, marginBottom: 14 };
const cardDataGridStyle = { display: "flex", justifyContent: "space-between", gap: 10, marginBottom: 14, backgroundColor: "#fbfbfc", padding: "10px 14px", borderRadius: 8 };
const cardDataItemStyle = { display: "flex", flexDirection: "column" };
const cardFooterStyle   = { display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid #eee", paddingTop: 12, marginBottom: 14 };
const claimBtnStyle     = { width: "100%", marginTop: 4, padding: "12px 24px", background: "#D85A30", color: "#fff", border: "none", borderRadius: 10, fontSize: 15, fontWeight: "bold", transition: "0.3s" };