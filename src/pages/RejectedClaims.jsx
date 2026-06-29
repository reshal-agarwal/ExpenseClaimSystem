import { useEffect, useState } from "react";
import { collection, query, where, getDocs } from "firebase/firestore";
import { LayoutDashboard, XCircle, User, Plane, Navigation, FileText, Clock, AlertTriangle } from "lucide-react";

import { db } from "../firebase";
import { Sidebar } from "../components/Sidebar";

function RejectedClaims() {
  const [claims, setClaims] = useState([]);

  useEffect(() => {
    fetchClaims();
  }, []);

  const fetchClaims = async () => {
    try {
      const uid = localStorage.getItem("uid");

      const qTravel = query(collection(db, "travelRequests"), where("employeeUid", "==", uid), where("requestStatus", "==", "REJECTED"));
      const qMisc = query(collection(db, "miscClaims"), where("employeeUid", "==", uid), where("requestStatus", "==", "REJECTED"));

      const travelSnap = await getDocs(qTravel);
      const miscSnap = await getDocs(qMisc);
      const data = [];
      
      travelSnap.forEach((doc) => {
        data.push({ id: doc.id, ...doc.data() });
      });
      miscSnap.forEach((doc) => {
        data.push({ id: doc.id, ...doc.data() });
      });
      
      data.sort((a,b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
      
      setClaims(data);
    } catch (error) {
      console.log(error);
    }
  };

  const getMenuItems = () => {
    return [
      { text: "Dashboard", path: "/l0", icon: <LayoutDashboard size={20} /> },
      { text: "Travel Claim", path: "/travel-claim", icon: <Plane size={20} /> },
      { text: "Active Travels", path: "/active-travels", icon: <Navigation size={20} /> },
      { text: "Miscellaneous Claim", path: "/misc-claim", icon: <FileText size={20} /> },
      { text: "Previous Claims", path: "/previous-claims", icon: <Clock size={20} /> },
      { text: "Flagged Claims", path: "/flagged-claims", icon: <AlertTriangle size={20} /> },
      { text: "Rejected Claims", path: "/rejected-claims", icon: <XCircle size={20} /> },
      { text: "Profile", path: "/profile", icon: <User size={20} /> },
    ];
  };

  return (
    <div className="layout-container">
      <Sidebar menuItems={getMenuItems()} />

      <div className="main-content animate-fade-in">
        <div style={{ marginBottom: "20px" }}>
          <h1 className="page-title">Rejected Claims</h1>
          <p className="page-subtitle">View your claims that have been rejected.</p>
        </div>

        <div>
          {claims.length === 0 ? (
            <div className="glass-panel" style={{ padding: "40px", textAlign: "center", color: "var(--text-muted)" }}>
              <p>No rejected claims found.</p>
            </div>
          ) : (
            claims.map(claim => (
              <div key={claim.id} className="glass-panel" style={{ padding: "20px", display: "flex", justifyContent: "space-between", marginBottom: "15px" }}>
                <div>
                  <h3 style={{ fontSize: "1.1rem", marginBottom: "8px" }}>
                    {claim.claimType === "MISCELLANEOUS" ? "Misc ID:" : "Travel ID:"} {claim.travelId || claim.claimId}
                  </h3>
                  <p className="text-secondary" style={{ fontSize: "0.9rem", marginBottom: "4px" }}>
                    <strong style={{ color: "var(--text-primary)" }}>{claim.claimType === "MISCELLANEOUS" ? "Category:" : "POP / Link:"}</strong> {claim.claimType === "MISCELLANEOUS" ? claim.category : `${claim.popName} / ${claim.rtLinkName || "N/A"}`}
                  </p>
                  <p className="text-secondary" style={{ fontSize: "0.9rem", marginBottom: "4px" }}>
                    <strong style={{ color: "var(--text-primary)" }}>Type:</strong> {claim.claimType === "MISCELLANEOUS" ? "Miscellaneous Expense" : `Travel (${claim.distanceTravelled || 0} KM)`}
                  </p>
                  {(claim.rejectReason || claim.rejectionReason) && (
                    <p className="text-secondary" style={{ fontSize: "0.9rem", color: "var(--danger)" }}>
                      <strong style={{ color: "var(--danger)" }}>Reason:</strong> {claim.rejectReason || claim.rejectionReason}
                    </p>
                  )}
                </div>
                <div style={{ textAlign: "right", display: "flex", flexDirection: "column", gap: "8px", alignItems: "flex-end" }}>
                  <h2 style={{ color: "var(--success)", margin: 0 }}>₹{claim.claimAmount}</h2>
                  <span className="badge badge-danger">
                    {claim.requestStatus}
                  </span>
                  {claim.receiptUrl && (
                    claim.receiptUrl.startsWith("data:image") ? (
                      <div style={{ marginTop: "10px", textAlign: "right" }}>
                        <p className="text-secondary" style={{ fontSize: "0.85rem", marginBottom: "4px" }}>Receipt:</p>
                        <img src={claim.receiptUrl} alt="Receipt" style={{ maxWidth: "150px", maxHeight: "150px", borderRadius: "8px", border: "1px solid var(--panel-border)", objectFit: "contain" }} />
                      </div>
                    ) : (
                      <a href={claim.receiptUrl} target="_blank" rel="noopener noreferrer" style={{ color: "var(--primary-color)", fontSize: "0.9rem", textDecoration: "underline", display: "inline-block", marginTop: "4px" }}>
                        View Receipt
                      </a>
                    )
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

export default RejectedClaims;
