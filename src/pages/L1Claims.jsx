import { useEffect, useState } from "react";
import { collection, query, where, getDocs, doc, updateDoc, serverTimestamp, getDoc } from "firebase/firestore";
import * as XLSX from "xlsx";
import { 
  LayoutDashboard, CheckSquare, ClipboardCheck, 
  AlertTriangle, UserPlus, User, Check, X, FileSpreadsheet, Download 
} from "lucide-react";

import { db } from "../firebase";
import { Sidebar } from "../components/Sidebar";
import { Button } from "../components/Button";
import { useToast } from "../context/ToastContext";

function L1Claims() {
  const [pendingClaims, setPendingClaims] = useState([]);
  const [allClaims, setAllClaims] = useState([]);
  const [viewMode, setViewMode] = useState("FLAT"); // FLAT, MONTH, NAME
  const [filterEngineer, setFilterEngineer] = useState("ALL");
  const { showToast } = useToast();

  useEffect(() => {
    fetchClaims();
  }, []);

  const fetchClaims = async () => {
    try {
      const uid = localStorage.getItem("uid");
      
      const qTravel = query(collection(db, "travelRequests"), where("managerId", "==", uid));
      const qMisc = query(collection(db, "miscClaims"), where("managerId", "==", uid));

      const travelSnap = await getDocs(qTravel);
      const miscSnap = await getDocs(qMisc);
      
      const dataList = [];
      
      travelSnap.forEach((doc) => {
        dataList.push({ id: doc.id, ...doc.data() });
      });
      miscSnap.forEach((doc) => {
        dataList.push({ id: doc.id, ...doc.data() });
      });

      // Sort recent first
      dataList.sort((a,b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));

      setAllClaims(dataList);

      // Filter only those pending verification and NOT flagged (flagged go to Flagged page)
      const now = new Date();
      let overdueCount = 0;

      const pending = dataList.filter(c => {
        if (c.requestStatus === "CLAIM_PENDING_APPROVAL" && c.isFlagged !== true) {
          const submissionTime = c.claimType === "MISCELLANEOUS" ? c.createdAt?.toDate() : c.endTime?.toDate();
          if (submissionTime) {
            const hours = (now - submissionTime) / (1000 * 60 * 60);
            c.hoursPending = hours;
            if (hours >= 45) {
              c.isOverdue = true;
              overdueCount++;
            }
          }
          return true;
        }
        return false;
      });

      setPendingClaims(pending);

      if (overdueCount > 0) {
        // slight delay so toast appears after mount
        setTimeout(() => {
          showToast(`WARNING: You have ${overdueCount} claim(s) OVERDUE for approval! They will be escalated to L2 soon.`, "error");
        }, 500);
      }
      
    } catch (error) {
      console.log(error);
    }
  };

  const acceptClaim = async (id, claimType) => {
    try {
      const collectionName = claimType === "MISCELLANEOUS" ? "miscClaims" : "travelRequests";
      await updateDoc(doc(db, collectionName, id), {
        requestStatus: "APPROVED",
        updatedAt: serverTimestamp()
      });
      showToast("Claim Approved Successfully", "success");
      fetchClaims();
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
      showToast("Claim Rejected", "error");
      fetchClaims();
    } catch (error) {
      console.log(error);
      showToast("Failed to reject claim", "error");
    }
  };

  const acceptAllNormal = async () => {
    if (!window.confirm("Are you sure you want to approve ALL normal claims?")) return;
    try {
      const normalPending = allClaims.filter(c => c.requestStatus === "CLAIM_PENDING_APPROVAL" && c.isFlagged !== true);
      const promises = normalPending.map(req => {
        const collectionName = req.claimType === "MISCELLANEOUS" ? "miscClaims" : "travelRequests";
        return updateDoc(doc(db, collectionName, req.id), {
          requestStatus: "APPROVED",
          updatedAt: serverTimestamp()
        });
      });
      await Promise.all(promises);
      showToast(`Successfully approved ${normalPending.length} normal claims!`, "success");
      fetchClaims();
    } catch(err) { 
      console.error(err); 
      showToast("Failed to bulk approve claims", "error");
    }
  };

  const acceptAllIncludingFlagged = async () => {
    if (!window.confirm("WARNING: Are you sure you want to approve ALL claims, including those FLAGGED for mismatch?")) return;
    try {
      const allPending = allClaims.filter(c => c.requestStatus === "CLAIM_PENDING_APPROVAL");
      const promises = allPending.map(req => {
        const collectionName = req.claimType === "MISCELLANEOUS" ? "miscClaims" : "travelRequests";
        return updateDoc(doc(db, collectionName, req.id), {
          requestStatus: "APPROVED",
          isFlagged: false,
          flagReason: req.isFlagged ? "Resolved: Bulk Approved by Manager despite mismatch" : req.flagReason,
          updatedAt: serverTimestamp()
        });
      });
      await Promise.all(promises);
      showToast(`Successfully approved ${allPending.length} claims (including flagged ones)!`, "success");
      fetchClaims();
    } catch(err) { 
      console.error(err); 
      showToast("Failed to bulk approve flagged claims", "error");
    }
  };

  const exportToExcel = async (filterType) => {
    try {
      let filteredClaims = [];
      
      if (filterType === "ACCEPTED") {
        filteredClaims = allClaims.filter(c => c.requestStatus === "APPROVED");
      } else if (filterType === "ACCEPTED_FLAGGED") {
        filteredClaims = allClaims.filter(c => c.requestStatus === "APPROVED" || c.isFlagged === true);
      } else if (filterType === "ALL") {
        filteredClaims = allClaims;
      }

      if (filteredClaims.length === 0) {
        showToast("No claims match this filter to export.", "info");
        return;
      }

      const userMap = {};
      for (const claim of filteredClaims) {
        if (!userMap[claim.employeeUid]) {
          const userDoc = await getDoc(doc(db, "user", claim.employeeUid));
          if (userDoc.exists()) {
            userMap[claim.employeeUid] = userDoc.data();
          }
        }
      }

      const excelData = filteredClaims.map((claim) => {
        const user = userMap[claim.employeeUid] || {};
        
        const dateOfVisit = (claim.startTime || claim.createdAt) ? new Date((claim.startTime || claim.createdAt).seconds * 1000).toLocaleDateString() : "";
        const month = (claim.startTime || claim.createdAt) ? new Date((claim.startTime || claim.createdAt).seconds * 1000).toLocaleString('default', { month: 'short' }) + "'" + new Date((claim.startTime || claim.createdAt).seconds * 1000).getFullYear().toString().substr(-2) : "";
        
        const startLatLong = claim.startLocation ? `${claim.startLocation.lat}, ${claim.startLocation.lng}` : "";
        const endLatLong = claim.endLocation ? `${claim.endLocation.lat}, ${claim.endLocation.lng}` : "";

        const agencyFeePercent = user.agencyFee || 0;
        const agencyCost = (claim.claimAmount * (agencyFeePercent / 100)).toFixed(2);
        const totalAmountWithFee = (parseFloat(claim.claimAmount || 0) + parseFloat(agencyCost)).toFixed(2);

        return {
          "Month": month,
          "NLD/Met": user.baseRegion || "",
          "RT/LINK Name": claim.rtLinkName || "",
          "Engineer Name": claim.employeeName || "",
          "Emp": claim.employeeId || "",
          "Date of Visit": dateOfVisit,
          "Base Location": user.baseLocation || "",
          "POP Name": claim.popName || "",
          "Lat long Start Point": startLatLong,
          "Lat long End Point": endLatLong,
          "Agency Name": claim.agencyName || "",
          "Total Distance (Km)": claim.claimType === "MISCELLANEOUS" ? 0 : (claim.distanceTravelled || 0),
          "Per KM rate": claim.claimType === "MISCELLANEOUS" ? 0 : 2.5,
          "Final Amount": claim.claimAmount || 0,
          "Agency Fee(Lobo, NR, RHPL 2.5% & Prompt 6%)": agencyFeePercent,
          "Agency Cost": agencyCost,
          "Total Amount with Agency Fee": totalAmountWithFee,
          "Receipt/ No Receipt": claim.hasReceipt ? "Receipt" : "No receipt",
          "Travel Hrs (Day/Night)": "Day",
          "Claim Type (Normal/ Exceptional)": claim.claimType === "MISCELLANEOUS" ? "MISC" : "Normal",
          "Purpose of Visit": claim.claimType === "MISCELLANEOUS" ? claim.category : (claim.purpose || ""),
          "2W Trip ID": claim.travelId || claim.claimId || "",
          "PTW ID": claim.ptwId || "",
          "Reference NOC ticket ID": claim.nocTicketId || "",
          "Claim Categories": claim.claimType === "MISCELLANEOUS" ? claim.category : (claim.category || ""),
          "Remark": claim.remark || "",
          "Sub Categories": claim.subCategory || "",
          "Claim Will Cover With Customer Yes/No": claim.customerCover || "No",
          "Owner": user.managerId || ""
        };
      });

      const worksheet = XLSX.utils.json_to_sheet(excelData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Claims");
      XLSX.writeFile(workbook, `Claims_Export_${filterType}_${new Date().toISOString().split('T')[0]}.xlsx`);
      showToast("Excel Export Successful", "success");
    } catch (error) {
      console.error("Export failed:", error);
      showToast("Failed to export Excel file.", "error");
    }
  };

  const getMonthString = (claim) => {
    const timestamp = claim.startTime || claim.createdAt;
    if (!timestamp) return "Unknown Month";
    const date = new Date(timestamp.seconds * 1000);
    return date.toLocaleString('default', { month: 'long', year: 'numeric' });
  };

  const renderClaimCard = (request) => (
    <div key={request.id} className={`glass-panel ${request.isOverdue ? "overdue-border" : ""}`} style={{ padding: "24px", marginBottom: "15px", borderLeft: request.isOverdue ? "4px solid var(--danger-color)" : "1px solid var(--panel-border)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
            <h3 style={{ fontSize: "1.1rem", margin: 0, color: "var(--primary-color)" }}>
              {request.claimType === "MISCELLANEOUS" ? "Misc ID:" : "Travel ID:"} {request.travelId || request.claimId}
            </h3>
            {request.isOverdue && (
              <span style={{ background: "var(--danger-color)", color: "white", padding: "2px 8px", fontSize: "0.75rem", borderRadius: "0px", fontWeight: "bold" }}>
                OVERDUE - ESCALATING SOON
              </span>
            )}
          </div>
          <p className="text-secondary" style={{ fontSize: "0.9rem", marginBottom: "4px" }}>
            <strong style={{ color: "var(--text-primary)" }}>Employee:</strong> {request.employeeName} ({request.employeeId})
          </p>
          <p className="text-secondary" style={{ fontSize: "0.9rem", marginBottom: "4px" }}>
            <strong style={{ color: "var(--text-primary)" }}>{request.claimType === "MISCELLANEOUS" ? "Category:" : "POP / Link:"}</strong> {request.claimType === "MISCELLANEOUS" ? request.category : `${request.popName} / ${request.rtLinkName || "N/A"}`}
          </p>
          {request.claimType !== "MISCELLANEOUS" && (
            <>
              <p className="text-secondary" style={{ fontSize: "0.9rem", marginBottom: "4px" }}>
                <strong style={{ color: "var(--text-primary)" }}>Distance:</strong> {request.distanceTravelled} KM
              </p>
              <p className="text-secondary" style={{ fontSize: "0.9rem", marginBottom: "4px" }}>
                <strong style={{ color: "var(--text-primary)" }}>PTW ID:</strong> {request.ptwId || "N/A"}
              </p>
              <p className="text-secondary" style={{ fontSize: "0.9rem", marginBottom: "4px" }}>
                <strong style={{ color: "var(--text-primary)" }}>Start GPS:</strong> {request.startLocation ? `${request.startLocation.lat.toFixed(4)}, ${request.startLocation.lng.toFixed(4)}` : "N/A"}
              </p>
              <p className="text-secondary" style={{ fontSize: "0.9rem", marginBottom: "4px" }}>
                <strong style={{ color: "var(--text-primary)" }}>End GPS:</strong> {request.endLocation ? `${request.endLocation.lat.toFixed(4)}, ${request.endLocation.lng.toFixed(4)}` : "N/A"}
              </p>
              <p className="text-secondary" style={{ fontSize: "0.9rem", marginBottom: "4px" }}>
                <strong style={{ color: "var(--text-primary)" }}>NOC Ticket:</strong> {request.nocTicketId || "N/A"}
              </p>
            </>
          )}
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
          <h2 style={{ color: "var(--success)", margin: 0 }}>₹{request.claimAmount}</h2>
          <Button variant="success" onClick={() => acceptClaim(request.id, request.claimType)}>
            <Check size={18} /> Accept Claim
          </Button>
          <Button variant="danger" onClick={() => rejectClaim(request.id, request.claimType)}>
            <X size={18} /> Reject Claim
          </Button>
        </div>
      </div>
    </div>
  );

  const renderGroupedClaims = () => {
    const displayedClaims = filterEngineer === "ALL" 
      ? pendingClaims 
      : pendingClaims.filter(c => c.employeeName === filterEngineer);

    if (displayedClaims.length === 0) {
      return (
        <div className="glass-panel" style={{ padding: "40px", textAlign: "center", color: "var(--text-muted)" }}>
          <p>No claims match the current filters.</p>
        </div>
      );
    }

    if (viewMode === "FLAT") {
      return displayedClaims.map(renderClaimCard);
    }

    const grouped = {};
    displayedClaims.forEach(claim => {
      const key = viewMode === "MONTH" ? getMonthString(claim) : (claim.employeeName || "Unknown Engineer");
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(claim);
    });

    return Object.entries(grouped).map(([groupKey, claims]) => (
      <div key={groupKey} style={{ marginBottom: "30px" }}>
        <h3 style={{ fontSize: "1.2rem", color: "var(--text-primary)", marginBottom: "15px", borderBottom: "2px solid var(--panel-border)", paddingBottom: "5px" }}>
          {groupKey} <span style={{ fontSize: "0.9rem", color: "var(--text-muted)", fontWeight: "normal" }}>({claims.length} claims)</span>
        </h3>
        {claims.map(renderClaimCard)}
      </div>
    ));
  };

  const menuItems = [
    { text: "Dashboard", path: "/l1", icon: <LayoutDashboard size={20} /> },
    { text: "Verify Claims", path: "/l1-claims", icon: <ClipboardCheck size={20} /> },
    { text: "Flagged Claims", path: "/flagged-claims", icon: <AlertTriangle size={20} /> },
    { text: "Previous Claims", path: "/previous-claims", icon: <FileSpreadsheet size={20} /> },
    { text: "Add L0 Engineer", path: "/add-l0", icon: <UserPlus size={20} /> },
    { text: "Profile", path: "/profile", icon: <User size={20} /> },
  ];

  return (
    <div className="layout-container">
      <Sidebar menuItems={menuItems} />

      <div className="main-content animate-fade-in">
        <h1 className="page-title">Verify Claims</h1>
        <p className="page-subtitle">Accept or reject final claims submitted by your L0 Engineers.</p>

        {/* EXCEL EXPORT SECTION */}
        <div className="glass-panel" style={{ padding: "20px", marginBottom: "30px", background: "rgba(99, 102, 241, 0.05)", border: "1px solid rgba(99, 102, 241, 0.2)" }}>
          <h3 style={{ marginBottom: "15px", display: "flex", alignItems: "center", gap: "8px", color: "var(--primary-color)" }}>
            <FileSpreadsheet size={20} /> Advanced Excel Export
          </h3>
          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
            <Button variant="success" onClick={() => exportToExcel("ACCEPTED")} style={{ flex: 1, minWidth: "200px" }}>
              <Download size={18} /> Accepted Only
            </Button>
            <Button variant="warning" onClick={() => exportToExcel("ACCEPTED_FLAGGED")} style={{ flex: 1, minWidth: "200px" }}>
              <Download size={18} /> Accepted + Flagged
            </Button>
            <Button variant="primary" onClick={() => exportToExcel("ALL")} style={{ flex: 1, minWidth: "200px" }}>
              <Download size={18} /> All Claims
            </Button>
          </div>
        </div>

        {/* BULK ACTIONS SECTION */}
        <div className="glass-panel" style={{ padding: "20px", marginBottom: "30px", background: "rgba(16, 185, 129, 0.05)", border: "1px solid rgba(16, 185, 129, 0.2)" }}>
          <h3 style={{ marginBottom: "15px", display: "flex", alignItems: "center", gap: "8px", color: "var(--success)" }}>
            <CheckSquare size={20} /> Bulk Approvals
          </h3>
          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
            <Button variant="success" onClick={acceptAllNormal} style={{ flex: 1, minWidth: "200px" }}>
              <Check size={18} /> Accept All Normal Claims
            </Button>
            <Button variant="warning" onClick={acceptAllIncludingFlagged} style={{ flex: 1, minWidth: "200px" }}>
              <CheckSquare size={18} /> Accept All Claims (+ Flagged)
            </Button>
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--panel-border)", paddingBottom: "15px", marginBottom: "20px", flexWrap: "wrap", gap: "15px" }}>
          <h2 style={{ fontSize: "1.2rem", margin: 0 }}>Pending Verification ({pendingClaims.length})</h2>
          
          <div style={{ display: "flex", gap: "15px", flexWrap: "wrap" }}>
            {/* ENGINEER FILTER */}
            <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
              <span style={{ fontSize: "0.9rem", color: "var(--text-muted)" }}>Engineer:</span>
              <select 
                value={filterEngineer} 
                onChange={(e) => setFilterEngineer(e.target.value)}
                style={{ padding: "8px 12px", borderRadius: "8px", border: "1px solid var(--panel-border)", background: "var(--bg-secondary)", color: "var(--text-primary)", outline: "none", cursor: "pointer" }}
              >
                <option value="ALL">All Engineers</option>
                {Array.from(new Set(pendingClaims.map(c => c.employeeName))).filter(Boolean).map(name => (
                  <option key={name} value={name}>{name}</option>
                ))}
              </select>
            </div>

            {/* VIEW MODE */}
            <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
              <span style={{ fontSize: "0.9rem", color: "var(--text-muted)" }}>View As:</span>
              <select 
                value={viewMode} 
                onChange={(e) => setViewMode(e.target.value)}
                style={{ padding: "8px 12px", borderRadius: "8px", border: "1px solid var(--panel-border)", background: "var(--bg-secondary)", color: "var(--text-primary)", outline: "none", cursor: "pointer" }}
              >
                <option value="FLAT">List (Recent First)</option>
                <option value="MONTH">Group by Month</option>
                <option value="NAME">Group by Engineer Name</option>
              </select>
            </div>
          </div>
        </div>

        <div>
          {renderGroupedClaims()}
        </div>
      </div>
    </div>
  );
}

export default L1Claims;
