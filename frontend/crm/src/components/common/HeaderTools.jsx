import { useEffect, useState } from "react";
import { UserRound } from "lucide-react";
import { Link } from "react-router-dom";
import { getAuthUser, saveAuthUser, subscribeAuthChanges } from "../../api/authStorage";
import { getProfile } from "../../api/authApi";
import { getUserInitials } from "../../api/userIdentity";
import "./HeaderTools.css";

export default function HeaderTools() {
  const [user, setUser] = useState(getAuthUser);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (!getAuthUser()) {
        getProfile().then((response) => {
          setUser(response.data);
          saveAuthUser(response.data);
        }).catch(() => setUser(getAuthUser()));
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => subscribeAuthChanges(() => setUser(getAuthUser())), []);

  return (
    <div className="header-tools">
      <Link className="header-user-avatar" to="/profile" aria-label="Open profile">
        {user ? getUserInitials(user) : <UserRound size={18} />}
      </Link>
    </div>
  );
}
