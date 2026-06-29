import { useEffect, useState } from "react";
import { doc, getDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { 
  LayoutDashboard, Plane, FileText, Clock, AlertTriangle, 
  XCircle, User, CheckCircle, Navigation, ClipboardCheck, 
  FileSpreadsheet, UserPlus, Users, ShieldAlert, Edit, Check, X
} from "lucide-react";

import { db } from "../firebase";
import { Sidebar } from "../components/Sidebar";
import { Button } from "../components/Button";
import { Input } from "../components/Input";
import { useToast } from "../context/ToastContext";

function Profile() {
  const [userData, setUserData] = useState(null);
  const [role, setRole] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({ name: "", employeeId: "" });
  const { showToast } = useToast();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const uid = localStorage.getItem("uid");
        const currentRole = localStorage.getItem("role");
        setRole(currentRole);

        if (uid) {
          const userDoc = await getDoc(doc(db, "user", uid));
          if (userDoc.exists()) {
            setUserData(userDoc.data());
          }
        }
      } catch (error) {
        console.error("Error fetching user data:", error);
      }
    };

    fetchData();
  }, []);

  const startEditing = () => {
    setIsEditing(true);
    setEditForm({
      name: userData?.name || "",
      employeeId: userData?.employeeId || ""
    });
  };

  const cancelEditing = () => {
    setIsEditing(false);
  };

  const saveProfileEdit = async () => {
    try {
      if (!editForm.name.trim() || !editForm.employeeId.trim()) {
        showToast("Name and Employee ID cannot be empty", "error");
        return;
      }
      const uid = localStorage.getItem("uid");
      await updateDoc(doc(db, "user", uid), {
        name: editForm.name.trim(),
        employeeId: editForm.employeeId.trim(),
        updatedAt: serverTimestamp()
      });
      setUserData({ ...userData, name: editForm.name.trim(), employeeId: editForm.employeeId.trim() });
      localStorage.setItem("name", editForm.name.trim());
      showToast("Profile updated successfully!", "success");
      setIsEditing(false);
    } catch (error) {
      console.error("Error updating profile:", error);
      showToast("Failed to update profile", "error");
    }
  };

  let menuItems = [];
  if (role === "L0") {
    menuItems = [
      { text: "Dashboard", path: "/l0", icon: <LayoutDashboard size={20} /> },
      { text: "Travel Claim", path: "/travel-claim", icon: <Plane size={20} /> },
      { text: "Active Travels", path: "/active-travels", icon: <Navigation size={20} /> },
      { text: "Miscellaneous Claim", path: "/misc-claim", icon: <FileText size={20} /> },
      { text: "Previous Claims", path: "/previous-claims", icon: <Clock size={20} /> },
      { text: "Flagged Claims", path: "/flagged-claims", icon: <AlertTriangle size={20} /> },
      { text: "Rejected Claims", path: "/rejected-claims", icon: <XCircle size={20} /> },
      { text: "Profile", path: "/profile", icon: <User size={20} /> },
    ];
  } else if (role === "L1") {
    menuItems = [
      { text: "Dashboard", path: "/l1", icon: <LayoutDashboard size={20} /> },
      { text: "Verify Claims", path: "/l1-claims", icon: <ClipboardCheck size={20} /> },
      { text: "Flagged Claims", path: "/flagged-claims", icon: <AlertTriangle size={20} /> },
      { text: "Previous Claims", path: "/previous-claims", icon: <FileSpreadsheet size={20} /> },
      { text: "Add L0 Engineer", path: "/add-l0", icon: <UserPlus size={20} /> },
      { text: "Profile", path: "/profile", icon: <User size={20} /> },
    ];
  } else if (role === "L2") {
    menuItems = [
      { text: "Dashboard", path: "/l2", icon: <LayoutDashboard size={20} /> },
      { text: "Escalated Claims", path: "/l2-escalated", icon: <AlertTriangle size={20} /> },
      { text: "Download Excel", path: "/previous-claims", icon: <FileSpreadsheet size={20} /> },
      { text: "Add L1 Engineer", path: "/add-l1", icon: <UserPlus size={20} /> },
      { text: "Manage Users", path: "/users", icon: <Users size={20} /> },
      { text: "Profile", path: "/profile", icon: <User size={20} /> },
    ];
  } else if (role === "MASTER") {
    menuItems = [
      { text: "Dashboard", path: "/master", icon: <LayoutDashboard size={20} /> },
      { text: "Download Excel", path: "/previous-claims", icon: <FileSpreadsheet size={20} /> },
      { text: "Add L2 User", path: "/add-l2", icon: <UserPlus size={20} /> },
      { text: "Manage Users", path: "/users", icon: <Users size={20} /> },
      { text: "System Logs", path: "/logs", icon: <ShieldAlert size={20} /> },
      { text: "Profile", path: "/profile", icon: <User size={20} /> },
    ];
  }

  return (
    <div className="layout-container">
      <Sidebar menuItems={menuItems} />

      <div className="main-content animate-fade-in">
        <h1 className="page-title">User Profile</h1>
        <p className="page-subtitle">View your profile details.</p>

        <div className="glass-panel" style={{ padding: "30px", maxWidth: "800px" }}>
          {!userData ? (
            <p>Loading profile...</p>
          ) : (
            <>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", marginBottom: "25px" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  <span style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>Full Name</span>
                  {isEditing ? (
                    <Input value={editForm.name} onChange={(e) => setEditForm({...editForm, name: e.target.value})} style={{ marginBottom: 0 }} />
                  ) : (
                    <span style={{ fontSize: "1rem", fontWeight: "500", color: "var(--text-primary)" }}>{userData.name || "N/A"}</span>
                  )}
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  <span style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>Email</span>
                  <span style={{ fontSize: "1rem", fontWeight: "500", color: "var(--text-primary)" }}>{userData.email || "N/A"}</span>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  <span style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>Employee ID</span>
                  {isEditing ? (
                    <Input value={editForm.employeeId} onChange={(e) => setEditForm({...editForm, employeeId: e.target.value})} style={{ marginBottom: 0 }} />
                  ) : (
                    <span style={{ fontSize: "1rem", fontWeight: "500", color: "var(--text-primary)" }}>{userData.employeeId || "N/A"}</span>
                  )}
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  <span style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>Role</span>
                  <span style={{ fontSize: "1rem", fontWeight: "500", color: "var(--text-primary)" }}>{userData.role || "N/A"}</span>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  <span style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>Agency Name</span>
                  <span style={{ fontSize: "1rem", fontWeight: "500", color: "var(--text-primary)" }}>{userData.agencyName || "N/A"}</span>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  <span style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>Agency Fee (%)</span>
                  <span style={{ fontSize: "1rem", fontWeight: "500", color: "var(--text-primary)" }}>{userData.agencyFee != null ? userData.agencyFee : "N/A"}</span>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  <span style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>Base Region</span>
                  <span style={{ fontSize: "1rem", fontWeight: "500", color: "var(--text-primary)" }}>{userData.baseRegion || "N/A"}</span>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  <span style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>Base Location</span>
                  <span style={{ fontSize: "1rem", fontWeight: "500", color: "var(--text-primary)" }}>{userData.baseLocation || "N/A"}</span>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  <span style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>Joining Date</span>
                  <span style={{ fontSize: "1rem", fontWeight: "500", color: "var(--text-primary)" }}>{userData.joiningDate || "N/A"}</span>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  <span style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>Manager ID</span>
                  <span style={{ fontSize: "1rem", fontWeight: "500", color: "var(--text-primary)" }}>{userData.managerId || "N/A"}</span>
                </div>
              </div>

              {isEditing ? (
                <div style={{ display: "flex", gap: "10px", maxWidth: "300px" }}>
                  <Button variant="success" onClick={saveProfileEdit} style={{ flex: 1, justifyContent: "center" }}>
                    <Check size={18} /> Save
                  </Button>
                  <Button variant="outline" onClick={cancelEditing} style={{ flex: 1, justifyContent: "center" }}>
                    <X size={18} /> Cancel
                  </Button>
                </div>
              ) : (
                <Button variant="primary" onClick={startEditing} style={{ maxWidth: "250px", justifyContent: "center" }}>
                  <Edit size={18} /> Edit Name & ID
                </Button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default Profile;
