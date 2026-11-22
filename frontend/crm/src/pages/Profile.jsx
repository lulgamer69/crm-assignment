import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { getProfile, updateProfile } from "../api/authApi";
import { clearAuthToken, saveAuthUser } from "../api/authStorage";
import { Sidebar, TopNavigation } from "./Leads";
import "./Profile.css";

export default function Profile() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [name, setName] = useState("");
  const [topSearch, setTopSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    getProfile().then((response) => {
      if (!active) return;
      setUser(response.data);
      setName(response.data.name || "");
      saveAuthUser(response.data);
    }).catch((error) => {
      if (active) toast.error(error.response?.data?.message || "Profile could not be loaded.");
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, []);

  const handleLogout = () => {
    clearAuthToken();
    navigate("/login", { replace: true });
  };

  const handleSaveProfile = async (event) => {
    event.preventDefault();
    if (!name.trim()) return toast.error("Name is required.");
    setSaving(true);
    try {
      const response = await updateProfile({ name: name.trim() });
      setUser(response.data);
      setName(response.data.name);
      saveAuthUser(response.data);
      toast.success("Profile updated.");
    } catch (error) {
      toast.error(error.response?.data?.message || "Profile could not be updated.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="dashboard-shell leads-shell">
      <Sidebar onLogout={handleLogout} activePage="profile" />
      <main className="dashboard-main leads-main">
        <TopNavigation search={topSearch} onSearchChange={setTopSearch} pageLabel="Profile" />
        <div className="leads-content profile-content">
          <header className="leads-page-heading"><div><h1>Profile</h1><p>View and update your name.</p></div></header>
          {loading ? <section className="profile-panel" aria-live="polite">Loading profile…</section> : user && (
            <div className="profile-grid">
              <section className="profile-panel">
                <h2>Profile information</h2>
                <form onSubmit={handleSaveProfile}>
                  <label>Full name<input value={name} onChange={(event) => setName(event.target.value)} required /></label>
                  <label>Email<input value={user.email} readOnly /></label>
                  <label>User ID<input value={user.id} readOnly /></label>
                  <button type="submit" disabled={saving}>Save profile</button>
                </form>
              </section>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
