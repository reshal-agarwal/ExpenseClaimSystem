import { useEffect, useState } from "react";
import { collection, query, where, getDocs, doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { 
  LayoutDashboard, Users, CheckSquare, ClipboardCheck, 
  AlertTriangle, UserPlus, User, Check, X 
} from "lucide-react";

import { db } from "../firebase";
import { Sidebar } from "../components/Sidebar";
import { Button } from "../components/Button";
import { useToast } from "../context/ToastContext";

function L1Approvals() {
  const { showToast } = useToast();
  const [requests, setRequests] = useState([]);

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    try {
      const l1Uid = localStorage.getItem("uid");
      const qTravel = query(
        collection(db, "travelRequests"),
        where("managerId", "==", l1Uid),
        where("requestStatus", "==", "PENDING_START_APPROVAL")
      );
      const qMisc = query(
        collection(db, "miscClaims"),
        where("managerId", "==", l1Uid),
        where("requestStatus", "==", "CLAIM_PENDING_APPROVAL")
      );

      const travelSnap = await getDocs(qTravel);
      const miscSnap = await getDocs(qMisc);
      const data = [];
      
      travelSnap.forEach((doc) => {
        data.push({ id: doc.id, ...doc.data() });
      });
      miscSnap.forEach((doc) => {
        data.push({ id: doc.id, ...doc.data() });
      });

      setRequests(data);
    } catch (error) {
      console.log(error);
    }
  };

  const approveRequest = async (id) => {
    try {
      const req = requests.find(r => r.id === id);
      const collectionName = req.claimType === "MISCELLANEOUS" ? "miscClaims" : "travelRequests";
      const nextStatus = req.claimType === "MISCELLANEOUS" ? "APPROVED" : "START_APPROVED";
      
      await updateDoc(doc(db, collectionName, id), {
        requestStatus: nextStatus,
        updatedAt: serverTimestamp()
      });
      showToast(req.claimType === "MISCELLANEOUS" ? "Claim Approved" : "Travel Approved", "success");
      fetchRequests();
    } catch (error) {
      console.log(error);
    }
  };

  const rejectRequest = async (id) => {
    try {
      const req = requests.find(r => r.id === id);
      const collectionName = req.claimType === "MISCELLANEOUS" ? "miscClaims" : "travelRequests";
      const nextStatus = "REJECTED";
      
      await updateDoc(doc(db, collectionName, id), {
        requestStatus: nextStatus,
        updatedAt: serverTimestamp()
      });
      showToast(req.claimType === "MISCELLANEOUS" ? "Claim Rejected" : "Travel Rejected", "error");
      fetchRequests();
    } catch (error) {
      console.log(error);
    }
  };

  const menuItems = [
    { text: "Dashboard", path: "/l1", icon: <LayoutDashboard size={20} /> },
    { text: "Pending Approvals", path: "/l1-approvals", icon: <CheckSquare size={20} /> },
    { text: "Verify Claims", path: "/l1-claims", icon: <ClipboardCheck size={20} /> },
    { text: "Add L0 Engineer", path: "/add-l0", icon: <UserPlus size={20} /> },
    { text: "Profile", path: "/profile", icon: <User size={20} /> },
  ];

  return (
    <div className="layout-container">
      <Sidebar menuItems={menuItems} />

      <div className="main-content animate-fade-in">
        <h1 className="page-title">Pending Approvals</h1>
        <p className="page-subtitle">Review and approve travel requests and miscellaneous claims from L0 Engineers.</p>

        {requests.length === 0 && (
          <div className="glass-panel" style={{ padding: "40px", textAlign: "center", color: "var(--text-muted)" }}>
            <p>No Pending Requests Found.</p>
          </div>
        )}

        <div style={{ display: "grid", gap: "20px" }}>
          {requests.map((request) => (
            <div key={request.id} className="glass-panel" style={{ padding: "24px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <h3 style={{ fontSize: "1.1rem", marginBottom: "8px" }}>
                  {request.claimType === "MISCELLANEOUS" ? "Misc ID:" : "Travel ID:"} {request.travelId || request.claimId}
                </h3>
                <p className="text-secondary" style={{ fontSize: "0.9rem", marginBottom: "4px" }}>
                  <strong style={{ color: "var(--text-primary)" }}>Employee:</strong> {request.employeeName} ({request.employeeId})
                </p>
                <p className="text-secondary" style={{ fontSize: "0.9rem", marginBottom: "4px" }}>
                  <strong style={{ color: "var(--text-primary)" }}>{request.claimType === "MISCELLANEOUS" ? "Category:" : "POP / Link:"}</strong> {request.claimType === "MISCELLANEOUS" ? request.category : `${request.popName} / ${request.rtLinkName || "N/A"}`}
                </p>
                <p className="text-secondary" style={{ fontSize: "0.9rem" }}>
                  <strong style={{ color: "var(--text-primary)" }}>{request.claimType === "MISCELLANEOUS" ? "Amount:" : "Purpose:"}</strong> {request.claimType === "MISCELLANEOUS" ? `₹${request.claimAmount}` : request.purpose}
                </p>
              </div>

              <div style={{ display: "flex", gap: "12px" }}>
                <Button variant="success" onClick={() => approveRequest(request.id)}>
                  <Check size={18} /> Approve
                </Button>
                <Button variant="danger" onClick={() => rejectRequest(request.id)}>
                  <X size={18} /> Reject
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default L1Approvals;