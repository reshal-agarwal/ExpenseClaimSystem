export function Input({ label, ...props }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "6px", marginBottom: "16px", width: "100%" }}>
      {label && (
        <label style={{ fontSize: "0.875rem", fontWeight: "500", color: "var(--text-secondary)" }}>
          {label}
        </label>
      )}
      <input
        style={{
          width: "100%",
          padding: "12px 16px",
          background: "rgba(0, 0, 0, 0.2)",
          border: "1px solid var(--panel-border)",
          borderRadius: "10px",
          color: "var(--text-primary)",
          fontSize: "0.95rem",
          transition: "var(--transition)",
          outline: "none"
        }}
        onFocus={(e) => {
          e.target.style.borderColor = "var(--primary-color)";
          e.target.style.boxShadow = "0 0 0 2px rgba(99, 102, 241, 0.2)";
        }}
        onBlur={(e) => {
          e.target.style.borderColor = "var(--panel-border)";
          e.target.style.boxShadow = "none";
        }}
        {...props}
      />
    </div>
  );
}

export function Select({ label, children, ...props }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "6px", marginBottom: "16px", width: "100%" }}>
      {label && (
        <label style={{ fontSize: "0.875rem", fontWeight: "500", color: "var(--text-secondary)" }}>
          {label}
        </label>
      )}
      <select
        style={{
          width: "100%",
          padding: "12px 16px",
          background: "rgba(0, 0, 0, 0.2)",
          border: "1px solid var(--panel-border)",
          borderRadius: "10px",
          color: "var(--text-primary)",
          fontSize: "0.95rem",
          transition: "var(--transition)",
          outline: "none",
          appearance: "none",
          cursor: "pointer"
        }}
        onFocus={(e) => {
          e.target.style.borderColor = "var(--primary-color)";
          e.target.style.boxShadow = "0 0 0 2px rgba(99, 102, 241, 0.2)";
        }}
        onBlur={(e) => {
          e.target.style.borderColor = "var(--panel-border)";
          e.target.style.boxShadow = "none";
        }}
        {...props}
      >
        {children}
      </select>
    </div>
  );
}
