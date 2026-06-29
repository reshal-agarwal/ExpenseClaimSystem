import { useState } from "react";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { LayoutDashboard, UserPlus, Users, User, ShieldAlert, FileSpreadsheet } from "lucide-react";

import { auth, db } from "../firebase";
import { Sidebar } from "../components/Sidebar";
import { Input } from "../components/Input";
import { Button } from "../components/Button";
import { useToast } from "../context/ToastContext";

function AddL2User() {
  const { showToast } = useToast();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [employeeId, setEmployeeId] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = async () => {
    try {
      if (!email || !password || !name) {
        showToast("Please fill required fields.", "error");
        return;
      }

      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const uid = userCredential.user.uid;

      const managerId = localStorage.getItem("uid") || "MASTER";

      await setDoc(doc(db, "user", uid), {
        uid,
        name,
        email,
        employeeId,
        role: "L2",
        managerId,
        status: "ACTIVE",
        createdAt: new Date().toISOString(),
      });

      showToast("L2 User Created Successfully", "success");
      setName(""); setEmail(""); setEmployeeId(""); setPassword("");

    } catch (error) {
      console.error(error);
      showToast(error.message, "error");
    }
  };

  const menuItems = [
    { text: "Dashboard", path: "/master", icon: <LayoutDashboard size={20} /> },
    { text: "Download Excel", path: "/previous-claims", icon: <FileSpreadsheet size={20} /> },
    { text: "Add L2 User", path: "/add-l2", icon: <UserPlus size={20} /> },
    { text: "View All Users", path: "/users", icon: <Users size={20} /> },
    { text: "System Logs", path: "/logs", icon: <ShieldAlert size={20} /> },
    { text: "Profile", path: "/profile", icon: <User size={20} /> },
  ];

  return (
    <div className="layout-container">
      <Sidebar menuItems={menuItems} />

      <div className="main-content animate-fade-in">
        <h1 className="page-title">Add L2 Manager</h1>
        <p className="page-subtitle">Register a new L2 system administrator.</p>

        <div className="glass-panel" style={{ padding: "30px", maxWidth: "600px" }}>
          <Input label="Full Name" placeholder="Admin Name" value={name} onChange={(e) => setName(e.target.value)} />
          <Input label="Email" type="email" placeholder="admin@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
          <Input label="Employee ID" placeholder="EMP-L2-001" value={employeeId} onChange={(e) => setEmployeeId(e.target.value)} />
          <Input label="Password" type="password" placeholder="Secure password" value={password} onChange={(e) => setPassword(e.target.value)} />

          <Button onClick={handleSubmit} style={{ marginTop: "20px" }}>
            <UserPlus size={18} /> Create L2 User
          </Button>
        </div>
      </div>
    </div>
  );
}

export default AddL2User;