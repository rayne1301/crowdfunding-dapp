// frontend/src/App.jsx — Shared router (Member 1 sets this up)
// Simple page router — no react-router needed

import { useState } from "react";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Campaign from "./pages/Campaign";
import Refund from "./pages/Refund";
import History from "./pages/History";

export default function App() {
  const [user, setUser]               = useState(null);   // { address, username }
  const [page, setPage]               = useState("dashboard");
  const [selectedCampaign, setSelectedCampaign] = useState(null);

  function handleLogin(userData) {
    setUser(userData);
    setPage("dashboard");
  }

  function handleSelectCampaign(campaign) {
    setSelectedCampaign(campaign);
    setPage("campaign");
  }

  if (!user) return <Login onLogin={handleLogin} />;

  return (
    <div style={{ minHeight: "100vh", background: "#f8f8fc", fontFamily: "sans-serif" }}>
      {/* Nav */}
      <nav style={{ background: "#fff", borderBottom: "1px solid #eee", padding: "12px 24px", display: "flex", gap: 24, alignItems: "center" }}>
        <span style={{ fontWeight: 600, color: "#7F77DD", fontSize: 18 }}>CrowdChain</span>
        {[
          { label: "Campaigns", page: "dashboard" },
          { label: "Refunds",   page: "refund"    },
          { label: "History",   page: "history"   },
        ].map(item => (
          <button key={item.page} onClick={() => setPage(item.page)}
            style={{ background: "none", border: "none", cursor: "pointer",
              color: page === item.page ? "#7F77DD" : "#555",
              fontWeight: page === item.page ? 600 : 400, fontSize: 14 }}>
            {item.label}
          </button>
        ))}
        <span style={{ marginLeft: "auto", fontSize: 13, color: "#888" }}>
          {user.username} · {user.address?.slice(0,6)}...{user.address?.slice(-4)}
        </span>
      </nav>

      {/* Pages */}
      <main style={{ padding: "24px 16px" }}>
        {page === "dashboard" && (
          <Dashboard user={user} onSelectCampaign={handleSelectCampaign} />
        )}
        {page === "campaign" && selectedCampaign && (
          <Campaign campaign={selectedCampaign} user={user} onBack={() => setPage("dashboard")} />
        )}
        {page === "refund" && <Refund user={user} />}
        {page === "history" && <History user={user} />}
      </main>
    </div>
  );
}
