import { useEffect, useState } from "react";
import { doc, getDoc, collection, query, where, getDocs } from "firebase/firestore";
import { LayoutDashboard, UserPlus, Users, User, ShieldAlert, FileSpreadsheet } from "lucide-react";

import { db } from "../firebase";
import { Sidebar } from "../components/Sidebar";
import { Card } from "../components/Card";

function MasterDashboard() {
  const [userData, setUserData] = useState(null);
  const [stats, setStats] = useState({ activeL2: 0, totalUsers: 0 });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const uid = localStorage.getItem("uid");
        if (uid) {
          const userDoc = await getDoc(doc(db, "user", uid));
          if (userDoc.exists()) {
            setUserData(userDoc.data());
          }
        }

        const l2Query = query(collection(db, "user"), where("role", "==", "L2"));
        const l2Snap = await getDocs(l2Query);

        const allUsersSnap = await getDocs(collection(db, "user"));

        setStats({
          activeL2: l2Snap.size,
          totalUsers: allUsersSnap.size
        });

      } catch (error) {
        console.error(error);
      }
    };

    fetchData();
  }, []);

  const menuItems = [
    { text: "Dashboard", path: "/master", icon: <LayoutDashboard size={20} /> },
    { text: "Download Excel", path: "/previous-claims", icon: <FileSpreadsheet size={20} /> },
    { text: "Add L2 User", path: "/add-l2", icon: <UserPlus size={20} /> },
    { text: "Manage Users", path: "/users", icon: <Users size={20} /> },
    { text: "System Logs", path: "/logs", icon: <ShieldAlert size={20} /> },
    { text: "Profile", path: "/profile", icon: <User size={20} /> },
  ];

  return (
    <div className="layout-container">
      <Sidebar menuItems={menuItems} />

      <div className="main-content animate-fade-in">
        <h1 className="page-title">Master Administration</h1>
        <p className="page-subtitle">Welcome back, {userData?.name || "Master"} | Superadmin Overview.</p>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "24px", marginBottom: "40px" }}>
          <Card title="Total Users" value={stats.totalUsers} icon={<Users size={24} />} />
          <Card title="L2 Managers" value={stats.activeL2} icon={<User size={24} />} />
        </div>
      </div>
    </div>
  );
}

export default MasterDashboard;