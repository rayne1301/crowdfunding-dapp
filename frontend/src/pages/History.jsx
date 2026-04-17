// frontend/src/pages/History.jsx — Member 5
// Transaction History + Token Balance

import { useState, useEffect } from "react";
import { getCrowdfundingContract, getRewardTokenContract, fromWei } from "../utils/contracts";
import addresses from "../utils/addresses.json";
import CrowdfundingABI from "../utils/abi/Crowdfunding.json";
import { ethers } from "ethers";
 
const TYPE_CONFIG = {
  "Contribution":   { color: "#6C63FF", bg: "#6C63FF15", icon: "↑", label: "Contribution"   },
  "Withdrawal":     { color: "#10B981", bg: "#10B98115", icon: "⬇", label: "Withdrawal"     },
  "Refund":         { color: "#F59E0B", bg: "#F59E0B15", icon: "↩", label: "Refund"         },
  "Tokens Minted":  { color: "#EC4899", bg: "#EC489915", icon: "✦", label: "Tokens Minted"  },
};
 
export default function History({ user }) {
  const [tokenBalance, setTokenBalance] = useState("0");
  const [history, setHistory]           = useState([]);
  const [loading, setLoading]           = useState(false);
  const [error, setError]               = useState("");
  const [filter, setFilter]             = useState("All");
 
  useEffect(() => {
    loadTokenBalance();
    loadHistory();
  }, []);
 
  async function loadTokenBalance() {
    try {
      const contract = await getRewardTokenContract();
      const bal = await contract.getBalance(user.address);
      setTokenBalance(ethers.formatUnits(bal, 18));
    } catch (err) {
      console.error("Token balance error:", err);
    }
  }
 
  async function loadHistory() {
    try {
      setLoading(true);
      const provider = new ethers.BrowserProvider(window.ethereum);
      const contract = new ethers.Contract(addresses.Crowdfunding, CrowdfundingABI.abi, provider);
 
      const [funded, withdrawn, refunded, minted] = await Promise.all([
        contract.queryFilter(contract.filters.Funded(null, user.address)),
        contract.queryFilter(contract.filters.Withdrawn(null, user.address)),
        contract.queryFilter(contract.filters.Refunded(null, user.address)),
        contract.queryFilter(contract.filters.TokensMinted(null, user.address)),
      ]);
 
      const entries = [
        ...funded.map(e => ({
          type: "Contribution",
          campaignId: e.args.campaignId.toString(),
          amount: fromWei(e.args.amount) + " ETH",
          txHash: e.transactionHash,
          block: e.blockNumber,
        })),
        ...withdrawn.map(e => ({
          type: "Withdrawal",
          campaignId: e.args.campaignId.toString(),
          amount: fromWei(e.args.amount) + " ETH",
          txHash: e.transactionHash,
          block: e.blockNumber,
        })),
        ...refunded.map(e => ({
          type: "Refund",
          campaignId: e.args.campaignId.toString(),
          amount: fromWei(e.args.amount) + " ETH",
          txHash: e.transactionHash,
          block: e.blockNumber,
        })),
        ...minted.map(e => ({
          type: "Tokens Minted",
          campaignId: e.args.campaignId.toString(),
          amount: e.args.tokens.toString() + " BTK",
          txHash: e.transactionHash,
          block: e.blockNumber,
        })),
      ];
 
      entries.sort((a, b) => b.block - a.block);
      setHistory(entries);
    } catch (err) {
      setError("Failed to load history: " + err.message);
    } finally {
      setLoading(false);
    }
  }
 
  const filters = ["All", "Contribution", "Withdrawal", "Refund", "Tokens Minted"];
  const filtered = filter === "All" ? history : history.filter(h => h.type === filter);
 
  // Stats
  const totalContributed = history
    .filter(h => h.type === "Contribution")
    .reduce((sum, h) => sum + parseFloat(h.amount), 0)
    .toFixed(3);
 
  return (
    <div style={styles.page}>
 
      {/* ── Header ── */}
      <div style={styles.header}>
        <div>
          <h2 style={styles.pageTitle}>My Activity</h2>
          <p style={styles.pageSubtitle}>Track your contributions, rewards & history</p>
        </div>
        <button onClick={() => { loadTokenBalance(); loadHistory(); }} style={styles.refreshBtn}>
          ↻ Refresh
        </button>
      </div>
 
      {/* ── Stats Row ── */}
      <div style={styles.statsRow}>
        <div style={{ ...styles.statCard, borderTop: "3px solid #EC4899" }}>
          <div style={styles.statIcon}>✦</div>
          <div>
            <p style={styles.statLabel}>BonusToken Balance</p>
            <p style={{ ...styles.statValue, color: "#EC4899" }}>
              {Number(tokenBalance).toFixed(2)}
              <span style={styles.statUnit}> BTK</span>
            </p>
          </div>
        </div>
 
        <div style={{ ...styles.statCard, borderTop: "3px solid #6C63FF" }}>
          <div style={{ ...styles.statIcon, background: "#6C63FF15", color: "#6C63FF" }}>↑</div>
          <div>
            <p style={styles.statLabel}>Total Contributed</p>
            <p style={{ ...styles.statValue, color: "#6C63FF" }}>
              {totalContributed}
              <span style={styles.statUnit}> ETH</span>
            </p>
          </div>
        </div>
 
        <div style={{ ...styles.statCard, borderTop: "3px solid #10B981" }}>
          <div style={{ ...styles.statIcon, background: "#10B98115", color: "#10B981" }}>#</div>
          <div>
            <p style={styles.statLabel}>Total Transactions</p>
            <p style={{ ...styles.statValue, color: "#10B981" }}>
              {history.length}
              <span style={styles.statUnit}> txns</span>
            </p>
          </div>
        </div>
      </div>
 
      {/* ── Filter Tabs ── */}
      <div style={styles.filterRow}>
        {filters.map(f => (
          <button key={f} onClick={() => setFilter(f)}
            style={{ ...styles.filterBtn, ...(filter === f ? styles.filterBtnActive : {}) }}>
            {f}
            {f !== "All" && (
              <span style={{ ...styles.filterCount, background: filter === f ? TYPE_CONFIG[f]?.color + "30" : "#f0f0f0", color: filter === f ? TYPE_CONFIG[f]?.color : "#888" }}>
                {history.filter(h => h.type === f).length}
              </span>
            )}
            {f === "All" && (
              <span style={{ ...styles.filterCount, background: filter === "All" ? "#6C63FF20" : "#f0f0f0", color: filter === "All" ? "#6C63FF" : "#888" }}>
                {history.length}
              </span>
            )}
          </button>
        ))}
      </div>
 
      {/* ── Transaction List ── */}
      <div style={styles.card}>
        {loading && (
          <div style={styles.emptyState}>
            <div style={styles.spinner} />
            <p style={{ color: "#888", marginTop: 12 }}>Loading transactions...</p>
          </div>
        )}
 
        {error && (
          <div style={{ padding: 20, color: "#EF4444", fontSize: 13, textAlign: "center" }}>
            ⚠ {error}
          </div>
        )}
 
        {!loading && filtered.length === 0 && (
          <div style={styles.emptyState}>
            <div style={styles.emptyIcon}>📭</div>
            <p style={{ color: "#888", margin: "8px 0 4px", fontWeight: 500 }}>No transactions yet</p>
            <p style={{ color: "#bbb", fontSize: 13 }}>Your activity will appear here</p>
          </div>
        )}
 
        {!loading && filtered.length > 0 && (
          <table style={styles.table}>
            <thead>
              <tr>
                {["Type", "Campaign", "Amount", "Block", "Tx Hash"].map(h => (
                  <th key={h} style={styles.th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((row, i) => {
                const cfg = TYPE_CONFIG[row.type] || {};
                return (
                  <tr key={i} style={styles.tr}
                    onMouseEnter={e => e.currentTarget.style.background = "#fafafa"}
                    onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                    <td style={styles.td}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ ...styles.typeIcon, background: cfg.bg, color: cfg.color }}>
                          {cfg.icon}
                        </span>
                        <span style={{ ...styles.typeBadge, background: cfg.bg, color: cfg.color }}>
                          {row.type}
                        </span>
                      </div>
                    </td>
                    <td style={styles.td}>
                      <span style={styles.campaignId}>Campaign #{row.campaignId}</span>
                    </td>
                    <td style={styles.td}>
                      <span style={{ fontWeight: 600, color: "#1a1a1a" }}>{row.amount}</span>
                    </td>
                    <td style={styles.td}>
                      <span style={styles.blockNum}>#{row.block}</span>
                    </td>
                    <td style={styles.td}>
                      <span style={styles.txHash}
                        title={row.txHash}
                        onClick={() => navigator.clipboard.writeText(row.txHash)}
                        title="Click to copy">
                        {row.txHash.slice(0, 8)}...{row.txHash.slice(-6)}
                        <span style={{ marginLeft: 4, opacity: 0.5, fontSize: 10 }}>⎘</span>
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
 
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
 
const styles = {
  page: {
    maxWidth: 900, margin: "0 auto", padding: "24px 20px",
    fontFamily: "'Segoe UI', sans-serif",
  },
  header: {
    display: "flex", justifyContent: "space-between", alignItems: "flex-start",
    marginBottom: 24,
  },
  pageTitle: {
    margin: 0, fontSize: 26, fontWeight: 700, color: "#1a1a1a", letterSpacing: "-0.5px",
  },
  pageSubtitle: {
    margin: "4px 0 0", fontSize: 14, color: "#888",
  },
  refreshBtn: {
    padding: "8px 16px", background: "#f5f5f5", border: "1px solid #e8e8e8",
    borderRadius: 8, fontSize: 13, cursor: "pointer", color: "#555",
    fontWeight: 500, transition: "all 0.2s",
  },
  statsRow: {
    display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginBottom: 24,
  },
  statCard: {
    background: "#fff", border: "1px solid #f0f0f0", borderRadius: 12,
    padding: "18px 20px", display: "flex", alignItems: "center", gap: 14,
    boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
  },
  statIcon: {
    width: 44, height: 44, borderRadius: 10, background: "#EC489915",
    display: "flex", alignItems: "center", justifyContent: "center",
    fontSize: 18, color: "#EC4899", flexShrink: 0,
  },
  statLabel: {
    margin: 0, fontSize: 12, color: "#888", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.5px",
  },
  statValue: {
    margin: "4px 0 0", fontSize: 24, fontWeight: 700, lineHeight: 1,
  },
  statUnit: {
    fontSize: 13, fontWeight: 500, opacity: 0.7,
  },
  filterRow: {
    display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap",
  },
  filterBtn: {
    padding: "7px 14px", background: "#f5f5f5", border: "1.5px solid transparent",
    borderRadius: 99, fontSize: 13, cursor: "pointer", color: "#555",
    fontWeight: 500, display: "flex", alignItems: "center", gap: 6, transition: "all 0.15s",
  },
  filterBtnActive: {
    background: "#fff", border: "1.5px solid #6C63FF", color: "#6C63FF",
    boxShadow: "0 2px 8px rgba(108,99,255,0.12)",
  },
  filterCount: {
    fontSize: 11, padding: "1px 6px", borderRadius: 99, fontWeight: 600,
  },
  card: {
    background: "#fff", border: "1px solid #f0f0f0", borderRadius: 14,
    overflow: "hidden", boxShadow: "0 2px 12px rgba(0,0,0,0.05)",
  },
  emptyState: {
    padding: "60px 20px", textAlign: "center",
  },
  emptyIcon: {
    fontSize: 40, marginBottom: 8,
  },
  spinner: {
    width: 32, height: 32, border: "3px solid #f0f0f0",
    borderTop: "3px solid #6C63FF", borderRadius: "50%",
    animation: "spin 0.8s linear infinite", margin: "0 auto",
  },
  table: {
    width: "100%", borderCollapse: "collapse",
  },
  th: {
    padding: "12px 16px", textAlign: "left", fontSize: 11,
    color: "#999", fontWeight: 600, textTransform: "uppercase",
    letterSpacing: "0.6px", borderBottom: "1px solid #f5f5f5",
    background: "#fafafa",
  },
  tr: {
    borderBottom: "1px solid #f9f9f9", transition: "background 0.15s", cursor: "default",
  },
  td: {
    padding: "14px 16px", fontSize: 13, verticalAlign: "middle",
  },
  typeIcon: {
    width: 28, height: 28, borderRadius: 8,
    display: "flex", alignItems: "center", justifyContent: "center",
    fontSize: 13, fontWeight: 700, flexShrink: 0,
  },
  typeBadge: {
    padding: "3px 10px", borderRadius: 99, fontSize: 12, fontWeight: 600,
  },
  campaignId: {
    background: "#f5f5f5", padding: "3px 10px", borderRadius: 99,
    fontSize: 12, color: "#555", fontWeight: 500,
  },
  blockNum: {
    fontFamily: "monospace", fontSize: 12, color: "#999",
    background: "#f9f9f9", padding: "3px 8px", borderRadius: 6,
  },
  txHash: {
    fontFamily: "monospace", fontSize: 12, color: "#6C63FF",
    cursor: "pointer", padding: "3px 8px", borderRadius: 6,
    background: "#6C63FF08", display: "inline-flex", alignItems: "center",
  },
};