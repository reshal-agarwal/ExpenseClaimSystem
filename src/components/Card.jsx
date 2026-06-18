export function Card({ title, value, icon, style = {} }) {
  return (
    <div className="glass-panel" style={{ padding: "24px", display: "flex", alignItems: "center", gap: "20px", ...style }}>
      {icon && (
        <div style={{ 
          width: "48px", 
          height: "48px", 
          borderRadius: "12px", 
          background: "rgba(99, 102, 241, 0.15)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#a5b4fc"
        }}>
          {icon}
        </div>
      )}
      <div>
        <h3 style={{ fontSize: "0.875rem", color: "var(--text-secondary)", fontWeight: "500", marginBottom: "4px" }}>
          {title}
        </h3>
        <h2 style={{ fontSize: "1.75rem", fontWeight: "700", color: "var(--text-primary)" }}>
          {value}
        </h2>
      </div>
    </div>
  );
}
