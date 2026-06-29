import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { collection, addDoc, serverTimestamp, getDoc, doc } from "firebase/firestore";
import { 
  LayoutDashboard, Plane, FileText, Clock, AlertTriangle, 
  XCircle, User, Navigation 
} from "lucide-react";

import { db } from "../firebase";
import { Sidebar } from "../components/Sidebar";
import { Input, Select } from "../components/Input";
import { Button } from "../components/Button";
import { useToast } from "../context/ToastContext";

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
            lng: position.coords.longitude,
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

function TravelClaim() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [purpose, setPurpose] = useState("");
  const [popName, setPopName] = useState("");
  const [category, setCategory] = useState("");
  const [rtLinkName, setRtLinkName] = useState("");
  const [nocTicketId, setNocTicketId] = useState("");
  const [ptwId, setPtwId] = useState("");
  const [manualLat, setManualLat] = useState("");
  const [manualLng, setManualLng] = useState("");
  const [nldMetro, setNldMetro] = useState("LD");
  const [twoWheelerTripId, setTwoWheelerTripId] = useState("");
  const [customerCover, setCustomerCover] = useState("No");
  const [isStarting, setIsStarting] = useState(false);

  const submitTravelRequest = async () => {
    try {
      if (!purpose || !popName || !category || !rtLinkName || !nocTicketId || !ptwId) {
        showToast("Please fill all required fields", "error");
        return;
      }
      setIsStarting(true);

      const uid = localStorage.getItem("uid");
      const userRef = doc(db, "user", uid);
      const userSnap = await getDoc(userRef);

      if (!userSnap.exists()) {
        showToast("User not found", "error");
        setIsStarting(false);
        return;
      }

      const userData = userSnap.data();
      console.log("=== DEBUG: USER DATA FETCHED ===");
      console.log(userData);
      console.log("================================");

      const travelId = `TRV-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

      // Get GPS Location (Manual vs Auto)
      let startLoc = null;
      if (manualLat && manualLng) {
        startLoc = { lat: parseFloat(manualLat), lng: parseFloat(manualLng) };
      } else {
        try {
          showToast("Fetching GPS Location...", "info");
          startLoc = await getCurrentLocation();
        } catch (err) {
          showToast("Failed to get GPS. Please ensure Location Services are enabled or enter coordinates manually.", "error");
          setIsStarting(false);
          return;
        }
      }

      await addDoc(collection(db, "travelRequests"), {
        travelId,
        employeeUid: uid || "",
        employeeName: userData.name || "",
        employeeId: userData.employeeId || "",
        managerId: userData.managerId || "",
        agencyName: userData.agencyName || "",
        purpose: purpose || "",
        popName: popName || "",
        category: category || "",
        rtLinkName: rtLinkName || "",
        ptwId: ptwId, // User entered PTW ID
        nocTicketId: nocTicketId || "",
        nldMetro: nldMetro || "LD",
        twoWheelerTripId: twoWheelerTripId || "",
        customerCover: customerCover || "No",
        requestStatus: "ACTIVE_TRAVEL", // Bypass L1 approval, immediately start
        startTime: serverTimestamp(),
        startLocation: startLoc,
        endTime: null,
        distanceTravelled: 0,
        travelDuration: 0,
        claimAmount: 0,
        isFlagged: false,
        flagReason: "",
        createdAt: serverTimestamp(),
      });

      showToast(`Trip Started! ID: ${travelId}`, "success");
      navigate("/active-travels");

    } catch (error) {
      console.log(error);
      showToast(error.message, "error");
    } finally {
      setIsStarting(false);
    }
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
        <h1 className="page-title">Start Travel Trip</h1>
        <p className="page-subtitle">Start your trip to automatically capture GPS coordinates and begin tracking.</p>

        <div className="glass-panel" style={{ padding: "30px", maxWidth: "600px" }}>
          <Input
            label="Travel Purpose"
            type="text"
            placeholder="e.g. Routine Maintenance"
            value={purpose}
            onChange={(e) => setPurpose(e.target.value)}
          />

          <Input
            label="POP Name"
            type="text"
            placeholder="e.g. BLR-CORE-01"
            value={popName}
            onChange={(e) => setPopName(e.target.value)}
          />

          <Input
            label="RT/LINK Name"
            type="text"
            placeholder="e.g. Kolkata Metro"
            value={rtLinkName}
            onChange={(e) => setRtLinkName(e.target.value)}
          />

          <Input
            label="PTW ID (Mandatory)"
            type="text"
            placeholder="Enter PTW ID from external platform"
            value={ptwId}
            onChange={(e) => setPtwId(e.target.value)}
          />

          <Input
            label="Reference NOC ticket ID"
            type="text"
            placeholder="e.g. P-001642"
            value={nocTicketId}
            onChange={(e) => setNocTicketId(e.target.value)}
          />

          <Select
            label="Category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            <option value="">Select Category</option>
            <option value="ISPONM services">ISPONM services</option>
            <option value="OSPONM services">OSPONM services</option>
            <option value="Passive ONM services">Passive ONM services</option>
            <option value="Depot management">Depot management</option>
            <option value="Project support">Project support</option>
          </Select>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginTop: "16px" }}>
            <Select label="LD / Metro" value={nldMetro} onChange={(e) => setNldMetro(e.target.value)}>
              <option value="LD">LD (Long Distance / NLD)</option>
              <option value="Metro">Metro</option>
            </Select>

            <Select label="Recover from Customer?" value={customerCover} onChange={(e) => setCustomerCover(e.target.value)}>
              <option value="No">No</option>
              <option value="Yes">Yes</option>
            </Select>
          </div>

          <Input
            label="2W Trip ID (Optional)"
            type="text"
            placeholder="Enter 2 Wheeler Trip ID if applicable"
            value={twoWheelerTripId}
            onChange={(e) => setTwoWheelerTripId(e.target.value)}
          />

          <div style={{ display: "flex", gap: "10px", marginTop: "10px" }}>
            <div style={{ flex: 1 }}>
              <Input
                label="Manual Start Latitude (Optional)"
                type="number"
                placeholder="e.g. 28.7041"
                value={manualLat}
                onChange={(e) => setManualLat(e.target.value)}
              />
            </div>
            <div style={{ flex: 1 }}>
              <Input
                label="Manual Start Longitude (Optional)"
                type="number"
                placeholder="e.g. 77.1025"
                value={manualLng}
                onChange={(e) => setManualLng(e.target.value)}
              />
            </div>
          </div>
          <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginBottom: "15px" }}>
            Leave Manual Latitude/Longitude blank to use automatic device GPS.
          </p>

          <Button onClick={submitTravelRequest} style={{ marginTop: "10px" }} disabled={isStarting}>
            <Plane size={18} /> {isStarting ? "Getting Location..." : "Start Trip Now"}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default TravelClaim;