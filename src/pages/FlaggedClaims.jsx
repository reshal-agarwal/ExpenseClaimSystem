import { useEffect, useState } from "react";
import { collection, query, where, getDocs, doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { 
  LayoutDashboard, Users, CheckSquare, ClipboardCheck, 
  AlertTriangle, UserPlus, User, Check, X, FileSpreadsheet, RotateCcw
} from "lucide-react";

import { db } from "../firebase";
import { Sidebar } from "../components/Sidebar";
import { Button } from "../components/Button";
import { useToast } from "../context/ToastContext";

function FlaggedClaims() {
  const [flaggedRequests, setFlaggedRequests] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({ claimAmount: 0, distanceTravelled: 0 });
  const { showToast } = useToast();

  useEffect(() => {
    fetchFlagged();
  }, []);

  const fetchFlagged = async () => {
    try {
      const uid = localStorage.getItem("uid");
      const role = localStorage.getItem("role");
      
      // We'll show all flagged claims for the manager (L1) or L2
      // L0 shouldn't be here, but just in case, they'd see their own flagged claims
      let qTravel;
      let qMisc;
      
      if (role === "L0") {
        qTravel = query(collection(db, "travelRequests"), where("employeeUid", "==", uid));
        qMisc = query(collection(db, "miscClaims"), where("employeeUid", "==", uid));
      } else if (role === "L1") {
        qTravel = query(collection(db, "travelRequests"), where("managerId", "==", uid));
        qMisc = query(collection(db, "miscClaims"), where("managerId", "==", uid));
      } else {
        qTravel = collection(db, "travelRequests");
        qMisc = collection(db, "miscClaims");
      }

      const travelSnap = await getDocs(qTravel);
      const miscSnap = await getDocs(qMisc);
      const dataList = [];
      travelSnap.forEach((doc) => {
        const data = doc.data();
        if (data.isFlagged === true && data.requestStatus === "CLAIM_PENDING_APPROVAL") {
          dataList.push({ id: doc.id, ...data });
        }
      });
      miscSnap.forEach((doc) => {
        const data = doc.data();
        if (data.isFlagged === true && data.requestStatus === "CLAIM_PENDING_APPROVAL") {
          dataList.push({ id: doc.id, ...data });
        }
      });

      setFlaggedRequests(dataList);
    } catch (error) {
      console.log(error);
    }
  };

  const approveFlagged = async (id, isEdited = false) => {
    try {
      const req = flaggedRequests.find(r => r.id === id);
      const collectionName = req.claimType === "MISCELLANEOUS" ? "miscClaims" : "travelRequests";
      const nextStatus = "APPROVED"; // Both go to APPROVED
      
      const updateData = {
        requestStatus: nextStatus,
        isFlagged: false, // Resolve the flag
        flagReason: isEdited ? "Resolved: Manager edited and approved" : "Resolved: Approved by Manager despite mismatch",
        updatedAt: serverTimestamp()
      };

      if (isEdited) {
        updateData.claimAmount = Number(editForm.claimAmount);
        if (req.claimType !== "MISCELLANEOUS") {
          updateData.distanceTravelled = Number(editForm.distanceTravelled);
        }
      }
      
      await updateDoc(doc(db, collectionName, id), updateData);
      showToast(isEdited ? "Claim Edited and Approved" : "Claim Approved and Flag Resolved", "success");
      setEditingId(null);
      fetchFlagged();
    } catch (error) {
      console.log(error);
      showToast("Failed to approve claim", "error");
    }
  };

  const startEditing = (req) => {
    setEditingId(req.id);
    setEditForm({
      claimAmount: req.claimAmount || 0,
      distanceTravelled: req.distanceTravelled || 0
    });
  };

  const cancelEditing = () => {
    setEditingId(null);
  };

  const rejectFlagged = async (id) => {
    try {
      const req = flaggedRequests.find(r => r.id === id);
      const collectionName = req.claimType === "MISCELLANEOUS" ? "miscClaims" : "travelRequests";
      
      await updateDoc(doc(db, collectionName, id), {
        requestStatus: "REJECTED",
        updatedAt: serverTimestamp()
      });
      showToast("Claim Rejected", "success");
      fetchFlagged();
    } catch (error) {
      console.log(error);
      showToast("Failed to reject claim", "error");
    }
  };

  const revertToL1 = async (id) => {
    try {
      const req = flaggedRequests.find(r => r.id === id);
      const collectionName = req.claimType === "MISCELLANEOUS" ? "miscClaims" : "travelRequests";
      
      await updateDoc(doc(db, collectionName, id), {
        requestStatus: "CLAIM_PENDING_APPROVAL",
        isFlagged: false, // Remove flag so L1 can re-verify normally
        flagReason: "Reverted by L2 Manager for L1 re-evaluation",
        updatedAt: serverTimestamp()
      });
      showToast("Claim reverted back to L1 Manager", "info");
      fetchFlagged();
    } catch (error) {
      console.log(error);
      showToast("Failed to revert claim", "error");
    }
  };

  const role = localStorage.getItem("role");

  // Determine which sidebar to show based on role
  let menuItems = [];
  if (role === "L0") {
    menuItems = [
      { text: "Dashboard", path: "/l0", icon: <LayoutDashboard size={20} /> },
      { text: "Travel Claim", path: "/travel-claim", icon: <AlertTriangle size={20} /> }, // Placeholder icon
      { text: "Active Travels", path: "/active-travels", icon: <AlertTriangle size={20} /> },
      { text: "Miscellaneous Claim", path: "/misc-claim", icon: <CheckSquare size={20} /> },
      { text: "Previous Claims", path: "/previous-claims", icon: <ClipboardCheck size={20} /> },
      { text: "Flagged Claims", path: "/flagged-claims", icon: <AlertTriangle size={20} /> },
      { text: "Rejected Claims", path: "/rejected-claims", icon: <X size={20} /> },
      { text: "Profile", path: "/profile", icon: <User size={20} /> },
    ];
  } else {
    // Default L1 menu for now
    menuItems = [
      { text: "Dashboard", path: "/l1", icon: <LayoutDashboard size={20} /> },
      { text: "Verify Claims", path: "/l1-claims", icon: <ClipboardCheck size={20} /> },
      { text: "Flagged Claims", path: "/flagged-claims", icon: <AlertTriangle size={20} /> },
      { text: "Previous Claims", path: "/previous-claims", icon: <FileSpreadsheet size={20} /> },
      { text: "Add L0 Engineer", path: "/add-l0", icon: <UserPlus size={20} /> },
      { text: "Profile", path: "/profile", icon: <User size={20} /> },
    ];
  }

  return (
    <div className="layout-container">
      <Sidebar menuItems={menuItems} />

      <div className="main-content animate-fade-in">
        <h1 className="page-title" style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <AlertTriangle color="var(--danger)" /> Flagged Claims
        </h1>
        <p className="page-subtitle">Review claims where the entered amount or distance does not match the system's calculation.</p>

        {flaggedRequests.length === 0 && (
          <div className="glass-panel" style={{ padding: "40px", textAlign: "center", color: "var(--text-muted)" }}>
            <p>No Flagged Requests Found.</p>
          </div>
        )}

        <div style={{ display: "grid", gap: "20px" }}>
          {flaggedRequests.map((request) => (
            <div key={request.id} className="glass-panel" style={{ padding: "24px", borderLeft: "4px solid var(--danger)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
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
                  
                  {/* Flag Reason highlighted */}
                  <div style={{ marginTop: "12px", padding: "10px", background: "rgba(239, 68, 68, 0.1)", borderRadius: "8px", color: "var(--danger)" }}>
                    <strong>Flag Reason:</strong> {request.flagReason}
                  </div>
                  
                  {request.receiptUrl && (
                    request.receiptUrl.startsWith("data:image") ? (
                      <div style={{ marginTop: "10px" }}>
                        <p className="text-secondary" style={{ fontSize: "0.85rem", marginBottom: "4px" }}>Receipt:</p>
                        <img src={request.receiptUrl} alt="Receipt" style={{ maxWidth: "200px", maxHeight: "200px", borderRadius: "8px", border: "1px solid var(--panel-border)", objectFit: "contain" }} />
                      </div>
                    ) : (
                      <a href={request.receiptUrl} target="_blank" rel="noopener noreferrer" style={{ display: "inline-block", marginTop: "10px", color: "var(--primary-color)", textDecoration: "underline" }}>
                        View Uploaded Receipt
                      </a>
                    )
                  )}
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "12px", alignItems: "flex-end" }}>
                  {editingId === request.id ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: "8px", background: "var(--panel-bg)", padding: "15px", borderRadius: "8px", border: "1px solid var(--panel-border)" }}>
                      <div>
                        <label style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>Edit Amount (₹)</label>
                        <input type="number" className="input-field" value={editForm.claimAmount} onChange={e => setEditForm({...editForm, claimAmount: e.target.value})} style={{ padding: "8px" }} />
                      </div>
                      {request.claimType !== "MISCELLANEOUS" && (
                        <div>
                          <label style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>Edit Distance (KM)</label>
                          <input type="number" className="input-field" value={editForm.distanceTravelled} onChange={e => setEditForm({...editForm, distanceTravelled: e.target.value})} style={{ padding: "8px" }} />
                        </div>
                      )}
                      <Button variant="success" onClick={() => approveFlagged(request.id, true)}>
                        <Check size={18} /> Save & Approve
                      </Button>
                      <Button variant="secondary" onClick={cancelEditing}>
                        Cancel
                      </Button>
                    </div>
                  ) : (
                    <>
                      <h2 style={{ color: "var(--success)", margin: 0 }}>₹{request.claimAmount}</h2>
                      {role !== "L0" && (
                        <>
                          <Button variant="primary" onClick={() => startEditing(request)}>
                            Edit Claim
                          </Button>
                          <Button variant="success" onClick={() => approveFlagged(request.id, false)}>
                            <Check size={18} /> Approve As Is
                          </Button>
                          {(role === "L2" || role === "L3" || role === "MASTER") && (
                            <Button variant="secondary" onClick={() => revertToL1(request.id)} style={{ background: "rgba(234, 179, 8, 0.2)", color: "#facc15", border: "1px solid rgba(234, 179, 8, 0.4)" }}>
                              <RotateCcw size={18} /> Revert to L1
                            </Button>
                          )}
                          <Button variant="danger" onClick={() => rejectFlagged(request.id)}>
                            <X size={18} /> Delete / Reject Claim
                          </Button>
                        </>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default FlaggedClaims;
