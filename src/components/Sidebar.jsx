import { useNavigate, useLocation } from "react-router-dom";
import { LogOut, Sun, Moon, TrendingUp, FolderTree } from "lucide-react";
import { signOut } from "firebase/auth";
import { auth } from "../firebase";
import { useTheme } from "../context/ThemeContext";

export function Sidebar({ menuItems = [] }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { theme, toggleTheme } = useTheme();

  const role = localStorage.getItem("role");
  const enhancedMenuItems = [...(menuItems || [])];

  if (["L0", "L1", "L2", "MASTER"].includes(role)) {
    if (!enhancedMenuItems.some(i => i.path === "/insights")) {
      const dashIndex = enhancedMenuItems.findIndex(i => ["/l0", "/l1", "/l2", "/master"].includes(i.path));
      enhancedMenuItems.splice(dashIndex !== -1 ? dashIndex + 1 : 1, 0, {
        text: "Insights & Analytics",
        path: "/insights",
        icon: <TrendingUp size={20} />
      });
    }
  }

  if (role === "MASTER") {
    if (!enhancedMenuItems.some(i => i.path === "/org-tree")) {
      const insIndex = enhancedMenuItems.findIndex(i => i.path === "/insights");
      enhancedMenuItems.splice(insIndex !== -1 ? insIndex + 1 : 1, 0, {
        text: "Org Hierarchy Tree",
        path: "/org-tree",
        icon: <FolderTree size={20} />
      });
    }
  }

  const handleLogout = async () => {
    try {
      await signOut(auth);
      localStorage.removeItem("uid");
      localStorage.removeItem("role");
      navigate("/", { replace: true });
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  return (
    <div style={{
      width: "260px",
      background: "var(--bg-color)",
      borderRight: "1px solid var(--panel-border)",
      color: "var(--text-primary)",
      padding: "24px 20px",
      display: "flex",
      flexDirection: "column",
      gap: "8px"
    }}>
      <div style={{ padding: "0 12px 24px 12px", marginBottom: "12px", borderBottom: "1px solid var(--panel-border)" }}>
        <h2 style={{ fontSize: "1.3rem", fontWeight: "800", letterSpacing: "-0.5px", background: "linear-gradient(to right, #60a5fa, #c084fc)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
          TATA SmartClaim AI
        </h2>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "8px", flex: 1 }}>
        {enhancedMenuItems.map((item, index) => {
        const isActive = location.pathname === item.path;
        return (
          <button
            key={index}
            onClick={() => navigate(item.path)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
              width: "100%",
              padding: "12px 16px",
              background: isActive ? "rgba(99, 102, 241, 0.15)" : "transparent",
              color: isActive ? "#a5b4fc" : "var(--text-secondary)",
              border: "1px solid",
              borderColor: isActive ? "rgba(99, 102, 241, 0.3)" : "transparent",
              borderRadius: "0px",
              cursor: "pointer",
              transition: "var(--transition)",
              fontWeight: isActive ? "600" : "500",
              textAlign: "left"
            }}
            onMouseEnter={(e) => {
              if (!isActive) {
                e.currentTarget.style.background = "var(--panel-border)";
                e.currentTarget.style.color = "var(--text-primary)";
              }
            }}
            onMouseLeave={(e) => {
              if (!isActive) {
                e.currentTarget.style.background = "transparent";
                e.currentTarget.style.color = "var(--text-secondary)";
              }
            }}
          >
            {item.icon}
            {item.text}
          </button>
        );
      })}
      </div>

      <div style={{ marginTop: "auto", borderTop: "1px solid var(--panel-border)", paddingTop: "12px", display: "flex", flexDirection: "column", gap: "8px" }}>
        
        <button
          onClick={toggleTheme}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
            width: "100%",
            padding: "12px 16px",
            background: "transparent",
            color: "var(--text-secondary)",
            border: "1px solid transparent",
            borderRadius: "0px",
            cursor: "pointer",
            transition: "var(--transition)",
            fontWeight: "500",
            textAlign: "left"
          }}
          onMouseEnter={(e) => e.currentTarget.style.color = "var(--text-primary)"}
          onMouseLeave={(e) => e.currentTarget.style.color = "var(--text-secondary)"}
        >
          {theme === "dark" ? <Sun size={20} /> : <Moon size={20} />}
          {theme === "dark" ? "Light Mode" : "Dark Mode"}
        </button>

        <button
          onClick={handleLogout}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
            width: "100%",
            padding: "12px 16px",
            background: "transparent",
            color: "var(--danger-color)",
            border: "1px solid transparent",
            borderRadius: "0px",
            cursor: "pointer",
            transition: "var(--transition)",
            fontWeight: "500",
            textAlign: "left"
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "rgba(239, 68, 68, 0.1)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "transparent";
          }}
        >
          <LogOut size={20} />
          Log Out
        </button>
      </div>
    </div>
  );
}
