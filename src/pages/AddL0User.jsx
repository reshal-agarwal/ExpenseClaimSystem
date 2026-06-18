import { useState } from "react";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { 
  LayoutDashboard, Users, CheckSquare, ClipboardCheck, 
  AlertTriangle, UserPlus, User 
} from "lucide-react";

import { auth, db } from "../firebase";
import { Sidebar } from "../components/Sidebar";
import { Input, Select } from "../components/Input";
import { Button } from "../components/Button";

function AddL0User() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [employeeId, setEmployeeId] = useState("");
  const [password, setPassword] = useState("");

  const [agencyName, setAgencyName] = useState("");
  const [agencyFee, setAgencyFee] = useState("");

  const [baseRegion, setBaseRegion] = useState("");
  const [baseLocation, setBaseLocation] = useState("");

  const [joiningDate, setJoiningDate] = useState("");

  const handleSubmit = async () => {
    try {
      if (!email || !password || !name) {
        alert("Please fill required fields.");
        return;
      }
      
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const uid = userCredential.user.uid;
      const managerId = localStorage.getItem("uid") || "L1_UID";

      await setDoc(doc(db, "user", uid), {
        uid,
        name,
        email,
        employeeId,
        role: "L0",
        agencyName,
        agencyFee: Number(agencyFee),
        baseRegion,
        baseLocation,
        joiningDate,
        managerId,
        status: "ACTIVE",
        createdAt: new Date().toISOString(),
      });

      alert("L0 Engineer Created Successfully");

      setName(""); setEmail(""); setEmployeeId(""); setPassword("");
      setAgencyName(""); setAgencyFee(""); setBaseRegion("");
      setBaseLocation(""); setJoiningDate("");

    } catch (error) {
      alert(error.message);
    }
  };

  const menuItems = [
    { text: "Dashboard", path: "/l1", icon: <LayoutDashboard size={20} /> },
    { text: "Pending Approvals", path: "/l1-approvals", icon: <CheckSquare size={20} /> },
    { text: "Verify Claims", path: "/l1-claims", icon: <ClipboardCheck size={20} /> },
    { text: "Add L0 Engineer", path: "/add-l0", icon: <UserPlus size={20} /> },
    { text: "Profile", path: "/profile", icon: <User size={20} /> },
  ];

  return (
    <div className="layout-container">
      <Sidebar menuItems={menuItems} />

      <div className="main-content animate-fade-in">
        <h1 className="page-title">Add L0 Engineer</h1>
        <p className="page-subtitle">Register a new field engineer under your supervision.</p>

        <div className="glass-panel" style={{ padding: "30px", maxWidth: "800px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
            <Input label="Full Name" placeholder="John Doe" value={name} onChange={(e) => setName(e.target.value)} />
            <Input label="Email" type="email" placeholder="john@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
            
            <Input label="Employee ID" placeholder="EMP-123" value={employeeId} onChange={(e) => setEmployeeId(e.target.value)} />
            <Input label="Password" type="password" placeholder="Temporary password" value={password} onChange={(e) => setPassword(e.target.value)} />

            <Input label="Agency Name" placeholder="Tech Agency" value={agencyName} onChange={(e) => setAgencyName(e.target.value)} />
            <Input label="Agency Fee (%)" type="number" placeholder="10" value={agencyFee} onChange={(e) => setAgencyFee(e.target.value)} />

            <Select label="Base Region" value={baseRegion} onChange={(e) => setBaseRegion(e.target.value)}>
              <option value="">Select Region</option>
              <option value="NLD">NLD</option>
              <option value="METRO">METRO</option>
            </Select>
            <Input label="Base Location" placeholder="e.g. Bangalore" value={baseLocation} onChange={(e) => setBaseLocation(e.target.value)} />

            <Input label="Joining Date" type="date" value={joiningDate} onChange={(e) => setJoiningDate(e.target.value)} />
          </div>

          <div style={{ marginTop: "24px", textAlign: "right" }}>
            <Button onClick={handleSubmit}>
              <UserPlus size={18} /> Create L0 Engineer
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AddL0User;