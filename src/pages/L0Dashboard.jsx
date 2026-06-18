import { useEffect, useState } from "react";
import { doc, getDoc, collection, query, where, getDocs } from "firebase/firestore";
import { 
  LayoutDashboard, Plane, FileText, Clock, AlertTriangle, 
  XCircle, User, IndianRupee, CheckCircle, Navigation 
} from "lucide-react";

import { db } from "../firebase";
import { Sidebar } from "../components/Sidebar";
import { Card } from "../components/Card";

function L0Dashboard() {
  const [userData, setUserData] = useState(null);
  const [stats, setStats] = useState({
    claimed: 0,
    approved: 0,
    paid: 0,
    pending: 0
  });
  const [recentClaims, setRecentClaims] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const uid = localStorage.getItem("uid");

        // Fetch User Data
        const userDoc = await getDoc(doc(db, "user", uid));
        if (userDoc.exists()) {
          setUserData(userDoc.data());
        }

        // Fetch Claims for stats and table
        const qTravel = query(collection(db, "travelRequests"), where("employeeUid", "==", uid));
        const qMisc = query(collection(db, "miscClaims"), where("employeeUid", "==", uid));
        
        const travelSnap = await getDocs(qTravel);
        const miscSnap = await getDocs(qMisc);
        
        let claimed = 0;
        let approved = 0;
        let pending = 0;
        let paid = 0;
        const claimsList = [];

        const processDoc = (doc) => {
          const data = doc.data();
          claimsList.push({ id: doc.id, ...data });
          
          if (data.claimAmount) {
            claimed += data.claimAmount;
            if (data.requestStatus === "APPROVED") {
              approved += data.claimAmount;
            } else if (data.requestStatus === "PAID") {
              paid += data.claimAmount;
            } else if (data.requestStatus === "CLAIM_PENDING_APPROVAL" || data.requestStatus === "PENDING_START_APPROVAL") {
              pending += data.claimAmount;
            }
          }
        };

        travelSnap.forEach(processDoc);
        miscSnap.forEach(processDoc);

        setStats({ claimed, approved, paid, pending });
        
        // Sort by createdAt safely
        claimsList.sort((a, b) => {
          const timeA = a.createdAt?.seconds || 0;
          const timeB = b.createdAt?.seconds || 0;
          return timeB - timeA;
        });
        
        setRecentClaims(claimsList.slice(0, 5));

      } catch (error) {
        console.error(error);
      }
    };

    fetchData();
  }, []);

  const menuItems = [
    { text: "Dashboard", path: "/l0", icon: <LayoutDashboard size={20} /> },
    { text: "Travel Claim", path: "/travel-claim", icon: <Plane size={20} /> },
    { text: "Active Travels", path: "/active-travels", icon: <Navigation size={20} /> },
    { text: "Miscellaneous Claim", path: "/misc-claim", icon: <FileText size={20} /> },
    { text: "Previous Claims", path: "/previous-claims", icon: <Clock size={20} /> },
    { text: "Flagged Claims", path: "/flagged-claims", icon: <AlertTriangle size={20} /> },
    { text: "Rejected Claims", path: "/rejected-claims", icon: <XCircle size={20} /> },
    { text: "Profile", path: "/profile", icon: <User size={20} /> },
  ];

  const getStatusBadge = (status) => {
    if (status?.includes("APPROVED")) return <span className="badge badge-success">{status}</span>;
    if (status?.includes("PENDING")) return <span className="badge badge-pending">{status}</span>;
    if (status?.includes("REJECTED")) return <span className="badge badge-danger">{status}</span>;
    if (status?.includes("FLAGGED")) return <span className="badge badge-danger">{status}</span>;
    return <span className="badge badge-info">{status || "UNKNOWN"}</span>;
  };

  return (
    <div className="layout-container">
      <Sidebar menuItems={menuItems} />

      <div className="main-content animate-fade-in">
        <div>
          <h1 className="page-title">Welcome back, {userData?.name || "Engineer"}</h1>
          <p className="page-subtitle">
            ID: {userData?.employeeId} | Agency: {userData?.agencyName}
          </p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "24px", marginBottom: "40px" }}>
          <Card title="Total Claimed" value={`₹${stats.claimed.toFixed(2)}`} icon={<IndianRupee size={24} />} />
          <Card title="Total Approved" value={`₹${stats.approved.toFixed(2)}`} icon={<CheckCircle size={24} />} />
          <Card title="Total Paid" value={`₹${stats.paid.toFixed(2)}`} icon={<IndianRupee size={24} />} />
          <Card title="Pending Amount" value={`₹${stats.pending.toFixed(2)}`} icon={<Clock size={24} />} />
        </div>

        <div className="glass-panel" style={{ padding: "30px" }}>
          <h2 style={{ fontSize: "1.25rem", marginBottom: "20px" }}>Recent Claims</h2>

          <table className="glass-table">
            <thead>
              <tr>
                <th>Travel ID</th>
                <th>Category</th>
                <th>Amount</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {recentClaims.length === 0 ? (
                <tr>
                  <td colSpan="4" style={{ textAlign: "center", color: "var(--text-muted)", padding: "40px 0" }}>
                    No claims available
                  </td>
                </tr>
              ) : (
                recentClaims.map((claim) => (
                  <tr key={claim.id}>
                    <td style={{ fontWeight: "500" }}>{claim.travelId || claim.claimId || claim.id.substring(0, 8)}</td>
                    <td>{claim.category || claim.purpose || "N/A"}</td>
                    <td>₹{claim.claimAmount?.toFixed(2) || "0.00"}</td>
                    <td>{getStatusBadge(claim.requestStatus)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default L0Dashboard;