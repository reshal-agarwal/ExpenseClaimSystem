export function Button({ children, onClick, variant = "primary", style = {}, ...props }) {
  const getBackground = () => {
    switch(variant) {
      case "primary": return "var(--primary-color)";
      case "success": return "var(--secondary-color)";
      case "danger": return "var(--danger-color)";
      case "outline": return "transparent";
      default: return "var(--primary-color)";
    }
  };

  const getBorder = () => {
    return variant === "outline" ? "1px solid var(--panel-border)" : "none";
  };

  const getHoverBackground = () => {
    switch(variant) {
      case "primary": return "var(--primary-hover)";
      case "success": return "#059669";
      case "danger": return "#dc2626";
      case "outline": return "rgba(255,255,255,0.05)";
      default: return "var(--primary-hover)";
    }
  };

  return (
    <button
      onClick={onClick}
      style={{
        padding: "12px 24px",
        background: getBackground(),
        color: "white",
        border: getBorder(),
        borderRadius: "10px",
        cursor: "pointer",
        fontWeight: "600",
        fontSize: "0.95rem",
        transition: "var(--transition)",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "8px",
        boxShadow: variant !== "outline" ? "0 4px 6px -1px rgba(0, 0, 0, 0.2)" : "none",
        ...style
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = getHoverBackground();
        e.currentTarget.style.transform = "translateY(-1px)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = getBackground();
        e.currentTarget.style.transform = "translateY(0)";
      }}
      {...props}
    >
      {children}
    </button>
  );
}
