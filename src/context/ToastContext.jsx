import { createContext, useContext, useState, useCallback } from "react";
import { CheckCircle, XCircle, Info, X } from "lucide-react";
import "./ToastContext.css";

const ToastContext = createContext();

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const showToast = useCallback((message, type = "info") => {
    const id = Date.now().toString() + Math.random().toString(36).substr(2, 9);
    setToasts((prev) => [...prev, { id, message, type, leaving: false }]);

    // Auto remove after 4s
    setTimeout(() => {
      removeToast(id);
    }, 4000);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) =>
      prev.map((t) => (t.id === id ? { ...t, leaving: true } : t))
    );

    // Completely remove from DOM after animation completes
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 300);
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="toast-container">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`toast toast-${toast.type} ${toast.leaving ? "toast-leaving" : ""}`}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              {toast.type === "success" && <CheckCircle size={20} color="var(--secondary-color)" />}
              {toast.type === "error" && <XCircle size={20} color="var(--danger-color)" />}
              {toast.type === "info" && <Info size={20} color="var(--primary-color)" />}
              <span style={{ fontSize: "0.95rem" }}>{toast.message}</span>
            </div>
            <button 
              onClick={() => removeToast(toast.id)}
              style={{ background: "transparent", border: "none", color: "var(--text-muted)", cursor: "pointer", display: "flex" }}
            >
              <X size={16} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}
