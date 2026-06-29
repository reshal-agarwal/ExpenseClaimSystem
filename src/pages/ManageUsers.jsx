import { useEffect, useState } from "react";
import { collection, query, where, getDocs, doc, setDoc, deleteDoc, serverTimestamp } from "firebase/firestore";
import { LayoutDashboard, Users, User, Trash2, UserPlus, FileSpreadsheet, AlertTriangle, ClipboardCheck, ShieldAlert } from "lucide-react";

import { db } from "../firebase";
import { Sidebar } from "../components/Sidebar";
import { Button } from "../components/Button";
import { useToast } from "../context/ToastContext";

function ManageUsers() {
  const [subordinates, setSubordinates] = useState([]);
  const [role, setRole] = useState("L1");
  const { showToast } = useToast();

  useEffect(() => {
    fetchSubordinates();
  }, []);

  const fetchSubordinates = async () => {
    try {
      const uid = localStorage.getItem("uid");
      const currentRole = localStorage.getItem("role");
      setRole(currentRole);

      let q;
      if (currentRole === "MASTER") {
        // Master sees all L2s
        q = query(collection(db, "user"), where("role", "==", "L2"));
      } else if (currentRole === "L2") {
        // L2 sees L1s they manage
        q = query(collection(db, "user"), where("role", "==", "L1"), where("managerId", "==", uid));
      } else if (currentRole === "L1") {
        // L1 sees L0s they manage
        q = query(collection(db, "user"), where("role", "==", "L0"), where("managerId", "==", uid));
      } else {
        return;
      }

      const snap = await getDocs(q);
      const usersList = [];
      snap.forEach(doc => {
        usersList.push({ id: doc.id, ...doc.data() });
      });

      setSubordinates(usersList);
    } catch (error) {
      console.log(error);
      showToast("Failed to fetch users", "error");
    }
  };

  const handleDeleteUser = async (userObj) => {
    if (!window.confirm(`Are you sure you want to delete ${userObj.name}? They will no longer be able to log in.`)) return;

    try {
      // 1. Copy user to deletedUsers collection
      const deletedUserRef = doc(db, "deletedUsers", userObj.id);
      await setDoc(deletedUserRef, {
        ...userObj,
        deletedAt: serverTimestamp(),
        deletedBy: localStorage.getItem("uid")
      });

      // 2. Delete user from active 'user' collection
      const activeUserRef = doc(db, "user", userObj.id);
      await deleteDoc(activeUserRef);

      showToast(`User ${userObj.name} deleted and archived successfully.`, "success");
      fetchSubordinates();
    } catch (error) {
      console.error("Error deleting user:", error);
      showToast("Failed to delete user.", "error");
    }
  };

  const getMenuItems = () => {
    if (role === "MASTER") {
      return [
        { text: "Dashboard", path: "/master", icon: <LayoutDashboard size={20} /> },
        { text: "Add L2 User", path: "/add-l2", icon: <UserPlus size={20} /> },
        { text: "Manage Users", path: "/users", icon: <Users size={20} /> },
        { text: "System Logs", path: "/logs", icon: <ShieldAlert size={20} /> },
        { text: "Profile", path: "/profile", icon: <User size={20} /> },
      ];
    } else if (role === "L2") {
      return [
        { text: "Dashboard", path: "/l2", icon: <LayoutDashboard size={20} /> },
        { text: "Escalated Claims", path: "/l2-escalated", icon: <AlertTriangle size={20} /> },
        { text: "Download Excel", path: "/previous-claims", icon: <FileSpreadsheet size={20} /> },
        { text: "Add L1 Engineer", path: "/add-l1", icon: <UserPlus size={20} /> },
        { text: "Manage Users", path: "/users", icon: <Users size={20} /> },
        { text: "Profile", path: "/profile", icon: <User size={20} /> },
      ];
    } else {
      return [
        { text: "Dashboard", path: "/l1", icon: <LayoutDashboard size={20} /> },
        { text: "Verify Claims", path: "/l1-claims", icon: <ClipboardCheck size={20} /> },
        { text: "Flagged Claims", path: "/flagged-claims", icon: <AlertTriangle size={20} /> },
        { text: "Previous Claims", path: "/previous-claims", icon: <FileSpreadsheet size={20} /> },
        { text: "Add L0 Engineer", path: "/add-l0", icon: <UserPlus size={20} /> },
        { text: "Manage Users", path: "/users", icon: <Users size={20} /> },
        { text: "Profile", path: "/profile", icon: <User size={20} /> },
      ];
    }
  };

  const getSubordinateRoleName = () => {
    if (role === "MASTER") return "L2 Engineers";
    if (role === "L2") return "L1 Managers";
    return "L0 Engineers";
  };

  return (
    <div className="layout-container">
      <Sidebar menuItems={getMenuItems()} />

      <div className="main-content animate-fade-in">
        <h1 className="page-title">Manage {getSubordinateRoleName()}</h1>
        <p className="page-subtitle">View and delete your assigned subordinates.</p>

        {subordinates.length === 0 && (
          <div className="glass-panel" style={{ padding: "40px", textAlign: "center", color: "var(--text-muted)" }}>
            <p>No active {getSubordinateRoleName()} found.</p>
          </div>
        )}

        <div style={{ display: "grid", gap: "15px", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))" }}>
          {subordinates.map((userObj) => (
            <div key={userObj.id} className="glass-panel" style={{ padding: "20px", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
              <div>
                <h3 style={{ fontSize: "1.2rem", marginBottom: "8px", color: "var(--primary-color)" }}>{userObj.name}</h3>
                <p className="text-secondary" style={{ fontSize: "0.9rem", marginBottom: "4px" }}>
                  <strong style={{ color: "var(--text-primary)" }}>Emp ID:</strong> {userObj.employeeId || "N/A"}
                </p>
                <p className="text-secondary" style={{ fontSize: "0.9rem", marginBottom: "4px" }}>
                  <strong style={{ color: "var(--text-primary)" }}>Email:</strong> {userObj.email}
                </p>
                {userObj.baseRegion && (
                  <p className="text-secondary" style={{ fontSize: "0.9rem", marginBottom: "4px" }}>
                    <strong style={{ color: "var(--text-primary)" }}>Region:</strong> {userObj.baseRegion}
                  </p>
                )}
                {userObj.baseLocation && (
                  <p className="text-secondary" style={{ fontSize: "0.9rem", marginBottom: "15px" }}>
                    <strong style={{ color: "var(--text-primary)" }}>Location:</strong> {userObj.baseLocation}
                  </p>
                )}
              </div>
              <Button variant="danger" onClick={() => handleDeleteUser(userObj)} style={{ width: "100%", justifyContent: "center" }}>
                <Trash2 size={18} /> Delete Account
              </Button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default ManageUsers;
