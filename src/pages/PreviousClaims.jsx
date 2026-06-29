import { useEffect, useState } from "react";
import { collection, query, where, getDocs, doc, getDoc } from "firebase/firestore";
import * as XLSX from "xlsx";
import { LayoutDashboard, FileSpreadsheet, User } from "lucide-react";

import { db } from "../firebase";
import { Sidebar } from "../components/Sidebar";
import { Button } from "../components/Button";
import { useToast } from "../context/ToastContext";

function PreviousClaims() {
  const { showToast } = useToast();
  const [claims, setClaims] = useState([]);
  const [role, setRole] = useState("L0");
  const [viewMode, setViewMode] = useState("FLAT"); // FLAT or NAME
  const [filterEngineer, setFilterEngineer] = useState("ALL");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [managerMap, setManagerMap] = useState({});

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
      
      const completedStatuses = ["APPROVED", "REJECTED", "APPROVED_BY_L2", "REJECTED_BY_L2"];
      const completedClaims = data.filter(c => completedStatuses.includes(c.requestStatus));      
      completedClaims.sort((a,b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
      
      const uniqueManagerIds = [...new Set(data.map(c => c.managerId))].filter(Boolean);
      const mMap = {};
      for (const mId of uniqueManagerIds) {
        const mDoc = await getDoc(doc(db, "user", mId));
        if (mDoc.exists()) {
          mMap[mId] = mDoc.data().name;
        }
      }
      setManagerMap(mMap);
      
      setClaims(completedClaims);
    } catch (error) {
      console.log(error);
    }
  };

  const getFilteredClaims = () => {
    let list = filterEngineer === "ALL" 
      ? claims 
      : role === "L2" 
        ? claims.filter(c => c.managerId === filterEngineer)
        : claims.filter(c => c.employeeName === filterEngineer);

    if (startDate) {
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      list = list.filter(c => {
        const cDate = (c.startTime || c.createdAt) ? new Date((c.startTime || c.createdAt).seconds * 1000) : new Date(0);
        return cDate >= start;
      });
    }

    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      list = list.filter(c => {
        const cDate = (c.startTime || c.createdAt) ? new Date((c.startTime || c.createdAt).seconds * 1000) : new Date();
        return cDate <= end;
      });
    }

    return list;
  };

  const displayedClaims = getFilteredClaims();

  const exportToExcel = async (filterType) => {
    let filteredForExport = displayedClaims;

    if (filterType === "ACCEPTED") {
      filteredForExport = displayedClaims.filter(c => c.requestStatus.includes("APPROVED"));
    } else if (filterType === "REJECTED") {
      filteredForExport = displayedClaims.filter(c => c.requestStatus.includes("REJECTED"));
    } else if (filterType === "BILLS_ONLY") {
      // Include all claims in bills export so user always gets their Bills sheet
      filteredForExport = displayedClaims;
    } else if (filterType === "ALL") {
      filteredForExport = displayedClaims;
    }

    if (filteredForExport.length === 0) {
      showToast("No claims match this filter to export.", "info");
      return;
    }

    const userMap = {};
    for (const claim of filteredForExport) {
      if (!userMap[claim.employeeUid]) {
        const userDoc = await getDoc(doc(db, "user", claim.employeeUid));
        if (userDoc.exists()) {
          userMap[claim.employeeUid] = userDoc.data();
        }
      }
    }

    // SHEET 1: All Main Claims Data
    const excelData = filteredForExport.map((claim) => {
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
        "NLD/Met": claim.nldMetro || user.baseRegion || "",
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
        "Receipt/ No Receipt": claim.hasReceipt || claim.receiptUrl ? "Receipt Attached" : "No receipt",
        "Travel Hrs (Day/Night)": "Day",
        "Claim Type (Normal/ Exceptional)": claim.claimType === "MISCELLANEOUS" ? "MISC" : "Normal",
        "Purpose of Visit": claim.claimType === "MISCELLANEOUS" ? claim.category : (claim.purpose || ""),
        "2W Trip ID": claim.twoWheelerTripId || claim.travelId || claim.claimId || claim.id || "",
        "PTW ID": claim.ptwId || "",
        "Reference NOC ticket ID": claim.nocTicketId || "",
        "Claim Categories": claim.claimType === "MISCELLANEOUS" ? claim.category : (claim.category || ""),
        "Remark": claim.remark || "",
        "Sub Categories": claim.subCategory || "",
        "Claim Will Cover With Customer Yes/No": claim.customerCover || "No",
        "Owner": user.managerId || "",
        "L1 Manager": managerMap[claim.managerId] || claim.managerId || ""
      };
    });

    // SHEET 2: Dedicated Bills Section (Bills & Receipts with HTML/URLs)
    const billsData = filteredForExport.map((c) => {
      const user = userMap[c.employeeUid] || {};
      const dateStr = (c.startTime || c.createdAt) ? new Date((c.startTime || c.createdAt).seconds * 1000).toLocaleDateString() : "";
      const monthStr = (c.startTime || c.createdAt) ? new Date((c.startTime || c.createdAt).seconds * 1000).toLocaleString('default', { month: 'short' }) + "'" + new Date((c.startTime || c.createdAt).seconds * 1000).getFullYear().toString().substr(-2) : "";

      return {
        "Month": monthStr,
        "Bill / Claim ID": c.travelId || c.claimId || c.id,
        "2W Trip ID": c.twoWheelerTripId || "",
        "LD / Metro": c.nldMetro || user.baseRegion || "",
        "Engineer Name": c.employeeName || "",
        "Emp ID": c.employeeId || "",
        "Bill Type": c.claimType === "MISCELLANEOUS" ? "Miscellaneous Bill" : "Travel Receipt Bill",
        "Category / Purpose": c.claimType === "MISCELLANEOUS" ? c.category : (c.purpose || c.popName || ""),
        "Recover from Customer?": c.customerCover || "No",
        "Date Submitted": dateStr,
        "Bill Amount (₹)": Number(c.claimAmount || 0),
        "Receipt Status": c.hasReceipt || c.receiptUrl ? "Verified / Uploaded" : "No Digital Receipt Attached",
        "HTML / Receipt Link": c.receiptUrl || "No receipt link",
        "Approval Status": c.requestStatus ? c.requestStatus.replace(/_/g, " ") : "PENDING",
        "Engineer Location": user.baseLocation || "",
        "L1 Manager": managerMap[c.managerId] || c.managerId || ""
      };
    });

    // SHEET 3: Miscellaneous Expense Bills Sheet
    const miscData = filteredForExport
      .filter(c => c.claimType === "MISCELLANEOUS")
      .map((c) => {
        const dateStr = (c.startTime || c.createdAt) ? new Date((c.startTime || c.createdAt).seconds * 1000).toLocaleDateString() : "";
        return {
          "Misc ID": c.claimId || c.id,
          "2W Trip ID": c.twoWheelerTripId || "",
          "LD / Metro": c.nldMetro || "",
          "Engineer Name": c.employeeName || "",
          "Emp ID": c.employeeId || "",
          "Expense Category": c.category || "",
          "Sub Category": c.subCategory || "",
          "Recover from Customer?": c.customerCover || "No",
          "Claim Amount (₹)": Number(c.claimAmount || 0),
          "Receipt Attached": c.hasReceipt || c.receiptUrl ? "Yes" : "No",
          "Receipt Link": c.receiptUrl || "None",
          "Remark / Justification": c.remark || "",
          "Date": dateStr,
          "Status": c.requestStatus ? c.requestStatus.replace(/_/g, " ") : "PENDING"
        };
      });

    const workbook = XLSX.utils.book_new();

    const worksheet1 = XLSX.utils.json_to_sheet(excelData.length > 0 ? excelData : [{ "Notice": "No claims data." }]);
    const worksheet2 = XLSX.utils.json_to_sheet(billsData.length > 0 ? billsData : [{ "Notice": "No bills or receipts found." }]);
    const worksheet3 = XLSX.utils.json_to_sheet(miscData.length > 0 ? miscData : [{ "Notice": "No miscellaneous expense bills." }]);

    if (filterType === "BILLS_ONLY") {
      XLSX.utils.book_append_sheet(workbook, worksheet2, "Bills Section");
      XLSX.utils.book_append_sheet(workbook, worksheet1, "All Claims");
      XLSX.utils.book_append_sheet(workbook, worksheet3, "Misc Bills");
    } else {
      XLSX.utils.book_append_sheet(workbook, worksheet1, "All Claims");
      XLSX.utils.book_append_sheet(workbook, worksheet2, "Bills Section");
      XLSX.utils.book_append_sheet(workbook, worksheet3, "Misc Bills");
    }

    XLSX.writeFile(workbook, `Expense_Claims_${filterType || "Export"}_${new Date().toISOString().split('T')[0]}.xlsx`);
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
      { text: "Download Excel", path: "/previous-claims", icon: <FileSpreadsheet size={20} /> },
      { text: "Profile", path: "/profile", icon: <User size={20} /> },
    ];
  };

  const renderGroupedClaims = () => {
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
          <span className={`badge ${claim.requestStatus.includes('REJECTED') ? 'badge-danger' : claim.requestStatus.includes('APPROVED') ? 'badge-success' : 'badge-warning'}`}>
            {claim.requestStatus.replace(/_/g, ' ')}
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
            <h1 className="page-title">Previous Claims / Download Excel</h1>
            <p className="page-subtitle">View and export completed travel claims in multiple formats.</p>
          </div>
        </div>

        {/* ADVANCED EXCEL EXPORT SECTION */}
        <div className="glass-panel" style={{ padding: "20px", marginBottom: "30px", background: "rgba(99, 102, 241, 0.05)", border: "1px solid rgba(99, 102, 241, 0.2)" }}>
          <h3 style={{ marginBottom: "15px", display: "flex", alignItems: "center", gap: "8px", color: "var(--primary-color)" }}>
            <FileSpreadsheet size={20} /> Advanced Excel Export & Date Range Filter
          </h3>

          <div style={{ display: "flex", gap: "16px", marginBottom: "18px", flexWrap: "wrap", alignItems: "center", background: "rgba(0,0,0,0.25)", padding: "12px 16px", borderRadius: "10px", border: "1px solid var(--panel-border)" }}>
            <span style={{ fontSize: "0.9rem", color: "var(--text-secondary)", fontWeight: "600" }}>Export Date Range:</span>
            <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
              <label style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>From:</label>
              <input 
                type="date" 
                value={startDate} 
                onChange={(e) => setStartDate(e.target.value)} 
                style={{ padding: "6px 10px", borderRadius: "6px", border: "1px solid var(--panel-border)", background: "var(--bg-secondary)", color: "var(--text-primary)" }}
              />
            </div>
            <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
              <label style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>To:</label>
              <input 
                type="date" 
                value={endDate} 
                onChange={(e) => setEndDate(e.target.value)} 
                style={{ padding: "6px 10px", borderRadius: "6px", border: "1px solid var(--panel-border)", background: "var(--bg-secondary)", color: "var(--text-primary)" }}
              />
            </div>
            {(startDate || endDate) && (
              <button onClick={() => { setStartDate(""); setEndDate(""); }} style={{ background: "transparent", border: "1px solid var(--danger)", color: "var(--danger)", padding: "4px 10px", borderRadius: "6px", cursor: "pointer", fontSize: "0.8rem", fontWeight: "600" }}>
                Clear Dates
              </button>
            )}
            <span style={{ marginLeft: "auto", fontSize: "0.85rem", color: "#a5b4fc" }}>
              Showing {displayedClaims.length} records in range
            </span>
          </div>

          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
            <Button variant="success" onClick={() => exportToExcel("ACCEPTED")} style={{ flex: 1, minWidth: "200px" }}>
              Accepted Only
            </Button>
            <Button variant="danger" onClick={() => exportToExcel("REJECTED")} style={{ flex: 1, minWidth: "180px" }}>
              Rejected Only
            </Button>
            <Button variant="secondary" onClick={() => exportToExcel("BILLS_ONLY")} style={{ flex: 1, minWidth: "200px", background: "rgba(168, 85, 247, 0.2)", color: "#d8b4fe", border: "1px solid rgba(168, 85, 247, 0.4)" }}>
              Export Bills Section Sheet
            </Button>
            <Button variant="primary" onClick={() => exportToExcel("ALL")} style={{ flex: 1, minWidth: "180px" }}>
              All Claims
            </Button>
          </div>
        </div>

        {role !== "L0" && (
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--panel-border)", paddingBottom: "15px", marginBottom: "20px", flexWrap: "wrap", gap: "15px" }}>
            <h2 style={{ fontSize: "1.2rem", margin: 0 }}>History ({claims.length})</h2>
            
            <div style={{ display: "flex", gap: "15px", flexWrap: "wrap" }}>
              <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                <span style={{ fontSize: "0.9rem", color: "var(--text-muted)" }}>{role === "L2" ? "L1 Manager:" : "Engineer:"}</span>
                <select 
                  value={filterEngineer} 
                  onChange={(e) => setFilterEngineer(e.target.value)}
                  style={{ padding: "8px 12px", borderRadius: "8px", border: "1px solid var(--panel-border)", background: "var(--bg-secondary)", color: "var(--text-primary)", outline: "none", cursor: "pointer" }}
                >
                  <option value="ALL">All {role === "L2" ? "L1 Managers" : "Engineers"}</option>
                  {role === "L2" 
                    ? Object.entries(managerMap).map(([mId, mName]) => (
                        <option key={mId} value={mId}>{mName}</option>
                      ))
                    : Array.from(new Set(claims.map(c => c.employeeName))).filter(Boolean).map(name => (
                        <option key={name} value={name}>{name}</option>
                      ))
                  }
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
