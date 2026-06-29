import { useEffect, useState, useMemo } from "react";
import { collection, getDocs, doc, getDoc } from "firebase/firestore";
import { 
  TrendingUp, TrendingDown, DollarSign, Users, CheckCircle2, 
  XCircle, Clock, BarChart3, PieChart, Filter, Calendar, AlertCircle
} from "lucide-react";

import { db } from "../firebase";
import { Sidebar } from "../components/Sidebar";
import { Card } from "../components/Card";
import { Select } from "../components/Input";

function Insights() {
  const [loading, setLoading] = useState(true);
  const [usersList, setUsersList] = useState([]);
  const [claimsList, setClaimsList] = useState([]);
  const [role, setRole] = useState("L1");
  const [currentUid, setCurrentUid] = useState("");

  // Cascading filter states
  const [selectedL2, setSelectedL2] = useState("ALL");
  const [selectedL1, setSelectedL1] = useState("ALL");
  const [selectedL0, setSelectedL0] = useState("ALL");

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const uid = localStorage.getItem("uid") || "";
      const userRole = localStorage.getItem("role") || "L1";
      setCurrentUid(uid);
      setRole(userRole);

      if (userRole === "L2") {
        setSelectedL2(uid);
      } else if (userRole === "L1") {
        setSelectedL1(uid);
      } else if (userRole === "L0") {
        setSelectedL0(uid);
      }

      // Fetch all users
      const usersSnap = await getDocs(collection(db, "user"));
      const usersData = [];
      usersSnap.forEach((d) => {
        usersData.push({ id: d.id, ...d.data() });
      });
      setUsersList(usersData);

      // Fetch all travel requests & misc claims
      const travelSnap = await getDocs(collection(db, "travelRequests"));
      const miscSnap = await getDocs(collection(db, "miscClaims"));
      const claimsData = [];

      travelSnap.forEach((d) => {
        claimsData.push({ id: d.id, claimCollection: "travel", ...d.data() });
      });
      miscSnap.forEach((d) => {
        claimsData.push({ id: d.id, claimCollection: "misc", ...d.data() });
      });

      setClaimsList(claimsData);
    } catch (error) {
      console.error("Error fetching insights data:", error);
    } finally {
      setLoading(false);
    }
  };

  // Separate hierarchy users
  const l2Managers = useMemo(() => {
    return usersList.filter((u) => u.role === "L2");
  }, [usersList]);

  const l1Managers = useMemo(() => {
    if (role === "L2" || (role === "MASTER" && selectedL2 !== "ALL")) {
      const targetL2Id = role === "L2" ? currentUid : selectedL2;
      return usersList.filter(
        (u) => u.role === "L1" && (u.managerId === targetL2Id || u.createdBy === "L2")
      );
    }
    return usersList.filter((u) => u.role === "L1");
  }, [usersList, role, currentUid, selectedL2]);

  const l0Engineers = useMemo(() => {
    if (role === "L0") {
      return usersList.filter((u) => u.id === currentUid);
    }
    if (role === "L1" || selectedL1 !== "ALL") {
      const targetL1Id = role === "L1" ? currentUid : selectedL1;
      return usersList.filter((u) => u.role === "L0" && u.managerId === targetL1Id);
    }
    if (role === "L2" || (role === "MASTER" && selectedL2 !== "ALL")) {
      const allowedL1Ids = l1Managers.map((l1) => l1.id);
      return usersList.filter((u) => u.role === "L0" && allowedL1Ids.includes(u.managerId));
    }
    return usersList.filter((u) => u.role === "L0");
  }, [usersList, role, currentUid, selectedL1, selectedL2, l1Managers]);

  // Handle dropdown resets when higher level changes
  const handleL2Change = (val) => {
    setSelectedL2(val);
    setSelectedL1("ALL");
    setSelectedL0("ALL");
  };

  const handleL1Change = (val) => {
    setSelectedL1(val);
    setSelectedL0("ALL");
  };

  // Filter claims based on selected scope
  const filteredClaims = useMemo(() => {
    let targetL0Ids = [];

    if (role === "L0") {
      targetL0Ids = [currentUid];
    } else if (selectedL0 !== "ALL") {
      targetL0Ids = [selectedL0];
    } else if (selectedL1 !== "ALL") {
      targetL0Ids = usersList
        .filter((u) => u.role === "L0" && u.managerId === selectedL1)
        .map((u) => u.id);
    } else if (role === "L1") {
      targetL0Ids = usersList
        .filter((u) => u.role === "L0" && u.managerId === currentUid)
        .map((u) => u.id);
    } else if (selectedL2 !== "ALL" || role === "L2") {
      const targetL2 = role === "L2" ? currentUid : selectedL2;
      const subL1Ids = usersList
        .filter((u) => u.role === "L1" && (u.managerId === targetL2 || u.createdBy === "L2"))
        .map((u) => u.id);
      targetL0Ids = usersList
        .filter((u) => u.role === "L0" && subL1Ids.includes(u.managerId))
        .map((u) => u.id);
    } else {
      // MASTER all scope
      return claimsList;
    }

    return claimsList.filter((c) => targetL0Ids.includes(c.employeeUid));
  }, [claimsList, selectedL0, selectedL1, selectedL2, role, currentUid, usersList]);

  // Parse claim dates safely
  const getClaimDate = (c) => {
    if (c.createdAt?.seconds) return new Date(c.createdAt.seconds * 1000);
    if (c.startTime?.seconds) return new Date(c.startTime.seconds * 1000);
    if (typeof c.createdAt === "string") return new Date(c.createdAt);
    if (typeof c.startTime === "string") return new Date(c.startTime);
    return new Date();
  };

  // Calculate Month-over-Month growth & rich metrics
  const analytics = useMemo(() => {
    const now = new Date();
    const currentMonthYear = `${now.getFullYear()}-${now.getMonth()}`;
    
    const prevMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const prevMonthYear = `${prevMonthDate.getFullYear()}-${prevMonthDate.getMonth()}`;

    let currentMonthTotal = 0;
    let prevMonthTotal = 0;
    let currentMonthCount = 0;
    let prevMonthCount = 0;

    let totalAmount = 0;
    let approvedAmount = 0;
    let approvedCount = 0;
    let rejectedCount = 0;
    let pendingCount = 0;

    const categoryMap = {};
    const typeMap = { Travel: { count: 0, amount: 0 }, Miscellaneous: { count: 0, amount: 0 } };

    filteredClaims.forEach((c) => {
      const amt = parseFloat(c.claimAmount || 0);
      totalAmount += amt;

      const cDate = getClaimDate(c);
      const cMonthYear = `${cDate.getFullYear()}-${cDate.getMonth()}`;

      if (cMonthYear === currentMonthYear) {
        currentMonthTotal += amt;
        currentMonthCount += 1;
      } else if (cMonthYear === prevMonthYear) {
        prevMonthTotal += amt;
        prevMonthCount += 1;
      }

      // Status aggregation
      const status = (c.requestStatus || "").toUpperCase();
      if (status.includes("APPROVED")) {
        approvedAmount += amt;
        approvedCount += 1;
      } else if (status.includes("REJECTED")) {
        rejectedCount += 1;
      } else {
        pendingCount += 1;
      }

      // Category aggregation
      const cat = c.claimType === "MISCELLANEOUS" ? (c.category || "Misc Expense") : (c.category || c.purpose || "Travel Expense");
      categoryMap[cat] = (categoryMap[cat] || 0) + amt;

      // Type aggregation
      if (c.claimType === "MISCELLANEOUS") {
        typeMap.Miscellaneous.count += 1;
        typeMap.Miscellaneous.amount += amt;
      } else {
        typeMap.Travel.count += 1;
        typeMap.Travel.amount += amt;
      }
    });

    const diffAmount = currentMonthTotal - prevMonthTotal;
    let percentChange = 0;
    if (prevMonthTotal > 0) {
      percentChange = ((diffAmount / prevMonthTotal) * 100).toFixed(1);
    } else if (currentMonthTotal > 0) {
      percentChange = 100.0;
    }

    const totalResolved = approvedCount + rejectedCount;
    const approvalRate = totalResolved > 0 ? ((approvedCount / totalResolved) * 100).toFixed(1) : 0;

    // Top categories sorted
    const sortedCategories = Object.entries(categoryMap)
      .map(([name, amount]) => ({ name, amount, percentage: totalAmount > 0 ? ((amount / totalAmount) * 100).toFixed(1) : 0 }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5);

    return {
      currentMonthTotal: currentMonthTotal.toFixed(2),
      prevMonthTotal: prevMonthTotal.toFixed(2),
      diffAmount: diffAmount.toFixed(2),
      percentChange,
      isIncrease: diffAmount >= 0,
      totalCount: filteredClaims.length,
      totalAmount: totalAmount.toFixed(2),
      approvedAmount: approvedAmount.toFixed(2),
      approvedCount,
      rejectedCount,
      pendingCount,
      approvalRate,
      avgClaimValue: filteredClaims.length > 0 ? (totalAmount / filteredClaims.length).toFixed(2) : 0,
      sortedCategories,
      typeMap
    };
  }, [filteredClaims]);

  const menuItems = [
    { text: "Dashboard", path: role === "MASTER" ? "/master" : role === "L2" ? "/l2" : role === "L1" ? "/l1" : "/l0", icon: <BarChart3 size={20} /> },
  ];

  return (
    <div className="layout-container">
      <Sidebar menuItems={menuItems} />

      <div className="main-content animate-fade-in">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "20px", marginBottom: "24px" }}>
          <div>
            <h1 className="page-title">Engineer Claims Analytics</h1>
            <p className="page-subtitle">Granular MoM claim growth & financial insights across L0 field engineers.</p>
          </div>

          <div style={{ display: "flex", gap: "12px", alignItems: "center", background: "rgba(255, 255, 255, 0.03)", padding: "8px 16px", borderRadius: "12px", border: "1px solid var(--panel-border)" }}>
            <Filter size={18} style={{ color: "var(--primary-color)" }} />
            <span style={{ fontSize: "0.85rem", fontWeight: "600", color: "var(--text-secondary)", textTransform: "uppercase" }}>Scope:</span>
            <span className="badge badge-info">{filteredClaims.length} Claims Analysed</span>
          </div>
        </div>

        {/* CASCADING FILTER BAR OR L0 SCOPE */}
        {role === "L0" ? (
          <div className="glass-panel" style={{ padding: "20px", marginBottom: "32px", background: "linear-gradient(145deg, rgba(99, 102, 241, 0.08) 0%, rgba(15, 23, 42, 0.4) 100%)", borderLeft: "4px solid var(--primary-color)" }}>
            <h3 style={{ fontSize: "1.05rem", margin: 0, display: "flex", alignItems: "center", gap: "8px", color: "var(--text-primary)" }}>
              <Users size={18} style={{ color: "#818cf8" }} /> Personal Scope: Viewing Your Own Expense & Claim Analytics
            </h3>
          </div>
        ) : (
          <div className="glass-panel" style={{ padding: "24px", marginBottom: "32px", background: "linear-gradient(145deg, rgba(99, 102, 241, 0.08) 0%, rgba(15, 23, 42, 0.4) 100%)" }}>
            <h3 style={{ fontSize: "1.05rem", marginBottom: "16px", display: "flex", alignItems: "center", gap: "8px", color: "var(--text-primary)" }}>
              <Users size={18} style={{ color: "#818cf8" }} /> Select Hierarchy Scope to Review Insights
            </h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "16px" }}>
              
              {/* L2 Selector (Only visible to MASTER) */}
              {role === "MASTER" && (
                <div>
                  <label style={{ display: "block", fontSize: "0.85rem", color: "var(--text-secondary)", marginBottom: "6px" }}>L2 Manager</label>
                  <select
                    value={selectedL2}
                    onChange={(e) => handleL2Change(e.target.value)}
                    style={{ width: "100%", padding: "10px 14px", borderRadius: "8px", border: "1px solid var(--panel-border)", background: "var(--bg-color)", color: "var(--text-primary)", outline: "none", cursor: "pointer" }}
                  >
                    <option value="ALL">All L2 Managers</option>
                    {l2Managers.map((m) => (
                      <option key={m.id} value={m.id}>{m.name} ({m.employeeId || "L2"})</option>
                    ))}
                  </select>
                </div>
              )}

              {/* L1 Selector (Visible to MASTER and L2) */}
              {(role === "MASTER" || role === "L2") && (
                <div>
                  <label style={{ display: "block", fontSize: "0.85rem", color: "var(--text-secondary)", marginBottom: "6px" }}>L1 Supervisor</label>
                  <select
                    value={selectedL1}
                    onChange={(e) => handleL1Change(e.target.value)}
                    style={{ width: "100%", padding: "10px 14px", borderRadius: "8px", border: "1px solid var(--panel-border)", background: "var(--bg-color)", color: "var(--text-primary)", outline: "none", cursor: "pointer" }}
                  >
                    <option value="ALL">All L1 Engineers</option>
                    {l1Managers.map((m) => (
                      <option key={m.id} value={m.id}>{m.name} ({m.employeeId || "L1"})</option>
                    ))}
                  </select>
                </div>
              )}

              {/* L0 Engineer Selector (Visible to ALL roles) */}
              <div>
                <label style={{ display: "block", fontSize: "0.85rem", color: "var(--text-secondary)", marginBottom: "6px" }}>L0 Field Engineer</label>
                <select
                  value={selectedL0}
                  onChange={(e) => setSelectedL0(e.target.value)}
                  style={{ width: "100%", padding: "10px 14px", borderRadius: "8px", border: "1px solid var(--panel-border)", background: "var(--bg-color)", color: "var(--text-primary)", outline: "none", cursor: "pointer" }}
                >
                  <option value="ALL">All Assigned L0 Engineers</option>
                  {l0Engineers.map((e) => (
                    <option key={e.id} value={e.id}>{e.name} ({e.employeeId || "L0"})</option>
                  ))}
                </select>
              </div>

            </div>
          </div>
        )}

        {loading ? (
          <div className="glass-panel" style={{ padding: "60px", textAlign: "center", color: "var(--text-muted)" }}>
            <p>Analyzing claims and generating metrics...</p>
          </div>
        ) : (
          <>
            {/* WOW HERO SECTION: MoM CLAIM INCREASE INSIGHT */}
            <div className="glass-panel" style={{ padding: "30px", marginBottom: "32px", position: "relative", overflow: "hidden", border: "1px solid rgba(129, 140, 248, 0.3)", boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.4)" }}>
              <div style={{ position: "absolute", top: "-50px", right: "-50px", width: "200px", height: "200px", background: analytics.isIncrease ? "radial-gradient(circle, rgba(239, 68, 68, 0.15) 0%, transparent 70%)" : "radial-gradient(circle, rgba(16, 185, 129, 0.15) 0%, transparent 70%)", borderRadius: "50%", zIndex: 0 }} />
              
              <div style={{ position: "relative", zIndex: 1, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "24px" }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
                    <Calendar size={18} style={{ color: "#a5b4fc" }} />
                    <span style={{ fontSize: "0.9rem", color: "var(--text-secondary)", fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.05em" }}>Month-over-Month (MoM) Growth Analysis</span>
                  </div>
                  <h2 style={{ fontSize: "2.4rem", fontWeight: "700", margin: "0 0 8px 0", display: "flex", alignItems: "center", gap: "12px" }}>
                    ₹{analytics.currentMonthTotal}
                    <span style={{ 
                      fontSize: "1.1rem", 
                      padding: "4px 12px", 
                      borderRadius: "20px", 
                      background: analytics.isIncrease ? "rgba(239, 68, 68, 0.15)" : "rgba(16, 185, 129, 0.15)", 
                      color: analytics.isIncrease ? "#fca5a5" : "#6ee7b7",
                      border: `1px solid ${analytics.isIncrease ? "rgba(239, 68, 68, 0.3)" : "rgba(16, 185, 129, 0.3)"}`,
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "6px"
                    }}>
                      {analytics.isIncrease ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                      {analytics.isIncrease ? "+" : ""}{analytics.percentChange}% vs last month
                    </span>
                  </h2>
                  <p className="text-secondary" style={{ margin: 0, fontSize: "0.95rem" }}>
                    Claims volume {analytics.isIncrease ? "increased" : "decreased"} by <strong style={{ color: "var(--text-primary)" }}>₹{Math.abs(analytics.diffAmount)}</strong> compared to the previous month (₹{analytics.prevMonthTotal}).
                  </p>
                </div>

                <div style={{ display: "flex", gap: "30px", borderLeft: "1px solid var(--panel-border)", paddingLeft: "30px" }}>
                  <div>
                    <span style={{ fontSize: "0.8rem", color: "var(--text-muted)", display: "block", textTransform: "uppercase" }}>Avg Claim Value</span>
                    <strong style={{ fontSize: "1.4rem", color: "#818cf8" }}>₹{analytics.avgClaimValue}</strong>
                  </div>
                  <div>
                    <span style={{ fontSize: "0.8rem", color: "var(--text-muted)", display: "block", textTransform: "uppercase" }}>Approval Rate</span>
                    <strong style={{ fontSize: "1.4rem", color: "#34d399" }}>{analytics.approvalRate}%</strong>
                  </div>
                </div>
              </div>
            </div>

            {/* KEY METRIC CARDS */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "20px", marginBottom: "32px" }}>
              <div className="glass-panel" style={{ padding: "20px", borderLeft: "4px solid #818cf8" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                  <span style={{ fontSize: "0.85rem", color: "var(--text-secondary)", fontWeight: "500" }}>Total Claims Value</span>
                  <DollarSign size={20} style={{ color: "#818cf8" }} />
                </div>
                <h3 style={{ fontSize: "1.8rem", margin: 0 }}>₹{analytics.totalAmount}</h3>
                <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>Across {analytics.totalCount} total requests</span>
              </div>

              <div className="glass-panel" style={{ padding: "20px", borderLeft: "4px solid #10b981" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                  <span style={{ fontSize: "0.85rem", color: "var(--text-secondary)", fontWeight: "500" }}>Approved Value</span>
                  <CheckCircle2 size={20} style={{ color: "#10b981" }} />
                </div>
                <h3 style={{ fontSize: "1.8rem", margin: 0, color: "#34d399" }}>₹{analytics.approvedAmount}</h3>
                <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>{analytics.approvedCount} requests approved</span>
              </div>

              <div className="glass-panel" style={{ padding: "20px", borderLeft: "4px solid #f59e0b" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                  <span style={{ fontSize: "0.85rem", color: "var(--text-secondary)", fontWeight: "500" }}>Pending Action</span>
                  <Clock size={20} style={{ color: "#f59e0b" }} />
                </div>
                <h3 style={{ fontSize: "1.8rem", margin: 0, color: "#fbbf24" }}>{analytics.pendingCount}</h3>
                <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>Awaiting L1/L2 verification</span>
              </div>

              <div className="glass-panel" style={{ padding: "20px", borderLeft: "4px solid #ef4444" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                  <span style={{ fontSize: "0.85rem", color: "var(--text-secondary)", fontWeight: "500" }}>Rejected Claims</span>
                  <XCircle size={20} style={{ color: "#ef4444" }} />
                </div>
                <h3 style={{ fontSize: "1.8rem", margin: 0, color: "#f87171" }}>{analytics.rejectedCount}</h3>
                <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>Did not meet compliance</span>
              </div>
            </div>

            {/* CHARTS & BREAKDOWNS SECTION */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(400px, 1fr))", gap: "24px", marginBottom: "32px" }}>
              
              {/* CATEGORY BREAKDOWN */}
              <div className="glass-panel" style={{ padding: "24px" }}>
                <h3 style={{ fontSize: "1.1rem", marginBottom: "20px", display: "flex", alignItems: "center", gap: "8px" }}>
                  <PieChart size={18} style={{ color: "#818cf8" }} /> Top Expense Categories
                </h3>
                {analytics.sortedCategories.length === 0 ? (
                  <p className="text-muted" style={{ textAlign: "center", padding: "20px 0" }}>No expense data available</p>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                    {analytics.sortedCategories.map((cat, idx) => (
                      <div key={idx}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px", fontSize: "0.9rem" }}>
                          <span style={{ fontWeight: "500" }}>{cat.name}</span>
                          <span className="text-secondary">₹{cat.amount.toFixed(2)} ({cat.percentage}%)</span>
                        </div>
                        <div style={{ width: "100%", height: "8px", background: "rgba(255, 255, 255, 0.05)", borderRadius: "4px", overflow: "hidden" }}>
                          <div style={{ 
                            width: `${cat.percentage}%`, 
                            height: "100%", 
                            background: idx === 0 ? "linear-gradient(to right, #6366f1, #a5b4fc)" : idx === 1 ? "#34d399" : idx === 2 ? "#fbbf24" : "#94a3b8",
                            transition: "width 0.5s ease" 
                          }} />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* CLAIM TYPE DISTRIBUTION */}
              <div className="glass-panel" style={{ padding: "24px", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                <div>
                  <h3 style={{ fontSize: "1.1rem", marginBottom: "20px", display: "flex", alignItems: "center", gap: "8px" }}>
                    <BarChart3 size={18} style={{ color: "#34d399" }} /> Travel vs Miscellaneous Claims
                  </h3>
                  
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "20px" }}>
                    <div style={{ padding: "16px", borderRadius: "12px", background: "rgba(99, 102, 241, 0.05)", border: "1px solid rgba(99, 102, 241, 0.2)" }}>
                      <span style={{ fontSize: "0.8rem", color: "var(--text-secondary)", display: "block" }}>Travel Requests</span>
                      <strong style={{ fontSize: "1.4rem", color: "#818cf8", display: "block", margin: "4px 0" }}>₹{analytics.typeMap.Travel.amount.toFixed(2)}</strong>
                      <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>{analytics.typeMap.Travel.count} submissions</span>
                    </div>

                    <div style={{ padding: "16px", borderRadius: "12px", background: "rgba(16, 185, 129, 0.05)", border: "1px solid rgba(16, 185, 129, 0.2)" }}>
                      <span style={{ fontSize: "0.8rem", color: "var(--text-secondary)", display: "block" }}>Misc Claims</span>
                      <strong style={{ fontSize: "1.4rem", color: "#34d399", display: "block", margin: "4px 0" }}>₹{analytics.typeMap.Miscellaneous.amount.toFixed(2)}</strong>
                      <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>{analytics.typeMap.Miscellaneous.count} submissions</span>
                    </div>
                  </div>
                </div>

                <div style={{ padding: "12px", borderRadius: "8px", background: "rgba(255, 255, 255, 0.02)", border: "1px dashed var(--panel-border)", fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                  💡 <strong>Pro Tip:</strong> High miscellaneous expense percentages should be audited by L1 supervisors for compliance.
                </div>
              </div>

            </div>

            {/* RECENT CLAIMS SUMMARY TABLE */}
            <div className="glass-panel" style={{ padding: "24px" }}>
              <h3 style={{ fontSize: "1.1rem", marginBottom: "16px" }}>Recent Claim Submissions in Selected Scope</h3>
              {filteredClaims.length === 0 ? (
                <p className="text-muted" style={{ textAlign: "center", padding: "20px 0" }}>No claims found for the selected filter.</p>
              ) : (
                <div style={{ overflowX: "auto" }}>
                  <table className="glass-table">
                    <thead>
                      <tr>
                        <th>Claim ID</th>
                        <th>Engineer</th>
                        <th>Type / Category</th>
                        <th>Date</th>
                        <th>Amount</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredClaims.slice(0, 8).map((c) => {
                        const dateStr = getClaimDate(c).toLocaleDateString();
                        const isApproved = (c.requestStatus || "").includes("APPROVED");
                        const isRejected = (c.requestStatus || "").includes("REJECTED");
                        return (
                          <tr key={c.id}>
                            <td style={{ fontWeight: "500", color: "#818cf8" }}>{c.travelId || c.claimId || c.id.slice(0, 6)}</td>
                            <td>{c.employeeName || "Unknown"}</td>
                            <td>{c.claimType === "MISCELLANEOUS" ? `Misc: ${c.category}` : `Travel: ${c.popName || c.purpose}`}</td>
                            <td>{dateStr}</td>
                            <td style={{ fontWeight: "600" }}>₹{c.claimAmount}</td>
                            <td>
                              <span className={`badge ${isApproved ? "badge-success" : isRejected ? "badge-danger" : "badge-pending"}`}>
                                {c.requestStatus ? c.requestStatus.replace(/_/g, " ") : "PENDING"}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default Insights;
