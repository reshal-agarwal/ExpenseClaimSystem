import { useEffect, useState } from "react";
import { collection, query, where, getDocs, doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { 
  LayoutDashboard, Plane, FileText, Clock, AlertTriangle, 
  XCircle, User, Navigation, Loader2 
} from "lucide-react";

import { db } from "../firebase";
import { Sidebar } from "../components/Sidebar";
import { Button } from "../components/Button";
import { Input } from "../components/Input";
import { useToast } from "../context/ToastContext";

// Haversine formula to calculate distance between two coordinates
function haversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c; // Distance in km
}

// Promisified Geolocation
function getCurrentLocation() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Geolocation is not supported by your browser."));
    } else {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
        },
        (error) => {
          reject(error);
        },
        { enableHighAccuracy: true }
      );
    }
  });
}

function ActiveTravels() {
  const [activeTravels, setActiveTravels] = useState([]);
  const [loadingAction, setLoadingAction] = useState(null); // stores the travel ID being processed
  const [claimResult, setClaimResult] = useState(null); // stores success message details
  const [manualEndCoords, setManualEndCoords] = useState({});
  const { showToast } = useToast();

  useEffect(() => {
    fetchActiveTravels();
  }, []);

  const fetchActiveTravels = async () => {
    try {
      const uid = localStorage.getItem("uid");
      const q = query(
        collection(db, "travelRequests"),
        where("employeeUid", "==", uid),
        where("requestStatus", "==", "ACTIVE_TRAVEL")
      );

      const querySnapshot = await getDocs(q);
      const data = [];
      querySnapshot.forEach((doc) => {
        data.push({ id: doc.id, ...doc.data() });
      });
      setActiveTravels(data);
    } catch (error) {
      console.log(error);
    }
  };

  // startTravel function removed, since travel starts automatically now

  const endTravel = async (travel) => {
    setLoadingAction(travel.id);
    try {
      if (!travel.startLocation) {
        throw new Error("Start location is missing. Cannot calculate distance.");
      }

      let endLocation = null;
      const coords = manualEndCoords[travel.id] || {};
      
      if (coords.lat && coords.lng) {
        endLocation = { lat: parseFloat(coords.lat), lng: parseFloat(coords.lng) };
      } else {
        showToast("Fetching Auto-GPS...", "info");
        endLocation = await getCurrentLocation();
      }
      
      const claimedDistanceStr = window.prompt("Enter the total distance you travelled (in KM):");
      if (claimedDistanceStr === null) {
        setLoadingAction(null);
        return;
      }
      const claimedDistance = parseFloat(claimedDistanceStr);
      if (isNaN(claimedDistance) || claimedDistance < 0) {
        showToast("Invalid distance entered. Please enter a valid number.", "error");
        setLoadingAction(null);
        return;
      }

      const gpsDistance = parseFloat(haversineDistance(
        travel.startLocation.lat,
        travel.startLocation.lng,
        endLocation.lat,
        endLocation.lng
      ).toFixed(2));

      const isFlagged = Math.abs(claimedDistance - gpsDistance) > 1;
      const flagReason = isFlagged ? `Distance mismatch (GPS: ${gpsDistance}km, Entered: ${claimedDistance}km)` : "";

      const ratePerKm = 2.5; 
      const claimAmount = parseFloat((claimedDistance * ratePerKm).toFixed(2));

      await updateDoc(doc(db, "travelRequests", travel.id), {
        requestStatus: "CLAIM_PENDING_APPROVAL",
        endTime: serverTimestamp(),
        endLocation: endLocation,
        distanceTravelled: claimedDistance,
        gpsDistance: gpsDistance,
        claimAmount: claimAmount,
        isFlagged,
        flagReason,
      });
      
      setClaimResult({
        travelId: travel.travelId,
        distance: claimedDistance,
        gpsDistance: gpsDistance,
        amount: claimAmount,
        isFlagged
      });
      showToast("Travel Ended Successfully!", "success");
      fetchActiveTravels();
    } catch (error) {
      console.error(error);
      showToast(error.message || "Failed to end travel. Please ensure location services are enabled.", "error");
    } finally {
      setLoadingAction(null);
    }
  };

  const handleManualCoordChange = (travelId, field, value) => {
    setManualEndCoords(prev => ({
      ...prev,
      [travelId]: {
        ...prev[travelId],
        [field]: value
      }
    }));
  };

  const menuItems = [
    { text: "Dashboard", path: "/l0", icon: <LayoutDashboard size={20} /> },
    { text: "Travel Claim", path: "/travel-claim", icon: <Plane size={20} /> },
    { text: "Active Travels", path: "/active-travels", icon: <Navigation size={20} /> },
    { text: "Miscellaneous Claim", path: "/misc-claim", icon: <FileText size={20} /> },
    { text: "Previous Claims", path: "/previous-claims", icon: <Clock size={20} /> },
    { text: "Flagged Claims", path: "/flagged-claims", icon: <AlertTriangle size={20} /> },
    { text: "Rejected Claims", path: "/rejected-claims", icon: <XCircle size={20} /> },
    { text: "Profile", path: "/profile", icon: <User size={20} /> },
  ];

  return (
    <div className="layout-container">
      <Sidebar menuItems={menuItems} />

      <div className="main-content animate-fade-in">
        <h1 className="page-title">Active Travels</h1>
        <p className="page-subtitle">Manage your ongoing travel. Distance is automatically tracked via GPS.</p>

        {claimResult && (
          <div className="glass-panel animate-fade-in" style={{ padding: "20px", marginBottom: "20px", borderLeft: "4px solid var(--success)", background: "rgba(16, 185, 129, 0.1)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <h3 style={{ color: "var(--success)", marginBottom: "8px", display: "flex", alignItems: "center", gap: "8px" }}>
                  <Plane size={20} /> Travel {claimResult.travelId} Completed!
                </h3>
                <p className="text-secondary" style={{ marginBottom: "4px" }}>
                  <strong style={{ color: "var(--text-primary)" }}>Claimed Distance:</strong> {claimResult.distance} KM
                </p>
                <p className="text-secondary" style={{ marginBottom: "4px" }}>
                  <strong style={{ color: "var(--text-primary)" }}>GPS Distance:</strong> {claimResult.gpsDistance} KM
                </p>
                <p className="text-secondary" style={{ marginBottom: "8px" }}>
                  <strong style={{ color: "var(--text-primary)" }}>Total Claim Cost:</strong> ₹{claimResult.amount}
                </p>
                {claimResult.isFlagged && (
                  <p style={{ color: "var(--danger)", fontSize: "0.9rem", display: "flex", alignItems: "center", gap: "5px" }}>
                    <AlertTriangle size={16} /> Flagged for Manager Review (Distance Mismatch)
                  </p>
                )}
              </div>
              <button 
                onClick={() => setClaimResult(null)}
                style={{ background: "transparent", border: "none", color: "var(--text-secondary)", cursor: "pointer" }}
              >
                <XCircle size={20} />
              </button>
            </div>
          </div>
        )}

        {activeTravels.length === 0 && (
          <div className="glass-panel" style={{ padding: "40px", textAlign: "center", color: "var(--text-muted)" }}>
            <p>No active travels found.</p>
          </div>
        )}

        <div style={{ display: "grid", gap: "20px" }}>
          {activeTravels.map((travel) => (
            <div key={travel.id} className="glass-panel" style={{ padding: "24px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <h3 style={{ fontSize: "1.1rem", marginBottom: "8px" }}>Travel ID: {travel.travelId}</h3>
                <p className="text-secondary" style={{ fontSize: "0.9rem", marginBottom: "4px" }}>
                  <strong style={{ color: "var(--text-primary)" }}>Purpose:</strong> {travel.purpose}
                </p>
                <p className="text-secondary" style={{ fontSize: "0.9rem", marginBottom: "4px" }}>
                  <strong style={{ color: "var(--text-primary)" }}>POP:</strong> {travel.popName}
                </p>
                <p className="text-secondary" style={{ fontSize: "0.9rem" }}>
                  <strong style={{ color: "var(--text-primary)" }}>PTW ID:</strong> {travel.ptwId}
                </p>
              </div>

              <div style={{ minWidth: "250px", textAlign: "right" }}>
                <div style={{ display: "flex", gap: "10px", marginBottom: "10px", textAlign: "left" }}>
                  <Input 
                    type="number" 
                    placeholder="End Lat (Optional)" 
                    value={manualEndCoords[travel.id]?.lat || ""}
                    onChange={(e) => handleManualCoordChange(travel.id, 'lat', e.target.value)}
                  />
                  <Input 
                    type="number" 
                    placeholder="End Lng (Optional)" 
                    value={manualEndCoords[travel.id]?.lng || ""}
                    onChange={(e) => handleManualCoordChange(travel.id, 'lng', e.target.value)}
                  />
                </div>

                <Button 
                  variant="danger" 
                  onClick={() => endTravel(travel)}
                  disabled={loadingAction === travel.id}
                  style={{ width: "100%" }}
                >
                    {loadingAction === travel.id ? (
                    <><Loader2 className="animate-spin" size={18} /> Calculating...</>
                  ) : (
                    <>End Travel</>
                  )}
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default ActiveTravels;
