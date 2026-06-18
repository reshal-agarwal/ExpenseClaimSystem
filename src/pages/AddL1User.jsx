import { useState } from "react";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { LayoutDashboard, UserPlus, User } from "lucide-react";

import { auth, db } from "../firebase";
import { Sidebar } from "../components/Sidebar";
import { Input } from "../components/Input";
import { Button } from "../components/Button";

function AddL1User() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [employeeId, setEmployeeId] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = async () => {
    try {
      if (!email || !password || !name) {
        alert("Please fill required fields.");
        return;
      }

      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const uid = userCredential.user.uid;

      await setDoc(doc(db, "user", uid), {
        uid,
        name,
        email,
        employeeId,
        role: "L1",
        createdBy: "L2",
        status: "ACTIVE",
        createdAt: new Date().toISOString(),
      });

      alert("L1 User Created Successfully");
      setName(""); setEmail(""); setEmployeeId(""); setPassword("");

    } catch (error) {
      alert(error.message);
    }
  };

  const menuItems = [
    { text: "Dashboard", path: "/l2", icon: <LayoutDashboard size={20} /> },
    { text: "Add L1 Engineer", path: "/add-l1", icon: <UserPlus size={20} /> },
    { text: "Profile", path: "/profile", icon: <User size={20} /> },
  ];

  return (
    <div className="layout-container">
      <Sidebar menuItems={menuItems} />

      <div className="main-content animate-fade-in">
        <h1 className="page-title">Add L1 Engineer</h1>
        <p className="page-subtitle">Register a new L1 manager under your supervision.</p>

        <div className="glass-panel" style={{ padding: "30px", maxWidth: "600px" }}>
          <Input label="Full Name" placeholder="Jane Doe" value={name} onChange={(e) => setName(e.target.value)} />
          <Input label="Email" type="email" placeholder="jane@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
          <Input label="Employee ID" placeholder="EMP-L1-123" value={employeeId} onChange={(e) => setEmployeeId(e.target.value)} />
          <Input label="Password" type="password" placeholder="Temporary password" value={password} onChange={(e) => setPassword(e.target.value)} />

          <Button onClick={handleSubmit} style={{ marginTop: "20px" }}>
            <UserPlus size={18} /> Create L1 Engineer
          </Button>
        </div>
      </div>
    </div>
  );
}

export default AddL1User;