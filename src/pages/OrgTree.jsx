import { useEffect, useState, useMemo } from "react";
import { collection, getDocs } from "firebase/firestore";
import { 
  FolderTree, ChevronDown, ChevronRight, User, Users, Shield, 
  Search, MapPin, Briefcase, Mail, Award
} from "lucide-react";

import { db } from "../firebase";
import { Sidebar } from "../components/Sidebar";
import { Input } from "../components/Input";
import { Button } from "../components/Button";

function OrgTree() {
  const [loading, setLoading] = useState(true);
  const [usersList, setUsersList] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");

  // Expand states for nodes
  const [expandedL2, setExpandedL2] = useState({});
  const [expandedL1, setExpandedL1] = useState({});

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const snap = await getDocs(collection(db, "user"));
      const data = [];
      snap.forEach((d) => {
        data.push({ id: d.id, ...d.data() });
      });
      setUsersList(data);
    } catch (error) {
      console.error("Error fetching hierarchy:", error);
    } finally {
      setLoading(false);
    }
  };

  // Filtered users by search
  const filteredUsers = useMemo(() => {
    if (!searchQuery.trim()) return usersList;
    const q = searchQuery.toLowerCase();
    return usersList.filter((u) => 
      (u.name || "").toLowerCase().includes(q) ||
      (u.email || "").toLowerCase().includes(q) ||
      (u.employeeId || "").toLowerCase().includes(q) ||
      (u.baseRegion || "").toLowerCase().includes(q)
    );
  }, [usersList, searchQuery]);

  const l2List = useMemo(() => filteredUsers.filter((u) => u.role === "L2"), [filteredUsers]);
  const l1List = useMemo(() => filteredUsers.filter((u) => u.role === "L1"), [filteredUsers]);
  const l0List = useMemo(() => filteredUsers.filter((u) => u.role === "L0"), [filteredUsers]);

  const toggleL2 = (id) => {
    setExpandedL2((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const toggleL1 = (id) => {
    setExpandedL1((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const expandAll = () => {
    const l2Map = {};
    const l1Map = {};
    l2List.forEach((u) => { l2Map[u.id] = true; });
    l1List.forEach((u) => { l1Map[u.id] = true; });
    setExpandedL2(l2Map);
    setExpandedL1(l1Map);
  };

  const collapseAll = () => {
    setExpandedL2({});
    setExpandedL1({});
  };

  const getL1sForL2 = (l2Id) => {
    return l1List.filter((l1) => l1.managerId === l2Id || (l2List.length === 1 && !l1.managerId));
  };

  const getL0sForL1 = (l1Id) => {
    return l0List.filter((l0) => l0.managerId === l1Id);
  };

  // Check unassigned
  const assignedL1Ids = new Set();
  l2List.forEach((l2) => {
    getL1sForL2(l2.id).forEach((l1) => assignedL1Ids.add(l1.id));
  });
  const unassignedL1s = l1List.filter((l1) => !assignedL1Ids.has(l1.id));

  const assignedL0Ids = new Set();
  l1List.forEach((l1) => {
    getL0sForL1(l1.id).forEach((l0) => assignedL0Ids.add(l0.id));
  });
  const unassignedL0s = l0List.filter((l0) => !assignedL0Ids.has(l0.id));

  const menuItems = [
    { text: "Dashboard", path: "/master", icon: <FolderTree size={20} /> },
  ];

  return (
    <div className="layout-container">
      <Sidebar menuItems={menuItems} />

      <div className="main-content animate-fade-in">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "20px", marginBottom: "24px" }}>
          <div>
            <h1 className="page-title">Organizational Hierarchy Tree</h1>
            <p className="page-subtitle">Master L3 overview of all L2 Managers, L1 Supervisors, and L0 Field Engineers.</p>
          </div>

          <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
            <Button variant="secondary" onClick={expandAll} style={{ fontSize: "0.85rem" }}>
              Expand All
            </Button>
            <Button variant="secondary" onClick={collapseAll} style={{ fontSize: "0.85rem" }}>
              Collapse All
            </Button>
          </div>
        </div>

        {/* STATS BAR */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "16px", marginBottom: "24px" }}>
          <div className="glass-panel" style={{ padding: "16px", display: "flex", alignItems: "center", gap: "12px", borderLeft: "3px solid #c084fc" }}>
            <Shield size={28} style={{ color: "#c084fc" }} />
            <div>
              <strong style={{ fontSize: "1.2rem", display: "block" }}>1</strong>
              <span className="text-secondary" style={{ fontSize: "0.8rem" }}>L3 Master Admin</span>
            </div>
          </div>
          <div className="glass-panel" style={{ padding: "16px", display: "flex", alignItems: "center", gap: "12px", borderLeft: "3px solid #818cf8" }}>
            <Award size={28} style={{ color: "#818cf8" }} />
            <div>
              <strong style={{ fontSize: "1.2rem", display: "block" }}>{l2List.length}</strong>
              <span className="text-secondary" style={{ fontSize: "0.8rem" }}>L2 Managers</span>
            </div>
          </div>
          <div className="glass-panel" style={{ padding: "16px", display: "flex", alignItems: "center", gap: "12px", borderLeft: "3px solid #34d399" }}>
            <Users size={28} style={{ color: "#34d399" }} />
            <div>
              <strong style={{ fontSize: "1.2rem", display: "block" }}>{l1List.length}</strong>
              <span className="text-secondary" style={{ fontSize: "0.8rem" }}>L1 Supervisors</span>
            </div>
          </div>
          <div className="glass-panel" style={{ padding: "16px", display: "flex", alignItems: "center", gap: "12px", borderLeft: "3px solid #fbbf24" }}>
            <User size={28} style={{ color: "#fbbf24" }} />
            <div>
              <strong style={{ fontSize: "1.2rem", display: "block" }}>{l0List.length}</strong>
              <span className="text-secondary" style={{ fontSize: "0.8rem" }}>L0 Engineers</span>
            </div>
          </div>
        </div>

        {/* SEARCH BAR */}
        <div className="glass-panel" style={{ padding: "16px 20px", marginBottom: "24px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <Search size={20} style={{ color: "var(--text-muted)" }} />
            <input
              type="text"
              placeholder="Search hierarchy by engineer name, employee ID, email, or region..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ width: "100%", background: "transparent", border: "none", color: "var(--text-primary)", fontSize: "0.95rem", outline: "none" }}
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery("")} style={{ background: "transparent", border: "none", color: "var(--text-muted)", cursor: "pointer", fontSize: "0.85rem" }}>Clear</button>
            )}
          </div>
        </div>

        {loading ? (
          <div className="glass-panel" style={{ padding: "60px", textAlign: "center", color: "var(--text-muted)" }}>
            <p>Constructing organizational tree...</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            
            {/* L3 MASTER NODE */}
            <div className="glass-panel" style={{ padding: "20px", border: "1px solid #c084fc", background: "rgba(192, 132, 252, 0.05)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <div style={{ width: "42px", height: "42px", borderRadius: "50%", background: "linear-gradient(135deg, #c084fc, #818cf8)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "700", fontSize: "1.2rem" }}>
                  L3
                </div>
                <div>
                  <h3 style={{ fontSize: "1.2rem", margin: 0, color: "#f8fafc" }}>Master Administration</h3>
                  <span style={{ fontSize: "0.85rem", color: "#c084fc" }}>Apex System Control & Governance</span>
                </div>
              </div>
            </div>

            {/* L2 MANAGERS LIST */}
            <div style={{ paddingLeft: "24px", borderLeft: "2px dashed rgba(129, 140, 248, 0.3)", display: "flex", flexDirection: "column", gap: "16px" }}>
              {l2List.map((l2) => {
                const subL1s = getL1sForL2(l2.id);
                const isExpanded = expandedL2[l2.id] !== false; // default expanded

                return (
                  <div key={l2.id} className="glass-panel" style={{ overflow: "hidden", borderLeft: "4px solid #818cf8" }}>
                    
                    {/* L2 HEADER */}
                    <div 
                      onClick={() => toggleL2(l2.id)}
                      style={{ padding: "18px 20px", display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer", background: "rgba(255, 255, 255, 0.02)", transition: "background 0.2s" }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                        {isExpanded ? <ChevronDown size={20} style={{ color: "#818cf8" }} /> : <ChevronRight size={20} style={{ color: "#818cf8" }} />}
                        <div style={{ width: "36px", height: "36px", borderRadius: "8px", background: "rgba(129, 140, 248, 0.2)", display: "flex", alignItems: "center", justifyContent: "center", color: "#818cf8", fontWeight: "700" }}>
                          L2
                        </div>
                        <div>
                          <h4 style={{ fontSize: "1.1rem", margin: 0, color: "var(--text-primary)" }}>{l2.name}</h4>
                          <span className="text-secondary" style={{ fontSize: "0.85rem", display: "flex", alignItems: "center", gap: "12px" }}>
                            <span>EMP ID: <strong style={{ color: "#a5b4fc" }}>{l2.employeeId || "N/A"}</strong></span>
                            <span>•</span>
                            <span style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}><Mail size={12} /> {l2.email}</span>
                          </span>
                        </div>
                      </div>

                      <div>
                        <span className="badge badge-info" style={{ background: "rgba(129, 140, 248, 0.15)" }}>
                          {subL1s.length} L1 Supervisors
                        </span>
                      </div>
                    </div>

                    {/* SUB L1s */}
                    {isExpanded && (
                      <div style={{ padding: "16px 20px", background: "rgba(0, 0, 0, 0.15)", borderTop: "1px solid var(--panel-border)" }}>
                        {subL1s.length === 0 ? (
                          <p className="text-muted" style={{ fontSize: "0.85rem", fontStyle: "italic", padding: "8px 0" }}>No L1 Supervisors assigned under {l2.name}.</p>
                        ) : (
                          <div style={{ paddingLeft: "20px", borderLeft: "2px dashed rgba(52, 211, 153, 0.3)", display: "flex", flexDirection: "column", gap: "12px" }}>
                            {subL1s.map((l1) => {
                              const subL0s = getL0sForL1(l1.id);
                              const isL1Expanded = expandedL1[l1.id] !== false; // default expanded

                              return (
                                <div key={l1.id} className="glass-panel" style={{ borderLeft: "3px solid #34d399", background: "rgba(255, 255, 255, 0.02)" }}>
                                  
                                  {/* L1 HEADER */}
                                  <div 
                                    onClick={() => toggleL1(l1.id)}
                                    style={{ padding: "14px 16px", display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer" }}
                                  >
                                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                                      {isL1Expanded ? <ChevronDown size={18} style={{ color: "#34d399" }} /> : <ChevronRight size={18} style={{ color: "#34d399" }} />}
                                      <div style={{ width: "32px", height: "32px", borderRadius: "6px", background: "rgba(52, 211, 153, 0.2)", display: "flex", alignItems: "center", justifyContent: "center", color: "#34d399", fontWeight: "700", fontSize: "0.85rem" }}>
                                        L1
                                      </div>
                                      <div>
                                        <h5 style={{ fontSize: "1rem", margin: 0, color: "var(--text-primary)" }}>{l1.name}</h5>
                                        <span className="text-secondary" style={{ fontSize: "0.8rem" }}>
                                          EMP ID: <strong style={{ color: "#6ee7b7" }}>{l1.employeeId || "N/A"}</strong> | {l1.email}
                                        </span>
                                      </div>
                                    </div>

                                    <div>
                                      <span className="badge badge-success" style={{ background: "rgba(52, 211, 153, 0.15)" }}>
                                        {subL0s.length} L0 Engineers
                                      </span>
                                    </div>
                                  </div>

                                  {/* SUB L0s */}
                                  {isL1Expanded && (
                                    <div style={{ padding: "12px 16px", background: "rgba(0, 0, 0, 0.2)", borderTop: "1px solid var(--panel-border)" }}>
                                      {subL0s.length === 0 ? (
                                        <p className="text-muted" style={{ fontSize: "0.8rem", fontStyle: "italic" }}>No field engineers under this supervisor.</p>
                                      ) : (
                                        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: "12px", marginTop: "4px" }}>
                                          {subL0s.map((l0) => (
                                            <div key={l0.id} style={{ padding: "12px", borderRadius: "8px", background: "rgba(255, 255, 255, 0.04)", border: "1px solid rgba(255, 255, 255, 0.08)", display: "flex", flexDirection: "column", gap: "6px" }}>
                                              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                                <strong style={{ color: "#fbbf24", fontSize: "0.95rem" }}>{l0.name}</strong>
                                                <span className="badge badge-pending" style={{ fontSize: "0.65rem", padding: "2px 6px" }}>L0 Eng</span>
                                              </div>
                                              <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)", display: "flex", flexDirection: "column", gap: "3px" }}>
                                                <span>Emp ID: <strong style={{ color: "var(--text-primary)" }}>{l0.employeeId || "N/A"}</strong></span>
                                                {l0.baseRegion && <span style={{ display: "flex", alignItems: "center", gap: "4px" }}><MapPin size={12} /> {l0.baseRegion} ({l0.baseLocation || "Field"})</span>}
                                                {l0.agencyName && <span style={{ display: "flex", alignItems: "center", gap: "4px" }}><Briefcase size={12} /> {l0.agencyName} ({l0.agencyFee || 0}%)</span>}
                                              </div>
                                            </div>
                                          ))}
                                        </div>
                                      )}
                                    </div>
                                  )}

                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}

                  </div>
                );
              })}

              {/* UNASSIGNED L1s OR L0s SECTION IF ANY */}
              {(unassignedL1s.length > 0 || unassignedL0s.length > 0) && !searchQuery && (
                <div className="glass-panel" style={{ padding: "20px", borderLeft: "4px solid #f59e0b", marginTop: "12px" }}>
                  <h4 style={{ color: "#fbbf24", marginBottom: "12px" }}>Direct Reports / Unassigned Subordinates</h4>
                  {unassignedL1s.length > 0 && (
                    <div style={{ marginBottom: "16px" }}>
                      <span style={{ fontSize: "0.85rem", color: "var(--text-secondary)", fontWeight: "600" }}>Unassigned L1 Supervisors ({unassignedL1s.length})</span>
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: "10px", marginTop: "8px" }}>
                        {unassignedL1s.map((l1) => (
                          <div key={l1.id} style={{ padding: "10px", borderRadius: "6px", background: "rgba(255, 255, 255, 0.05)" }}>
                            <strong>{l1.name}</strong> ({l1.employeeId || "L1"})
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {unassignedL0s.length > 0 && (
                    <div>
                      <span style={{ fontSize: "0.85rem", color: "var(--text-secondary)", fontWeight: "600" }}>Unassigned L0 Field Engineers ({unassignedL0s.length})</span>
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: "10px", marginTop: "8px" }}>
                        {unassignedL0s.map((l0) => (
                          <div key={l0.id} style={{ padding: "10px", borderRadius: "6px", background: "rgba(255, 255, 255, 0.05)" }}>
                            <strong>{l0.name}</strong> ({l0.employeeId || "L0"})
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

            </div>

          </div>
        )}
      </div>
    </div>
  );
}

export default OrgTree;
