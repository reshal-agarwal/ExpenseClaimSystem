import { useEffect, useState } from "react";
import { doc, getDoc, collection, query, where, getDocs } from "firebase/firestore";
import { LayoutDashboard, UserPlus, Users, User, AlertTriangle } from "lucide-react";

import { db } from "../firebase";
import { Sidebar } from "../components/Sidebar";
import { Card } from "../components/Card";

function L2Dashboard() {
  const [userData, setUserData] = useState(null);
  const [stats, setStats] = useState({ activeL1: 0 });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const uid = localStorage.getItem("uid");
        const userDoc = await getDoc(doc(db, "user", uid));
        if (userDoc.exists()) {
          setUserData(userDoc.data());
        }

        const l1Query = query(collection(db, "user"), where("createdBy", "==", "L2"));
        // This is a naive query based on current schema. Better to use createdById if available.
        const l1Snap = await getDocs(l1Query);
        setStats({ activeL1: l1Snap.size });

      } catch (error) {
        console.error(error);
      }
    };

    fetchData();
  }, []);

  const menuItems = [
    { text: "Dashboard", path: "/l2", icon: <LayoutDashboard size={20} /> },
    { text: "Escalated Claims", path: "/l2-escalated", icon: <AlertTriangle size={20} /> },
    { text: "Add L1 Engineer", path: "/add-l1", icon: <UserPlus size={20} /> },
    { text: "Manage Users", path: "/users", icon: <Users size={20} /> },
    { text: "Profile", path: "/profile", icon: <User size={20} /> },
  ];

  return (
    <div className="layout-container">
      <Sidebar menuItems={menuItems} />

      <div className="main-content animate-fade-in">
        <h1 className="page-title">Welcome, {userData?.name || "L2 Manager"}</h1>
        <p className="page-subtitle">ID: {userData?.employeeId} | Overview of your L1 Managers.</p>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "24px", marginBottom: "40px" }}>
          <Card title="Total L1 Engineers" value={stats.activeL1} icon={<Users size={24} />} />
        </div>
      </div>
    </div>
  );
}

export default L2Dashboard;