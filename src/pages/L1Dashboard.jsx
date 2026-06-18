import { useEffect, useState } from "react";
import { doc, getDoc, collection, query, where, getDocs } from "firebase/firestore";
import { 
  LayoutDashboard, Users, CheckSquare, ClipboardCheck, 
  AlertTriangle, UserPlus, User, FileSpreadsheet 
} from "lucide-react";

import { db } from "../firebase";
import { Sidebar } from "../components/Sidebar";
import { Card } from "../components/Card";

function L1Dashboard() {
  const [userData, setUserData] = useState(null);
  const [stats, setStats] = useState({
    pendingRequests: 0,
    pendingClaims: 0,
    flaggedClaims: 0,
    activeL0: 0
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const uid = localStorage.getItem("uid");
        const userDoc = await getDoc(doc(db, "user", uid));
        if (userDoc.exists()) {
          setUserData(userDoc.data());
        }

        const l0Query = query(collection(db, "user"), where("managerId", "==", uid), where("role", "==", "L0"));
        const l0Snap = await getDocs(l0Query);
        
        const reqQuery = query(collection(db, "travelRequests"), where("managerId", "==", uid));
        const miscQuery = query(collection(db, "miscClaims"), where("managerId", "==", uid));
        
        const reqSnap = await getDocs(reqQuery);
        const miscSnap = await getDocs(miscQuery);

        let pRequests = 0;
        let pClaims = 0;
        let fClaims = 0;

        reqSnap.forEach(doc => {
          const data = doc.data();
          const status = data.requestStatus;
          if (status === "PENDING_START_APPROVAL") pRequests++;
          if (status === "CLAIM_PENDING_APPROVAL" && data.isFlagged) {
            fClaims++;
          } else if (status === "CLAIM_PENDING_APPROVAL") {
            pClaims++;
          }
        });
        
        miscSnap.forEach(doc => {
          const data = doc.data();
          const status = data.requestStatus;
          if (status === "CLAIM_PENDING_APPROVAL" && data.isFlagged) {
            fClaims++;
          } else if (status === "CLAIM_PENDING_APPROVAL") {
            pClaims++;
          }
        });

        setStats({
          activeL0: l0Snap.size,
          pendingRequests: pRequests,
          pendingClaims: pClaims,
          flaggedClaims: fClaims
        });

      } catch (error) {
        console.error(error);
      }
    };

    fetchData();
  }, []);

  const menuItems = [
    { text: "Dashboard", path: "/l1", icon: <LayoutDashboard size={20} /> },
    { text: "Verify Claims", path: "/l1-claims", icon: <ClipboardCheck size={20} /> },
    { text: "Flagged Claims", path: "/flagged-claims", icon: <AlertTriangle size={20} /> },
    { text: "Previous Claims", path: "/previous-claims", icon: <FileSpreadsheet size={20} /> },
    { text: "Add L0 Engineer", path: "/add-l0", icon: <UserPlus size={20} /> },
    { text: "Manage Users", path: "/users", icon: <Users size={20} /> },
    { text: "Profile", path: "/profile", icon: <User size={20} /> },
  ];

  return (
    <div className="layout-container">
      <Sidebar menuItems={menuItems} />

      <div className="main-content animate-fade-in">
        <h1 className="page-title">Welcome, {userData?.name || "L1 Manager"}</h1>
        <p className="page-subtitle">ID: {userData?.employeeId} | Overview of your team's activities.</p>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "24px", marginBottom: "40px" }}>
          <Card title="Pending Travel Requests" value={stats.pendingRequests} icon={<AlertTriangle size={24} />} />
          <Card title="Normal Pending Claims" value={stats.pendingClaims} icon={<ClipboardCheck size={24} />} />
          <Card title="Flagged Claims" value={stats.flaggedClaims} icon={<AlertTriangle color="var(--danger)" size={24} />} />
          <Card title="Active L0 Engineers" value={stats.activeL0} icon={<Users size={24} />} />
        </div>
      </div>
    </div>
  );
}

export default L1Dashboard;