import { useState, useEffect } from "react";
import { signInWithEmailAndPassword, sendPasswordResetEmail } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import { LogIn, KeyRound } from "lucide-react";
import { Input } from "../components/Input";
import { Button } from "../components/Button";

import { auth, db } from "../firebase";
import { useToast } from "../context/ToastContext";

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const { showToast } = useToast();

  const navigate = useNavigate();

  useEffect(() => {
    const uid = localStorage.getItem("uid");
    const role = localStorage.getItem("role");
    
    if (uid && role) {
      if (role === "MASTER") navigate("/master", { replace: true });
      else if (role === "L2") navigate("/l2", { replace: true });
      else if (role === "L1") navigate("/l1", { replace: true });
      else if (role === "L0") navigate("/l0", { replace: true });
    } else {
      setIsCheckingAuth(false);
    }
  }, [navigate]);
  
  const resetPassword = async () => {
    try {
      if (!email) {
        showToast("Enter your email first", "error");
        return;
      }
      await sendPasswordResetEmail(auth, email);
      showToast("Password reset link sent to your email", "success");
    } catch (error) {
      showToast(error.message, "error");
    }
  };

  const loginUser = async () => {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const uid = userCredential.user.uid;
      localStorage.setItem("uid", uid);

      const userDoc = await getDoc(doc(db, "user", uid));

      if (!userDoc.exists()) {
        showToast("User record not found.", "error");
        return;
      }

      const userData = userDoc.data();
      localStorage.setItem("role", userData.role);
      
      if (userData.role === "MASTER") navigate("/master", { replace: true });
      else if (userData.role === "L2") navigate("/l2", { replace: true });
      else if (userData.role === "L1") navigate("/l1", { replace: true });
      else if (userData.role === "L0") navigate("/l0", { replace: true });
      else showToast("Invalid role assigned.", "error");

    } catch (error) {
      showToast(error.message, "error");
    }
  };

  if (isCheckingAuth) {
    return null;
  }

  return (
    <div className="layout-container" style={{ alignItems: "center", justifyContent: "center" }}>
      <div className="glass-panel animate-fade-in" style={{ width: "400px", padding: "40px", textAlign: "center" }}>
        
        <div style={{ marginBottom: "30px" }}>
          <div style={{ 
            width: "64px", height: "64px", background: "linear-gradient(135deg, #6366f1, #a855f7)", 
            borderRadius: "16px", display: "flex", alignItems: "center", justifyContent: "center", 
            margin: "0 auto 16px auto", boxShadow: "0 8px 16px rgba(99, 102, 241, 0.3)"
          }}>
            <LogIn color="white" size={32} />
          </div>
          <h2 style={{ fontSize: "1.5rem", fontWeight: "700", color: "white" }}>TATA SmartClaim AI</h2>
          <p className="text-secondary" style={{ marginTop: "8px", fontSize: "0.9rem" }}>TATA Enterprise Expense Management Portal</p>
        </div>

        <div style={{ textAlign: "left" }}>
          <Input 
            type="email" 
            placeholder="Enter Email" 
            value={email} 
            onChange={(e) => setEmail(e.target.value)} 
          />
          <Input 
            type="password" 
            placeholder="Enter Password" 
            value={password} 
            onChange={(e) => setPassword(e.target.value)} 
          />
        </div>

        <Button 
          onClick={loginUser} 
          style={{ width: "100%", marginTop: "10px" }}
        >
          Sign In
        </Button>

        <button
          onClick={resetPassword}
          style={{
            marginTop: "20px",
            background: "none",
            border: "none",
            color: "var(--primary-color)",
            cursor: "pointer",
            fontWeight: "500",
            fontSize: "0.85rem",
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
            transition: "var(--transition)"
          }}
          onMouseEnter={(e) => e.target.style.color = "var(--primary-hover)"}
          onMouseLeave={(e) => e.target.style.color = "var(--primary-color)"}
        >
          <KeyRound size={14} /> Forgot Password?
        </button>
      </div>
    </div>
  );
}

export default Login;