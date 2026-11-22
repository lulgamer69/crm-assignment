import { useCallback, useEffect, useState } from "react";
import { Bell, UserRound } from "lucide-react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import {
  getNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "../../api/notificationApi";
import { getAuthUser, saveAuthUser, subscribeAuthChanges } from "../../api/authStorage";
import { getProfile } from "../../api/authApi";
import { getUserInitials } from "../../api/userIdentity";
import "./HeaderTools.css";

export default function HeaderTools() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState(getAuthUser);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const response = await getNotifications();
      setNotifications(Array.isArray(response.data) ? response.data : []);
      setUnreadCount(response.unreadCount ?? 0);
    } catch (error) {
      toast.error(error.response?.data?.message || "Notifications could not be loaded.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      refresh();
      if (!getAuthUser()) {
        getProfile().then((response) => {
          setUser(response.data);
          saveAuthUser(response.data);
        }).catch(() => setUser(getAuthUser()));
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, [refresh]);

  useEffect(() => subscribeAuthChanges(() => setUser(getAuthUser())), []);

  const handleMarkRead = async (notification) => {
    try {
      const response = await markNotificationRead(notification._id);
      setNotifications((current) => current.map((item) => item._id === notification._id ? response.data : item));
      if (!notification.readAt) setUnreadCount((count) => Math.max(0, count - 1));
    } catch (error) {
      toast.error(error.response?.data?.message || "Notification could not be updated.");
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await markAllNotificationsRead();
      const readAt = new Date().toISOString();
      setNotifications((current) => current.map((item) => ({ ...item, readAt: item.readAt || readAt })));
      setUnreadCount(0);
    } catch (error) {
      toast.error(error.response?.data?.message || "Notifications could not be updated.");
    }
  };

  return (
    <div className="header-tools">
      <div className="header-notification-wrap">
        <button
          className="header-icon-button"
          type="button"
          aria-label={`Notifications${unreadCount ? `, ${unreadCount} unread` : ""}`}
          aria-expanded={open}
          onClick={() => {
            const nextOpen = !open;
            setOpen(nextOpen);
            if (nextOpen) refresh();
          }}
        >
          <Bell size={21} />
          {unreadCount > 0 && <span className="notification-count">{unreadCount > 9 ? "9+" : unreadCount}</span>}
        </button>
        {open && (
          <section className="notification-panel" aria-label="Notifications">
            <header>
              <strong>Notifications</strong>
              <button type="button" onClick={handleMarkAllRead} disabled={!unreadCount}>Mark all read</button>
            </header>
            {loading ? <p className="notification-empty">Loading notifications…</p> : notifications.length === 0 ? (
              <p className="notification-empty">You’re all caught up.</p>
            ) : (
              <ul>
                {notifications.map((notification) => (
                  <li key={notification._id} className={notification.readAt ? "is-read" : "is-unread"}>
                    <button type="button" onClick={() => handleMarkRead(notification)}>
                      <span>{notification.leadName} was {notification.action}.</span>
                      <small>{new Date(notification.createdAt).toLocaleString()}</small>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}
      </div>
      <Link className="header-user-avatar" to="/profile" aria-label="Open profile">
        {user ? getUserInitials(user) : <UserRound size={18} />}
      </Link>
    </div>
  );
}
