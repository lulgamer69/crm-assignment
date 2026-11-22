import { useSyncExternalStore } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import Dashboard from "./pages/Dashboard";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Leads from "./pages/Leads";
import AddLead from "./pages/AddLead";
import { EditLead } from "./pages/AddLead";
import { getAuthToken, subscribeAuthChanges } from "./api/authStorage";
import Profile from "./pages/Profile";

function useIsAuthenticated() {
  return useSyncExternalStore(subscribeAuthChanges, getAuthToken, () => null);
}

function RequireAuth({ children }) {
  return useIsAuthenticated() ? children : <Navigate to="/login" replace />;
}

function HomeRedirect() {
  return <Navigate to={useIsAuthenticated() ? "/dashboard" : "/login"} replace />;
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/"
          element={<HomeRedirect />}
        />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Register />} />
        <Route path="/dashboard" element={<RequireAuth><Dashboard /></RequireAuth>} />
        <Route path="/leads" element={<RequireAuth><Leads /></RequireAuth>} />
        <Route path="/leads/new" element={<RequireAuth><AddLead /></RequireAuth>} />
        <Route path="/leads/:id/edit" element={<RequireAuth><EditLead /></RequireAuth>} />
        <Route path="/profile" element={<RequireAuth><Profile /></RequireAuth>} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
      <Toaster position="top-right" />
    </BrowserRouter>
  );
}

export default App;
