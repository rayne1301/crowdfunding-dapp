// frontend/src/pages/Campaign.jsx — Member 3
// Campaign Detail Page: Premium + Carousel + Animations

import { useState, useEffect } from "react";
import { getCrowdfundingContract, fromWei, toWei, isDeadlinePassed } from "../utils/contracts";

export default function Campaign({ campaign, user, onBack }) {
  const [detail, setDetail] = useState(campaign);
  const [myContribution, setMyContribution] = useState("0");
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [popup, setPopup] = useState(null);
  const [allCampaigns, setAllCampaigns] = useState([]);
  const [carouselIndex, setCarouselIndex] = useState(0);

  useEffect(() => { 
    loadDetail(); 
    loadAllCampaigns();
  }, []);

  async function loadDetail() {
    try {
      const contract = await getCrowdfundingContract();
      const c = await contract.getCampaign(campaign.id);
      setDetail(c);
      const mine = await contract.getContribution(campaign.id, user.address);
      setMyContribution(fromWei(mine));
    } catch (err) {
      setPopup({ type: "error", message: "Failed to load campaign: " + err.message });
    }
  }

  async function loadAllCampaigns() {
    try {
      const contract = await getCrowdfundingContract();
      const all = await contract.getAllCampaigns();
      setAllCampaigns(all);
      // 找到当前campaign的index
      const idx = all.findIndex(c => c.id.toString() === campaign.id.toString());
      setCarouselIndex(Math.max(0, idx));
    } catch (err) {
      console.log("Failed to load campaigns");
    }
  }

  async function contribute() {
    if (!amount || Number(amount) <= 0) {
      setPopup({ type: "error", message: "Please enter a valid amount" });
      return;
    }
    try {
      setLoading(true);
      const contract = await getCrowdfundingContract();
      const tx = await contract.contribute(detail.id, { value: toWei(amount) });
      await tx.wait();
      setPopup({ 
        type: "success", 
        message: `You contributed ${amount} ETH successfully!`
      });
      setAmount("");
      
      // 保存当前的campaign ID
      const currentCampaignId = detail.id;
      
      // 重新加载所有数据
      const contract2 = await getCrowdfundingContract();
      const all = await contract2.getAllCampaigns();
      setAllCampaigns(all);
      
      // 重新加载当前campaign的详细信息
      const updatedCampaign = await contract2.getCampaign(currentCampaignId);
      setDetail(updatedCampaign);
      
      const mine = await contract2.getContribution(currentCampaignId, user.address);
      setMyContribution(fromWei(mine));
      
      // 重新计算carousel index（保持在当前campaign）
      const newIdx = all.findIndex(c => c.id.toString() === currentCampaignId.toString());
      setCarouselIndex(Math.max(0, newIdx));
    } catch (err) {
      setPopup({ type: "error", message: "Contribution failed: " + err.message });
    } finally { 
      setLoading(false); 
    }
  }

  async function withdraw() {
    try {
      setLoading(true);
      const contract = await getCrowdfundingContract();
      const tx = await contract.withdrawFunds(detail.id);
      await tx.wait();
      setPopup({ 
        type: "success", 
        message: "Funds withdrawn successfully!"
      });
      await loadDetail();
    } catch (err) {
      setPopup({ type: "error", message: "Withdrawal failed: " + err.message });
    } finally { 
      setLoading(false); 
    }
  }

  const raised = Number(fromWei(detail.amountRaised));
  const goal = Number(fromWei(detail.goal));
  const progress = Math.min((raised / goal) * 100, 100).toFixed(0);
  const ended = isDeadlinePassed(detail.deadline);
  const goalReached = raised >= goal;
  const isCreator = user.address?.toLowerCase() === detail.creator?.toLowerCase();
  const daysLeft = Math.ceil((Number(detail.deadline) * 1000 - Date.now()) / (1000 * 60 * 60 * 24));

  const getProgressColor = (percent) => {
    const p = parseFloat(percent);
    if (p < 50) {
      const ratio = p / 50;
      return `hsl(${0 + ratio * 60}, 100%, 50%)`;
    } else {
      const ratio = (p - 50) / 50;
      return `hsl(${60 + ratio * 160}, 80%, 42%)`;
    }
  };

  const formatDate = (timestamp) => {
    const date = new Date(Number(timestamp) * 1000);
    const day = date.getDate();
    const month = date.getMonth() + 1;
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  // Carousel navigation
  const handlePrev = () => {
    const newIndex = Math.max(0, carouselIndex - 1);
    setCarouselIndex(newIndex);
    if (allCampaigns[newIndex]) {
      setDetail(allCampaigns[newIndex]);
      loadDetailForCampaign(allCampaigns[newIndex]);
    }
  };

  const handleNext = () => {
    const newIndex = Math.min(allCampaigns.length - 1, carouselIndex + 1);
    setCarouselIndex(newIndex);
    if (allCampaigns[newIndex]) {
      setDetail(allCampaigns[newIndex]);
      loadDetailForCampaign(allCampaigns[newIndex]);
    }
  };

  async function loadDetailForCampaign(camp) {
    try {
      const contract = await getCrowdfundingContract();
      const mine = await contract.getContribution(camp.id, user.address);
      setMyContribution(fromWei(mine));
      setAmount("");
    } catch (err) {
      console.log("Failed to load contribution");
    }
  }

  // Handle carousel item click
  const handleCarouselClick = (newIndex) => {
    setCarouselIndex(newIndex);
    if (allCampaigns[newIndex]) {
      setDetail(allCampaigns[newIndex]);
      loadDetailForCampaign(allCampaigns[newIndex]);
    }
  };

  // Get carousel campaigns
  const carouselCampaigns = [];
  for (let i = -1; i <= 1; i++) {
    const idx = carouselIndex + i;
    if (idx >= 0 && idx < allCampaigns.length) {
      carouselCampaigns.push({ campaign: allCampaigns[idx], position: i });
    }
  }

  return (
    <div style={styles.container}>
      <div style={styles.wrapper}>
        {/* Back Button - Purple Pill */}
        <button 
          onClick={onBack} 
          style={styles.backBtn}
          onMouseEnter={(e) => {
            e.target.style.background = "linear-gradient(135deg, #6D5FD8 0%, #5B5AE8 100%)";
            e.target.style.transform = "translateY(-2px)";
            e.target.style.boxShadow = "0 8px 20px rgba(127, 119, 221, 0.35)";
          }}
          onMouseLeave={(e) => {
            e.target.style.background = "linear-gradient(135deg, #7F77DD 0%, #6366F1 100%)";
            e.target.style.transform = "translateY(0)";
            e.target.style.boxShadow = "0 4px 12px rgba(127, 119, 221, 0.3)";
          }}
        >
          ← Back to Campaigns
        </button>

        {/* Title */}
        <h1 style={styles.title}>{detail.title}</h1>

        {/* Main Card */}
        <div style={styles.mainCard}>
          {/* Description */}
          <p style={styles.description}>{detail.description}</p>

          {/* Single Large Stats Card */}
          <div style={styles.singleStatCard}>
            <div style={{ display: "flex", gap: 32, alignItems: "flex-start" }}>
              {/* Raised */}
              <div style={{ flex: 1 }}>
                <div style={styles.statLabel}>💰 TOTAL RAISED</div>
                <div style={styles.statValueLarge}>{raised}</div>
                <div style={styles.statCurrency}>ETH</div>
                <div style={styles.statSmallText}>of {goal} ETH goal</div>
              </div>

              {/* Divider */}
              <div style={{ width: "1px", background: "rgba(127, 119, 221, 0.2)", height: "120px" }} />

              {/* Your Contribution */}
              <div style={{ flex: 1 }}>
                <div style={styles.statLabel}>🎯 YOUR CONTRIBUTION</div>
                <div style={styles.statValueLarge}>{myContribution}</div>
                <div style={styles.statCurrency}>ETH</div>
                <div style={styles.statSmallText}>Total pledged</div>
              </div>
            </div>
          </div>

          {/* Progress Bar with Gradient */}
          <div style={{ marginBottom: 36, marginTop: 36 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <label style={styles.progressLabel}>FUNDING PROGRESS</label>
              <span style={styles.progressPercent}>{progress}%</span>
            </div>
            <div style={styles.progressContainer}>
              <div style={{
                height: "100%",
                borderRadius: 99,
                width: progress + "%",
                background: getProgressColor(progress),
                transition: "width 0.6s cubic-bezier(0.4, 0, 0.2, 1), background 0.6s ease",
                boxShadow: `0 0 20px ${getProgressColor(progress)}`
              }} />
            </div>
            <p style={styles.progressDescription}>
              {goalReached ? "🎉 Goal Reached!" : `${Math.max(0, goal - raised).toFixed(2)} ETH remaining`}
            </p>
          </div>

          {/* Status Card with Blinking Dot */}
          <div style={styles.statusCard}>
            <div>
              <div style={styles.statusLabel}>
                {ended ? "⏱️ CAMPAIGN ENDED" : "🚀 CAMPAIGN ACTIVE"}
              </div>
              <div style={styles.statusInfo}>
                {ended ? (
                  <>
                    <div style={styles.statusRow}>
                      Status: <strong>Ended</strong>
                      <div style={{
                        display: "inline-block",
                        width: 10,
                        height: 10,
                        borderRadius: "50%",
                        background: "#D85A30",
                        boxShadow: "0 0 12px rgba(216, 90, 48, 0.5)",
                        marginLeft: 8
                      }} />
                    </div>
                    <div style={styles.statusRow}>Ended: <strong>{formatDate(detail.deadline)}</strong></div>
                  </>
                ) : (
                  <>
                    <div style={styles.statusRow}>
                      Status: <strong>Active</strong>
                      <div style={{
                        display: "inline-block",
                        width: 10,
                        height: 10,
                        borderRadius: "50%",
                        background: "#10B981",
                        boxShadow: "0 0 12px rgba(16, 185, 129, 0.5)",
                        marginLeft: 8,
                        animation: "pulse 2s ease-in-out infinite"
                      }} />
                    </div>
                    <div style={styles.statusRow}>Time Left: <strong>{daysLeft} days</strong></div>
                    <div style={styles.statusRow}>Deadline: <strong>{formatDate(detail.deadline)}</strong></div>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div style={{ marginTop: 40 }}>
            {!ended && !goalReached && (
              <div>
                <input
                  type="number"
                  placeholder="How much ETH do you want to contribute?"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  style={styles.input}
                />
                <button
                  onClick={contribute}
                  disabled={loading || !amount || Number(amount) <= 0}
                  style={{
                    ...styles.btn,
                    ...styles.btnPrimary,
                    opacity: (loading || !amount || Number(amount) <= 0) ? 0.5 : 1,
                    cursor: (loading || !amount || Number(amount) <= 0) ? "not-allowed" : "pointer"
                  }}
                  onMouseEnter={(e) => {
                    if (!loading && amount && Number(amount) > 0) {
                      e.target.style.transform = "translateY(-2px)";
                      e.target.style.boxShadow = "0 12px 24px rgba(127, 119, 221, 0.4)";
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.transform = "translateY(0)";
                    e.target.style.boxShadow = "0 4px 12px rgba(127, 119, 221, 0.3)";
                  }}
                >
                  {loading ? "Processing..." : "💰 Contribute Now"}
                </button>
              </div>
            )}

            {isCreator && goalReached && ended && !detail.withdrawn && (
              <button
                onClick={withdraw}
                disabled={loading}
                style={{
                  ...styles.btn,
                  ...styles.btnSuccess,
                  opacity: loading ? 0.7 : 1
                }}
                onMouseEnter={(e) => !loading && (e.target.style.transform = "translateY(-2px)", e.target.style.boxShadow = "0 12px 24px rgba(16, 185, 129, 0.4)")}
                onMouseLeave={(e) => (e.target.style.transform = "translateY(0)", e.target.style.boxShadow = "0 4px 12px rgba(16, 185, 129, 0.3)")}
              >
                {loading ? "Processing..." : "🎉 Withdraw Funds"}
              </button>
            )}

            {detail.withdrawn && (
              <div style={styles.withdrawnBox}>
                <div style={{ fontSize: 28, marginRight: 14 }}>✅</div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 16, color: "#059669" }}>Funds Withdrawn</div>
                  <div style={{ fontSize: 13, color: "#666", marginTop: 4 }}>All funds transferred to creator</div>
                </div>
              </div>
            )}

            {ended && !goalReached && !isCreator && (
              <div style={styles.failedBox}>
                <div style={{ fontSize: 28, marginRight: 14 }}>📋</div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 16, color: "#D85A30" }}>Campaign Failed</div>
                  <div style={{ fontSize: 13, color: "#666", marginTop: 4 }}>Go to Refunds to claim your contribution</div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Campaign Carousel */}
        {allCampaigns.length > 0 && (
          <div style={styles.carouselSection}>
            <h2 style={styles.carouselTitle}>More Campaigns</h2>
            <div style={styles.carouselContainer}>
              {/* Left Arrow */}
              <button
                onClick={handlePrev}
                disabled={carouselIndex === 0}
                style={{...styles.carouselArrow, opacity: carouselIndex === 0 ? 0.3 : 1}}
              >
                ←
              </button>

              {/* Carousel Items */}
              <div style={styles.carouselTrack}>
                {carouselCampaigns.map(({ campaign: camp, position }) => (
                  <div
                    key={camp.id}
                    style={{
                      ...styles.carouselItem,
                      ...(position === 0 ? styles.carouselItemActive : 
                        position === -1 ? styles.carouselItemLeft : 
                        styles.carouselItemRight)
                    }}
                    onClick={() => {
                      const targetIndex = carouselIndex + position;
                      if (targetIndex !== carouselIndex && targetIndex >= 0 && targetIndex < allCampaigns.length) {
                        handleCarouselClick(targetIndex);
                      }
                    }}
                  >
                    <div style={styles.carouselCard}>
                      <h3 style={styles.carouselCardTitle}>{camp.title}</h3>
                      <div style={styles.carouselCardInfo}>
                        <div>{Number(fromWei(camp.amountRaised)).toFixed(1)} ETH</div>
                        <div style={{ fontSize: 12, color: "#666" }}>of {Number(fromWei(camp.goal)).toFixed(0)} ETH</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Right Arrow */}
              <button
                onClick={handleNext}
                disabled={carouselIndex >= allCampaigns.length - 1}
                style={{...styles.carouselArrow, opacity: carouselIndex >= allCampaigns.length - 1 ? 0.3 : 1}}
              >
                →
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Popup Modal */}
      {popup && (
        <div style={styles.popupOverlay} onClick={() => setPopup(null)}>
          <div style={{
            ...styles.popup,
            borderTop: `4px solid ${popup.type === "success" ? "#10B981" : "#D85A30"}`
          }} onClick={(e) => e.stopPropagation()}>
            <div style={styles.popupIcon}>
              {popup.type === "success" ? "✅" : "⚠️"}
            </div>
            <div style={{
              ...styles.popupTitle,
              color: popup.type === "success" ? "#059669" : "#D85A30"
            }}>
              {popup.type === "success" ? "Success!" : "Error"}
            </div>
            <div style={styles.popupMessage}>
              {popup.message}
            </div>
            <button
              onClick={() => setPopup(null)}
              style={styles.popupBtn}
            >
              Close
            </button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes pulse {
          0%, 100% {
            box-shadow: 0 0 12px rgba(16, 185, 129, 0.5), 0 0 0 0 rgba(16, 185, 129, 0.7);
          }
          50% {
            box-shadow: 0 0 12px rgba(16, 185, 129, 0.8), 0 0 8px 3px rgba(16, 185, 129, 0.2);
          }
        }
      `}</style>
    </div>
  );
}

const styles = {
  container: {
    minHeight: "100vh",
    background: "#ffffff",
    padding: "40px 20px",
    position: "relative"
  },

  wrapper: {
    maxWidth: 1000,
    margin: "0 auto",
    position: "relative",
    zIndex: 1
  },

  backBtn: {
    background: "linear-gradient(135deg, #7F77DD 0%, #6366F1 100%)",
    color: "#fff",
    border: "none",
    cursor: "pointer",
    padding: "12px 28px",
    borderRadius: 99,
    fontSize: 15,
    fontWeight: 700,
    transition: "all 0.3s ease",
    boxShadow: "0 4px 12px rgba(127, 119, 221, 0.3)",
    marginBottom: 28
  },

  title: {
    margin: "0 0 32px 0",
    fontSize: 42,
    fontWeight: 800,
    color: "#0f172a",
    letterSpacing: "-1px"
  },

  mainCard: {
    background: "#fff",
    borderRadius: 24,
    padding: 48,
    boxShadow: "0 20px 60px rgba(127, 119, 221, 0.15), 0 0 1px rgba(0, 0, 0, 0.1)",
    border: "1px solid rgba(127, 119, 221, 0.15)",
    marginBottom: 48
  },

  description: {
    margin: "0 0 36px 0",
    fontSize: 18,
    color: "#64748b",
    lineHeight: 1.8
  },

  singleStatCard: {
    background: "linear-gradient(135deg, #f8f7ff 0%, #f3f0ff 100%)",
    borderRadius: 16,
    padding: 32,
    border: "1.5px solid rgba(127, 119, 221, 0.25)"
  },

  statLabel: {
    fontSize: 13,
    fontWeight: 700,
    color: "#7F77DD",
    letterSpacing: 1.2,
    marginBottom: 12,
    textTransform: "uppercase"
  },

  statValueLarge: {
    fontSize: 48,
    fontWeight: 800,
    color: "#0f172a",
    margin: 0,
    lineHeight: 1
  },

  statCurrency: {
    fontSize: 18,
    color: "#7F77DD",
    fontWeight: 700,
    marginTop: 4,
    marginBottom: 8
  },

  statSmallText: {
    fontSize: 13,
    color: "#94a3b8",
    fontWeight: 500
  },

  progressLabel: {
    fontSize: 13,
    fontWeight: 700,
    color: "#7F77DD",
    letterSpacing: 1,
    textTransform: "uppercase"
  },

  progressPercent: {
    fontSize: 28,
    fontWeight: 800,
    color: "#0f172a"
  },

  progressContainer: {
    width: "100%",
    height: 24,
    background: "#f1f5f9",
    borderRadius: 99,
    overflow: "hidden",
    border: "1px solid rgba(127, 119, 221, 0.1)"
  },

  progressDescription: {
    fontSize: 14,
    color: "#64748b",
    margin: "12px 0 0 0",
    fontWeight: 500
  },

  statusCard: {
    background: "linear-gradient(90deg, rgba(16, 185, 129, 0.08) 0%, rgba(16, 185, 129, 0.02) 100%)",
    border: "1.5px solid rgba(16, 185, 129, 0.2)",
    borderRadius: 12,
    padding: 24,
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between"
  },

  statusLabel: {
    fontSize: 14,
    fontWeight: 700,
    color: "#0f172a",
    marginBottom: 12
  },

  statusInfo: {
    display: "flex",
    flexDirection: "column",
    gap: 8
  },

  statusRow: {
    fontSize: 14,
    color: "#64748b",
    fontWeight: 500
  },

  input: {
    display: "block",
    width: "100%",
    padding: "16px 20px",
    borderRadius: 12,
    border: "2px solid #e2e8f0",
    fontSize: 16,
    marginBottom: 16,
    boxSizing: "border-box",
    fontFamily: "inherit",
    transition: "all 0.3s ease",
    outline: "none",
    backgroundColor: "#f8fafc"
  },

  btn: {
    width: "100%",
    padding: "18px 24px",
    border: "none",
    borderRadius: 12,
    fontSize: 17,
    fontWeight: 700,
    cursor: "pointer",
    transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
    letterSpacing: "0.5px"
  },

  btnPrimary: {
    background: "linear-gradient(135deg, #7F77DD 0%, #6366F1 100%)",
    color: "#fff",
    boxShadow: "0 4px 12px rgba(127, 119, 221, 0.3)"
  },

  btnSuccess: {
    background: "linear-gradient(135deg, #10B981 0%, #059669 100%)",
    color: "#fff",
    boxShadow: "0 4px 12px rgba(16, 185, 129, 0.3)"
  },

  withdrawnBox: {
    background: "linear-gradient(90deg, rgba(16, 185, 129, 0.1) 0%, rgba(16, 185, 129, 0.05) 100%)",
    border: "1.5px solid rgba(16, 185, 129, 0.3)",
    borderRadius: 12,
    padding: 24,
    display: "flex",
    alignItems: "center",
    marginTop: 24
  },

  failedBox: {
    background: "linear-gradient(90deg, rgba(216, 90, 48, 0.1) 0%, rgba(216, 90, 48, 0.05) 100%)",
    border: "1.5px solid rgba(216, 90, 48, 0.3)",
    borderRadius: 12,
    padding: 24,
    display: "flex",
    alignItems: "center",
    marginTop: 24
  },

  carouselSection: {
    marginTop: 60
  },

  carouselTitle: {
    fontSize: 24,
    fontWeight: 800,
    color: "#0f172a",
    marginBottom: 24,
    margin: "0 0 24px 0"
  },

  carouselContainer: {
    display: "flex",
    alignItems: "center",
    gap: 20,
    justifyContent: "center"
  },

  carouselArrow: {
    background: "linear-gradient(135deg, #7F77DD 0%, #6366F1 100%)",
    color: "#fff",
    border: "none",
    width: 48,
    height: 48,
    borderRadius: "50%",
    fontSize: 24,
    cursor: "pointer",
    transition: "all 0.3s ease",
    boxShadow: "0 4px 12px rgba(127, 119, 221, 0.3)",
    fontWeight: 700,
    flexShrink: 0
  },

  carouselTrack: {
    display: "flex",
    gap: 16,
    justifyContent: "center",
    flex: 1
  },

  carouselItem: {
    transition: "all 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
    cursor: "pointer"
  },

  carouselItemActive: {
    transform: "scale(1) translateY(0)",
    zIndex: 10
  },

  carouselItemLeft: {
    transform: "scale(0.7) translateX(80px) translateY(20px)",
    opacity: 0.6,
    zIndex: 5
  },

  carouselItemRight: {
    transform: "scale(0.7) translateX(-80px) translateY(20px)",
    opacity: 0.6,
    zIndex: 5
  },

  carouselCard: {
    background: "#fff",
    borderRadius: 16,
    padding: 32,
    boxShadow: "0 8px 24px rgba(127, 119, 221, 0.15)",
    border: "1px solid rgba(127, 119, 221, 0.2)",
    width: 340,
    textAlign: "center"
  },

  carouselCardTitle: {
    margin: "0 0 16px 0",
    fontSize: 22,
    fontWeight: 800,
    color: "#0f172a"
  },

  carouselCardInfo: {
    fontSize: 16,
    color: "#64748b",
    fontWeight: 600,
    lineHeight: 1.6
  },

  popupOverlay: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: "rgba(0, 0, 0, 0.4)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1000,
    animation: "slideDown 0.3s ease-out"
  },

  popup: {
    background: "#fff",
    borderRadius: 16,
    padding: 40,
    textAlign: "center",
    maxWidth: 400,
    boxShadow: "0 20px 60px rgba(0, 0, 0, 0.3)",
    animation: "slideDown 0.3s ease-out"
  },

  popupIcon: {
    fontSize: 48,
    marginBottom: 16
  },

  popupTitle: {
    fontSize: 24,
    fontWeight: 800,
    marginBottom: 12
  },

  popupMessage: {
    fontSize: 15,
    color: "#64748b",
    marginBottom: 24,
    lineHeight: 1.6
  },

  popupBtn: {
    width: "100%",
    padding: "12px 24px",
    background: "linear-gradient(135deg, #7F77DD 0%, #6366F1 100%)",
    color: "#fff",
    border: "none",
    borderRadius: 10,
    fontSize: 15,
    fontWeight: 700,
    cursor: "pointer",
    transition: "all 0.2s ease",
    boxShadow: "0 4px 12px rgba(127, 119, 221, 0.3)"
  }
};