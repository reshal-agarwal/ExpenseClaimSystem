import { useEffect, useState } from "react";
import { collection, query, where, getDocs, doc, getDoc } from "firebase/firestore";
import * as XLSX from "xlsx";
import { LayoutDashboard, FileSpreadsheet, User } from "lucide-react";

import { db } from "../firebase";
import { Sidebar } from "../components/Sidebar";
import { Button } from "../components/Button";

function PreviousClaims() {
  const [claims, setClaims] = useState([]);
  const [role, setRole] = useState("L0");
  const [viewMode, setViewMode] = useState("FLAT"); // FLAT or NAME
  const [filterEngineer, setFilterEngineer] = useState("ALL");

  useEffect(() => {
    fetchClaims();
  }, []);

  const fetchClaims = async () => {
    try {
      const uid = localStorage.getItem("uid");
      const userDoc = await getDoc(doc(db, "user", uid));
      let userRole = "L0";
      
      if (userDoc.exists()) {
        userRole = userDoc.data().role;
        setRole(userRole);
      }

      let qTravel;
      let qMisc;
      if (userRole === "L0") {
        qTravel = query(collection(db, "travelRequests"), where("employeeUid", "==", uid));
        qMisc = query(collection(db, "miscClaims"), where("employeeUid", "==", uid));
      } else if (userRole === "L1") {
        qTravel = query(collection(db, "travelRequests"), where("managerId", "==", uid));
        qMisc = query(collection(db, "miscClaims"), where("managerId", "==", uid));
      } else {
        qTravel = collection(db, "travelRequests");
        qMisc = collection(db, "miscClaims");
      }

      const travelSnap = await getDocs(qTravel);
      const miscSnap = await getDocs(qMisc);
      const data = [];
      
      travelSnap.forEach((doc) => {
        data.push({ id: doc.id, ...doc.data() });
      });
      miscSnap.forEach((doc) => {
        data.push({ id: doc.id, ...doc.data() });
      });
      
      const completedClaims = data.filter(c => c.requestStatus === "APPROVED" || c.requestStatus === "REJECTED");      
      completedClaims.sort((a,b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
      
      setClaims(completedClaims);
    } catch (error) {
      console.log(error);
    }
  };

  const exportToExcel = async () => {
    const userMap = {};
    for (const claim of claims) {
      if (!userMap[claim.employeeUid]) {
        const userDoc = await getDoc(doc(db, "user", claim.employeeUid));
        if (userDoc.exists()) {
          userMap[claim.employeeUid] = userDoc.data();
        }
      }
    }

    const excelData = claims.map((claim) => {
      const user = userMap[claim.employeeUid] || {};
      
      const dateOfVisit = (claim.startTime || claim.createdAt) ? new Date((claim.startTime || claim.createdAt).seconds * 1000).toLocaleDateString() : "";
      const month = (claim.startTime || claim.createdAt) ? new Date((claim.startTime || claim.createdAt).seconds * 1000).toLocaleString('default', { month: 'short' }) + "'" + new Date((claim.startTime || claim.createdAt).seconds * 1000).getFullYear().toString().substr(-2) : "";
      
      const startLatLong = claim.startLocation ? `${claim.startLocation.lat}, ${claim.startLocation.lng}` : "";
      const endLatLong = claim.endLocation ? `${claim.endLocation.lat}, ${claim.endLocation.lng}` : "";

      const agencyFeePercent = user.agencyFee || 0;
      const agencyCost = (claim.claimAmount * (agencyFeePercent / 100)).toFixed(2);
      const totalAmountWithFee = (parseFloat(claim.claimAmount) + parseFloat(agencyCost)).toFixed(2);

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
    XLSX.writeFile(workbook, `Expense_Claims_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const getMenuItems = () => {
    if (role === "L1") {
      return [
        { text: "Dashboard", path: "/l1", icon: <LayoutDashboard size={20} /> },
        { text: "Verify Claims", path: "/l1-claims", icon: <FileSpreadsheet size={20} /> },
        { text: "Flagged Claims", path: "/flagged-claims", icon: <FileSpreadsheet size={20} /> },
        { text: "Previous Claims", path: "/previous-claims", icon: <FileSpreadsheet size={20} /> },
        { text: "Add L0 Engineer", path: "/add-l0", icon: <User size={20} /> },
        { text: "Profile", path: "/profile", icon: <User size={20} /> },
      ];
    }
    return [
      { text: "Dashboard", path: role === "L0" ? "/l0" : role === "L1" ? "/l1" : role === "L2" ? "/l2" : "/master", icon: <LayoutDashboard size={20} /> },
      { text: "Previous Claims", path: "/previous-claims", icon: <FileSpreadsheet size={20} /> },
      { text: "Profile", path: "/profile", icon: <User size={20} /> },
    ];
  };

  const renderGroupedClaims = () => {
    const displayedClaims = filterEngineer === "ALL" 
      ? claims 
      : claims.filter(c => c.employeeName === filterEngineer);

    if (displayedClaims.length === 0) {
      return (
        <div className="glass-panel" style={{ padding: "40px", textAlign: "center", color: "var(--text-muted)" }}>
          <p>No completed claims match the filter.</p>
        </div>
      );
    }

    const renderClaimCard = (claim) => (
      <div key={claim.id} className="glass-panel" style={{ padding: "20px", display: "flex", justifyContent: "space-between", marginBottom: "15px" }}>
        <div>
          <h3 style={{ fontSize: "1.1rem", marginBottom: "8px" }}>
            {claim.claimType === "MISCELLANEOUS" ? "Misc ID:" : "Travel ID:"} {claim.travelId || claim.claimId}
          </h3>
          <p className="text-secondary" style={{ fontSize: "0.9rem", marginBottom: "4px" }}>
            <strong style={{ color: "var(--text-primary)" }}>Employee:</strong> {claim.employeeName} ({claim.employeeId})
          </p>
          <p className="text-secondary" style={{ fontSize: "0.9rem", marginBottom: "4px" }}>
            <strong style={{ color: "var(--text-primary)" }}>{claim.claimType === "MISCELLANEOUS" ? "Category:" : "POP / Link:"}</strong> {claim.claimType === "MISCELLANEOUS" ? claim.category : `${claim.popName} / ${claim.rtLinkName || "N/A"}`}
          </p>
          <p className="text-secondary" style={{ fontSize: "0.9rem" }}>
            <strong style={{ color: "var(--text-primary)" }}>Type:</strong> {claim.claimType === "MISCELLANEOUS" ? "Miscellaneous Expense" : `Travel (${claim.distanceTravelled} KM)`}
          </p>
        </div>
        <div style={{ textAlign: "right", display: "flex", flexDirection: "column", gap: "8px", alignItems: "flex-end" }}>
          <h2 style={{ color: "var(--success)", margin: 0 }}>₹{claim.claimAmount}</h2>
          <span className={`badge ${claim.requestStatus === 'REJECTED' ? 'badge-danger' : claim.requestStatus === 'APPROVED' ? 'badge-success' : 'badge-warning'}`}>
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
    );

    if (viewMode === "FLAT" || role === "L0") {
      return displayedClaims.map(renderClaimCard);
    }

    const grouped = {};
    displayedClaims.forEach(claim => {
      const key = claim.employeeName || "Unknown Engineer";
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(claim);
    });

    return Object.entries(grouped).map(([groupKey, groupClaims]) => (
      <div key={groupKey} style={{ marginBottom: "30px" }}>
        <h3 style={{ fontSize: "1.2rem", color: "var(--text-primary)", marginBottom: "15px", borderBottom: "2px solid var(--panel-border)", paddingBottom: "5px" }}>
          {groupKey} <span style={{ fontSize: "0.9rem", color: "var(--text-muted)", fontWeight: "normal" }}>({groupClaims.length} claims)</span>
        </h3>
        {groupClaims.map(renderClaimCard)}
      </div>
    ));
  };

  return (
    <div className="layout-container">
      <Sidebar menuItems={getMenuItems()} />

      <div className="main-content animate-fade-in">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
          <div>
            <h1 className="page-title">Previous Claims</h1>
            <p className="page-subtitle">View and export completed travel claims.</p>
          </div>
          <Button onClick={exportToExcel} style={{ padding: "12px 20px" }}>
            <FileSpreadsheet size={18} /> Download Excel
          </Button>
        </div>

        {role !== "L0" && (
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--panel-border)", paddingBottom: "15px", marginBottom: "20px", flexWrap: "wrap", gap: "15px" }}>
            <h2 style={{ fontSize: "1.2rem", margin: 0 }}>History ({claims.length})</h2>
            
            <div style={{ display: "flex", gap: "15px", flexWrap: "wrap" }}>
              <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                <span style={{ fontSize: "0.9rem", color: "var(--text-muted)" }}>Engineer:</span>
                <select 
                  value={filterEngineer} 
                  onChange={(e) => setFilterEngineer(e.target.value)}
                  style={{ padding: "8px 12px", borderRadius: "8px", border: "1px solid var(--panel-border)", background: "var(--bg-secondary)", color: "var(--text-primary)", outline: "none", cursor: "pointer" }}
                >
                  <option value="ALL">All Engineers</option>
                  {Array.from(new Set(claims.map(c => c.employeeName))).filter(Boolean).map(name => (
                    <option key={name} value={name}>{name}</option>
                  ))}
                </select>
              </div>

              <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                <span style={{ fontSize: "0.9rem", color: "var(--text-muted)" }}>View As:</span>
                <select 
                  value={viewMode} 
                  onChange={(e) => setViewMode(e.target.value)}
                  style={{ padding: "8px 12px", borderRadius: "8px", border: "1px solid var(--panel-border)", background: "var(--bg-secondary)", color: "var(--text-primary)", outline: "none", cursor: "pointer" }}
                >
                  <option value="FLAT">List (Recent First)</option>
                  <option value="NAME">Group by Engineer Name</option>
                </select>
              </div>
            </div>
          </div>
        )}

        <div>
          {renderGroupedClaims()}
        </div>
      </div>
    </div>
  );
}

export default PreviousClaims;
