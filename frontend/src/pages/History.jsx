// frontend/src/pages/History.jsx — Member 5
// Transaction History + Token Balance

import { useState, useEffect } from "react";
import { getCrowdfundingContract, getRewardTokenContract, fromWei } from "../utils/contracts";
import addresses from "../utils/addresses.json";
import CrowdfundingABI from "../utils/abi/Crowdfunding.json";
import { ethers } from "ethers";

export default function History({ user }) {
  const [tokenBalance, setTokenBalance] = useState("0");
  const [history, setHistory]           = useState([]);
  const [loading, setLoading]           = useState(false);
  const [error, setError]               = useState("");

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

      // Listen to all relevant past events for this user
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
          color: "#7F77DD",
        })),
        ...withdrawn.map(e => ({
          type: "Withdrawal",
          campaignId: e.args.campaignId.toString(),
          amount: fromWei(e.args.amount) + " ETH",
          txHash: e.transactionHash,
          block: e.blockNumber,
          color: "#1D9E75",
        })),
        ...refunded.map(e => ({
          type: "Refund",
          campaignId: e.args.campaignId.toString(),
          amount: fromWei(e.args.amount) + " ETH",
          txHash: e.transactionHash,
          block: e.blockNumber,
          color: "#D85A30",
        })),
        ...minted.map(e => ({
          type: "Tokens Minted",
          campaignId: e.args.campaignId.toString(),
          amount: e.args.tokens.toString() + " CRW",
          txHash: e.transactionHash,
          block: e.blockNumber,
          color: "#BA7517",
        })),
      ];

      // Sort by block number descending (newest first)
      entries.sort((a, b) => b.block - a.block);
      setHistory(entries);
    } catch (err) {
      setError("Failed to load history: " + err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ maxWidth: 800, margin: "0 auto", padding: 24 }}>
      {/* Token Balance Card */}
      <div style={{ ...cardStyle, marginBottom: 24, display: "flex", alignItems: "center", gap: 20 }}>
        <div style={{ width: 56, height: 56, borderRadius: "50%", background: "#FAEEDA", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24 }}>
          🪙
        </div>
        <div>
          <p style={{ margin: 0, fontSize: 13, color: "#888" }}>Your CrowdReward Token Balance</p>
          <p style={{ margin: "4px 0 0", fontSize: 28, fontWeight: 600, color: "#BA7517" }}>
            {Number(tokenBalance).toFixed(2)} <span style={{ fontSize: 14, color: "#888" }}>CRW</span>
          </p>
        </div>
      </div>

      {/* Transaction History Table */}
      <h3 style={{ marginBottom: 12 }}>Transaction History</h3>
      {loading && <p>Loading history...</p>}
      {error   && <p style={{ color: "#D85A30" }}>{error}</p>}

      {!loading && history.length === 0 && (
        <div style={{ ...cardStyle, textAlign: "center", color: "#888", padding: 40 }}>
          No transactions yet.
        </div>
      )}

      {history.length > 0 && (
        <div style={cardStyle}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: "1px solid #eee" }}>
                {["Type", "Campaign ID", "Amount", "Tx Hash"].map(h => (
                  <th key={h} style={{ padding: "8px 10px", textAlign: "left", color: "#888", fontWeight: 500 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {history.map((row, i) => (
                <tr key={i} style={{ borderBottom: "1px solid #f5f5f5" }}>
                  <td style={{ padding: "10px" }}>
                    <span style={{ background: row.color + "22", color: row.color, padding: "2px 8px", borderRadius: 20, fontSize: 12, fontWeight: 500 }}>
                      {row.type}
                    </span>
                  </td>
                  <td style={{ padding: "10px", color: "#555" }}>#{row.campaignId}</td>
                  <td style={{ padding: "10px", fontWeight: 500 }}>{row.amount}</td>
                  <td style={{ padding: "10px" }}>
                    <code style={{ fontSize: 11, color: "#999" }}>
                      {row.txHash.slice(0, 10)}...{row.txHash.slice(-6)}
                    </code>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

const cardStyle = { background: "#fff", border: "1px solid #eee", borderRadius: 12, padding: 20 };
