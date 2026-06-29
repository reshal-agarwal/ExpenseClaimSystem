import { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { ShieldAlert, FileSpreadsheet, AlertTriangle, CheckCircle, RotateCcw, LayoutDashboard, UserPlus, Users, User } from "lucide-react";
import * as XLSX from "xlsx";

import { db } from "../firebase";
import { Sidebar } from "../components/Sidebar";
import { Button } from "../components/Button";
import { useToast } from "../context/ToastContext";

function SystemLogs() {
  const [logs, setLogs] = useState([]);
  const [filterType, setFilterType] = useState("ALL");
  const [searchTerm, setSearchTerm] = useState("");
  const { showToast } = useToast();

  useEffect(() => {
    fetchAuditLogs();
  }, []);

  const fetchAuditLogs = async () => {
    try {
      const travelSnap = await getDocs(collection(db, "travelRequests"));
      const miscSnap = await getDocs(collection(db, "miscClaims"));
      
      const auditList = [];

      travelSnap.forEach((doc) => {
        const data = doc.data();
        if (data.isFlagged) {
          auditList.push({
            id: doc.id,
            timestamp: data.updatedAt || data.endTime || data.createdAt,
            action: "SECURITY FLAG",
            details: data.flagReason || "Distance mismatch detected",
            user: `${data.employeeName} (${data.employeeId})`,
            type: "FLAGGED",
            amount: data.claimAmount
          });
        }
        if (data.revertedByL2) {
          auditList.push({
            id: doc.id + "_revert",
            timestamp: data.updatedAt || data.createdAt,
            action: "L2 REVERT",
            details: data.revertReason || "Reverted to L1 Manager for re-evaluation",
            user: `${data.employeeName} (${data.employeeId})`,
            type: "REVERTED",
            amount: data.claimAmount
          });
        }
        if (data.requestStatus === "ESCALATED_TO_L2") {
          auditList.push({
            id: doc.id + "_esc",
            timestamp: data.escalatedAt || data.updatedAt || data.createdAt,
            action: "AUTO ESCALATION",
            details: "Claim timed out or exceeded normal limits and escalated to L2",
            user: `${data.employeeName} (${data.employeeId})`,
            type: "ESCALATED",
            amount: data.claimAmount
          });
        }
      });

      miscSnap.forEach((doc) => {
        const data = doc.data();
        if (data.isFlagged) {
          auditList.push({
            id: doc.id,
            timestamp: data.updatedAt || data.createdAt,
            action: "SECURITY FLAG",
            details: data.flagReason || "Misc claim discrepancy",
            user: `${data.employeeName} (${data.employeeId})`,
            type: "FLAGGED",
            amount: data.claimAmount
          });
        }
      });

      // Sort recent first
      auditList.sort((a, b) => (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0));
      setLogs(auditList);
    } catch (error) {
      console.error("Error fetching logs:", error);
    }
  };

  const exportLogsToExcel = () => {
    if (logs.length === 0) {
      showToast("No system logs to export.", "info");
      return;
    }

    const exportData = filteredLogs.map((log) => ({
      "Timestamp": log.timestamp ? new Date(log.timestamp.seconds * 1000).toLocaleString() : "N/A",
      "Event Type": log.action,
      "Target Employee": log.user,
      "Claim Amount (₹)": log.amount || 0,
      "Audit Details": log.details
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "System Audit Logs");
    XLSX.writeFile(workbook, `System_Audit_Logs_${new Date().toISOString().split('T')[0]}.xlsx`);
    showToast("Audit logs exported successfully!", "success");
  };

  const menuItems = [
    { text: "Dashboard", path: "/master", icon: <LayoutDashboard size={20} /> },
    { text: "Add L2 User", path: "/add-l2", icon: <UserPlus size={20} /> },
    { text: "Manage Users", path: "/users", icon: <Users size={20} /> },
    { text: "System Logs", path: "/logs", icon: <ShieldAlert size={20} /> },
    { text: "Profile", path: "/profile", icon: <User size={20} /> },
  ];

  const filteredLogs = logs.filter(log => {
    const matchesFilter = filterType === "ALL" || log.type === filterType;
    const matchesSearch = log.user?.toLowerCase().includes(searchTerm.toLowerCase()) || log.details?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  return (
    <div className="layout-container">
      <Sidebar menuItems={menuItems} />

      <div className="main-content animate-fade-in">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
          <div>
            <h1 className="page-title" style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <ShieldAlert color="#f87171" /> System Audit & Security Logs
            </h1>
            <p className="page-subtitle">Real-time security monitoring of system anomalies, overrides, and automated escalations.</p>
          </div>
          <Button variant="success" onClick={exportLogsToExcel}>
            <FileSpreadsheet size={18} /> Export Audit Logs
          </Button>
        </div>

        <div className="glass-panel" style={{ padding: "16px", marginBottom: "24px", display: "flex", gap: "16px", flexWrap: "wrap", alignItems: "center" }}>
          <input 
            type="text" 
            placeholder="Search logs by employee or details..." 
            value={searchTerm} 
            onChange={(e) => setSearchTerm(e.target.value)} 
            style={{ flex: 1, minWidth: "250px", padding: "10px 14px", borderRadius: "8px", border: "1px solid var(--panel-border)", background: "var(--bg-secondary)", color: "var(--text-primary)" }}
          />
          <div style={{ display: "flex", gap: "8px" }}>
            <Button variant={filterType === "ALL" ? "primary" : "outline"} onClick={() => setFilterType("ALL")}>All Events</Button>
            <Button variant={filterType === "FLAGGED" ? "danger" : "outline"} onClick={() => setFilterType("FLAGGED")}>Security Flags</Button>
            <Button variant={filterType === "ESCALATED" ? "warning" : "outline"} onClick={() => setFilterType("ESCALATED")}>Escalations</Button>
            <Button variant={filterType === "REVERTED" ? "secondary" : "outline"} onClick={() => setFilterType("REVERTED")}>L2 Reverts</Button>
          </div>
        </div>

        {filteredLogs.length === 0 ? (
          <div className="glass-panel" style={{ padding: "60px", textAlign: "center", color: "var(--text-muted)" }}>
            <CheckCircle size={48} color="#34d399" style={{ margin: "0 auto 16px auto", opacity: 0.8 }} />
            <h3 style={{ color: "var(--text-primary)", marginBottom: "8px" }}>No System Anomalies Found</h3>
            <p>All system workflows are operating smoothly without flags or overdue escalations.</p>
          </div>
        ) : (
          <div style={{ display: "grid", gap: "16px" }}>
            {filteredLogs.map((log) => (
              <div key={log.id} className="glass-panel" style={{ padding: "20px", borderLeft: `4px solid ${log.type === "FLAGGED" ? "#f87171" : log.type === "ESCALATED" ? "#fbbf24" : "#a855f7"}` }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "10px" }}>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "6px" }}>
                      <span style={{ 
                        background: log.type === "FLAGGED" ? "rgba(248, 113, 113, 0.2)" : log.type === "ESCALATED" ? "rgba(251, 191, 36, 0.2)" : "rgba(168, 85, 247, 0.2)",
                        color: log.type === "FLAGGED" ? "#f87171" : log.type === "ESCALATED" ? "#fbbf24" : "#d8b4fe",
                        padding: "4px 10px", borderRadius: "6px", fontSize: "0.8rem", fontWeight: "bold", textTransform: "uppercase"
                      }}>
                        {log.action}
                      </span>
                      <span style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>
                        {log.timestamp ? new Date(log.timestamp.seconds * 1000).toLocaleString() : "Just now"}
                      </span>
                    </div>
                    <h4 style={{ fontSize: "1.05rem", color: "var(--text-primary)", marginBottom: "4px" }}>{log.user}</h4>
                    <p style={{ color: "var(--text-secondary)", fontSize: "0.95rem", margin: 0 }}>{log.details}</p>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <span style={{ fontSize: "0.85rem", color: "var(--text-muted)", display: "block" }}>Claim Value</span>
                    <strong style={{ fontSize: "1.3rem", color: "#34d399" }}>₹{log.amount || 0}</strong>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default SystemLogs;
