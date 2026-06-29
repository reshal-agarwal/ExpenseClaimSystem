import { useEffect } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";

import Login from "./pages/Login";
import MasterDashboard from "./pages/MasterDashboard";
import AddL2User from "./pages/AddL2User";
import L2Dashboard from "./pages/L2Dashboard";
import L1Dashboard from "./pages/L1Dashboard";
import L0Dashboard from "./pages/L0Dashboard";
import AddL1User from "./pages/AddL1User";
import AddL0User from "./pages/AddL0User";
import TravelClaim from "./pages/TravelClaim";
import L1Claims from "./pages/L1Claims";
import ActiveTravels from "./pages/ActiveTravels";
import MiscClaim from "./pages/MiscClaim";
import PreviousClaims from "./pages/PreviousClaims";
import FlaggedClaims from "./pages/FlaggedClaims";
import L2EscalatedClaims from "./pages/L2EscalatedClaims";
import ManageUsers from "./pages/ManageUsers";
import Profile from "./pages/Profile";
import RejectedClaims from "./pages/RejectedClaims";
import Insights from "./pages/Insights";
import OrgTree from "./pages/OrgTree";
import L1Approvals from "./pages/L1Approvals";
import SystemLogs from "./pages/SystemLogs";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { ThemeProvider } from "./context/ThemeContext";
import { ToastProvider } from "./context/ToastContext";
import { runEscalationEngine } from "./utils/escalationEngine";

function App() {
  useEffect(() => {
    const uid = localStorage.getItem("uid");
    if (uid) {
      runEscalationEngine();
    }
  }, []);

  return (
    <ThemeProvider>
      <ToastProvider>
        <BrowserRouter>
      <Routes>
  <Route
    path="/"
    element={<Login />}
  />

  <Route
    path="/master"
    element={
      <ProtectedRoute allowedRoles={["MASTER"]}>
        <MasterDashboard />
      </ProtectedRoute>
    }
  />

  <Route
    path="/add-l2"
    element={
      <ProtectedRoute allowedRoles={["MASTER"]}>
        <AddL2User />
      </ProtectedRoute>
    }
  />

  <Route
    path="/users"
    element={
      <ProtectedRoute allowedRoles={["L1", "L2", "MASTER"]}>
        <ManageUsers />
      </ProtectedRoute>
    }
  />

  <Route
    path="/l2"
    element={
      <ProtectedRoute allowedRoles={["L2"]}>
        <L2Dashboard />
      </ProtectedRoute>
    }
  />

  <Route
    path="/l2-escalated"
    element={
      <ProtectedRoute allowedRoles={["L2", "MASTER"]}>
        <L2EscalatedClaims />
      </ProtectedRoute>
    }
  />

  <Route
    path="/l1"
    element={
      <ProtectedRoute allowedRoles={["L1"]}>
        <L1Dashboard />
      </ProtectedRoute>
    }
  />

  <Route
    path="/l0"
    element={
      <ProtectedRoute allowedRoles={["L0"]}>
        <L0Dashboard />
      </ProtectedRoute>
    }
  />
  <Route
  path="/add-l1"
  element={
    <ProtectedRoute allowedRoles={["L2"]}>
      <AddL1User />
    </ProtectedRoute>
  }
/>
<Route
  path="/add-l0"
  element={
    <ProtectedRoute allowedRoles={["L1"]}>
      <AddL0User />
    </ProtectedRoute>
  }
/>
  <Route
    path="/travel-claim"
    element={
      <ProtectedRoute allowedRoles={["L0"]}>
        <TravelClaim />
      </ProtectedRoute>
    }
  />
<Route
  path="/l1-claims"
  element={
    <ProtectedRoute allowedRoles={["L1"]}>
      <L1Claims />
    </ProtectedRoute>
  }
/>
<Route
  path="/misc-claim"
  element={
    <ProtectedRoute allowedRoles={["L0"]}>
      <MiscClaim />
    </ProtectedRoute>
  }
/>
<Route
  path="/active-travels"
  element={
    <ProtectedRoute allowedRoles={["L0"]}>
      <ActiveTravels />
    </ProtectedRoute>
  }
/>
<Route
  path="/previous-claims"
  element={
    <ProtectedRoute allowedRoles={["L0", "L1", "L2", "MASTER"]}>
      <PreviousClaims />
    </ProtectedRoute>
  }
/>
<Route
  path="/flagged-claims"
  element={
    <ProtectedRoute allowedRoles={["L0", "L1", "L2", "MASTER"]}>
      <FlaggedClaims />
    </ProtectedRoute>
  }
/>
<Route
  path="/profile"
  element={
    <ProtectedRoute allowedRoles={["L0", "L1", "L2", "MASTER"]}>
      <Profile />
    </ProtectedRoute>
  }
/>
<Route
  path="/rejected-claims"
  element={
    <ProtectedRoute allowedRoles={["L0"]}>
      <RejectedClaims />
    </ProtectedRoute>
  }
/>
<Route
  path="/insights"
  element={
    <ProtectedRoute allowedRoles={["L0", "L1", "L2", "MASTER"]}>
      <Insights />
    </ProtectedRoute>
  }
/>
<Route
  path="/org-tree"
  element={
    <ProtectedRoute allowedRoles={["L2", "MASTER"]}>
      <OrgTree />
    </ProtectedRoute>
  }
/>
<Route
  path="/l1-approvals"
  element={
    <ProtectedRoute allowedRoles={["L1"]}>
      <L1Approvals />
    </ProtectedRoute>
  }
/>
<Route
  path="/logs"
  element={
    <ProtectedRoute allowedRoles={["MASTER"]}>
      <SystemLogs />
    </ProtectedRoute>
  }
/>
</Routes>
        </BrowserRouter>
      </ToastProvider>
    </ThemeProvider>
  );
}

export default App;