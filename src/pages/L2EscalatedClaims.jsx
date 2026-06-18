import { useEffect, useState } from "react";
import { collection, query, where, getDocs, doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { 
  LayoutDashboard, UserPlus, User, Check, X, AlertTriangle, FileSpreadsheet, Download
} from "lucide-react";
import * as XLSX from "xlsx";

import { db } from "../firebase";
import { Sidebar } from "../components/Sidebar";
import { Button } from "../components/Button";
import { useToast } from "../context/ToastContext";

function L2EscalatedClaims() {
  const [escalatedClaims, setEscalatedClaims] = useState([]);
  const { showToast } = useToast();

  useEffect(() => {
    fetchEscalated();
  }, []);

  const fetchEscalated = async () => {
    try {
      // Fetch all ESCALATED_TO_L2 claims globally for L2 review
      const qTravel = query(collection(db, "travelRequests"), where("requestStatus", "==", "ESCALATED_TO_L2"));
      const qMisc = query(collection(db, "miscClaims"), where("requestStatus", "==", "ESCALATED_TO_L2"));

      const travelSnap = await getDocs(qTravel);
      const miscSnap = await getDocs(qMisc);
      
      const dataList = [];
      travelSnap.forEach((doc) => dataList.push({ id: doc.id, ...doc.data() }));
      miscSnap.forEach((doc) => dataList.push({ id: doc.id, ...doc.data() }));

      // Sort oldest first (highest priority)
      dataList.sort((a,b) => (a.escalatedAt?.seconds || 0) - (b.escalatedAt?.seconds || 0));

      setEscalatedClaims(dataList);
    } catch (error) {
      console.log(error);
    }
  };

  const acceptClaim = async (id, claimType) => {
    try {
      const collectionName = claimType === "MISCELLANEOUS" ? "miscClaims" : "travelRequests";
      await updateDoc(doc(db, collectionName, id), {
        requestStatus: "APPROVED",
        isFlagged: false, // Resolve any flag
        updatedAt: serverTimestamp()
      });
      showToast("Escalated Claim Approved", "success");
      fetchEscalated();
    } catch (error) {
      console.log(error);
      showToast("Failed to approve claim", "error");
    }
  };

  const rejectClaim = async (id, claimType) => {
    try {
      const collectionName = claimType === "MISCELLANEOUS" ? "miscClaims" : "travelRequests";
      await updateDoc(doc(db, collectionName, id), {
        requestStatus: "REJECTED",
        updatedAt: serverTimestamp()
      });
      showToast("Escalated Claim Rejected", "success");
      fetchEscalated();
    } catch (error) {
      console.log(error);
      showToast("Failed to reject claim", "error");
    }
  };

  const exportToExcel = () => {
    if (escalatedClaims.length === 0) {
      showToast("No claims to export.", "info");
      return;
    }
    
    const excelData = escalatedClaims.map(c => ({
      "Type": c.claimType === "MISCELLANEOUS" ? "Misc" : "Travel",
      "Travel/Claim ID": c.travelId || c.claimId || "",
      "Employee": c.employeeName || "",
      "Emp ID": c.employeeId || "",
      "Amount": c.claimAmount || 0,
      "PTW ID": c.ptwId || "N/A",
      "Escalation Reason": c.flagReason || "L1 Timeout"
    }));

    const worksheet = XLSX.utils.json_to_sheet(excelData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Escalated_Claims");
    XLSX.writeFile(workbook, `Escalated_Claims_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const menuItems = [
    { text: "Dashboard", path: "/l2", icon: <LayoutDashboard size={20} /> },
    { text: "Escalated Claims", path: "/l2-escalated", icon: <AlertTriangle size={20} /> },
    { text: "Add L1 Engineer", path: "/add-l1", icon: <UserPlus size={20} /> },
    { text: "Profile", path: "/profile", icon: <User size={20} /> },
  ];

  return (
    <div className="layout-container">
      <Sidebar menuItems={menuItems} />

      <div className="main-content animate-fade-in">
        <h1 className="page-title" style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <AlertTriangle color="var(--danger-color)" /> Escalated Claims
        </h1>
        <p className="page-subtitle">These claims were abandoned by L1 Managers and have been auto-escalated to you.</p>

        <div className="glass-panel" style={{ padding: "20px", marginBottom: "30px", background: "rgba(99, 102, 241, 0.05)", border: "1px solid rgba(99, 102, 241, 0.2)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h3 style={{ display: "flex", alignItems: "center", gap: "8px", color: "var(--primary-color)", margin: 0 }}>
              Action Required ({escalatedClaims.length})
            </h3>
            <Button variant="primary" onClick={exportToExcel}>
              <Download size={18} /> Export List
            </Button>
          </div>
        </div>

        {escalatedClaims.length === 0 && (
          <div className="glass-panel" style={{ padding: "40px", textAlign: "center", color: "var(--text-muted)" }}>
            <p>No escalated claims at the moment.</p>
          </div>
        )}

        <div style={{ display: "grid", gap: "20px" }}>
          {escalatedClaims.map((request) => (
            <div key={request.id} className="glass-panel" style={{ padding: "24px", borderLeft: "4px solid var(--danger-color)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <h3 style={{ fontSize: "1.1rem", marginBottom: "8px", color: "var(--primary-color)" }}>
                    {request.claimType === "MISCELLANEOUS" ? "Misc ID:" : "Travel ID:"} {request.travelId || request.claimId}
                  </h3>
                  <p className="text-secondary" style={{ fontSize: "0.9rem", marginBottom: "4px" }}>
                    <strong style={{ color: "var(--text-primary)" }}>Employee:</strong> {request.employeeName} ({request.employeeId})
                  </p>
                  
                  {request.claimType !== "MISCELLANEOUS" && (
                    <>
                      <p className="text-secondary" style={{ fontSize: "0.9rem", marginBottom: "4px" }}>
                        <strong style={{ color: "var(--text-primary)" }}>Distance:</strong> {request.distanceTravelled} KM
                      </p>
                      <p className="text-secondary" style={{ fontSize: "0.9rem", marginBottom: "4px" }}>
                        <strong style={{ color: "var(--text-primary)" }}>PTW ID:</strong> {request.ptwId || "N/A"}
                      </p>
                    </>
                  )}

                  <div style={{ marginTop: "12px", padding: "10px", background: "rgba(239, 68, 68, 0.1)", borderRadius: "8px", color: "var(--danger-color)" }}>
                    <strong>Escalation Note:</strong> {request.flagReason || "L1 Manager failed to review within 69 hours."}
                  </div>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "12px", alignItems: "flex-end" }}>
                  <h2 style={{ color: "var(--success)", margin: 0 }}>₹{request.claimAmount}</h2>
                  <Button variant="success" onClick={() => acceptClaim(request.id, request.claimType)}>
                    <Check size={18} /> Accept
                  </Button>
                  <Button variant="danger" onClick={() => rejectClaim(request.id, request.claimType)}>
                    <X size={18} /> Reject
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default L2EscalatedClaims;
