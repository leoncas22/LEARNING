import { useEffect, useRef, useState } from "react";
import {
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "../services/notificationService";

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [unread, setUnread] = useState(0);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const rootRef = useRef(null);

  async function load() {
    try {
      const result = await listNotifications({ limit: 8 });
      setItems(result.data);
      setUnread(result.unreadCount);
      setError("");
    } catch {
      setItems([]);
      setUnread(0);
      setError("Unable to load notifications.");
    }
  }

  useEffect(() => {
    let timer;
    let cancelled = false;
    const refresh = async () => {
      if (!document.hidden && !cancelled) {
        await load();
        if (!document.hidden && !cancelled) timer = window.setTimeout(refresh, 20000);
      }
    };
    refresh();
    const onVisibilityChange = () => {
      window.clearTimeout(timer);
      if (!document.hidden) refresh();
    };
    const onPointerDown = (event) => {
      if (!rootRef.current?.contains(event.target)) setOpen(false);
    };
    const onKeyDown = (event) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("visibilitychange", onVisibilityChange);
    document.addEventListener("pointerdown", onPointerDown);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, []);

  async function read(item) {
    if (busy) return;
    if (item.isRead) {
      setOpen(false);
      return;
    }
    setBusy(true);
    try {
      await markNotificationRead(item.id);
      await load();
    } catch (requestError) {
      setError(
        requestError.response?.data?.message ||
          "Unable to mark notification as read.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function readAll() {
    if (busy) return;
    setBusy(true);
    try {
      await markAllNotificationsRead();
      await load();
    } catch (requestError) {
      setError(
        requestError.response?.data?.message ||
          "Unable to mark notifications as read.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="relative rounded-lg text-sm text-espresso/70 hover:text-espresso focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
        aria-label={`Notifications${unread > 0 ? `, ${unread} unread` : ""}`}
        aria-expanded={open}
        aria-haspopup="dialog"
      >
        Notifications
        {unread > 0 && (
          <span className="ml-1 inline-flex min-w-5 justify-center rounded-full bg-burgundy px-1 text-xs text-white">
            {unread}
          </span>
        )}
      </button>
      {open && (
        <div
          className="absolute right-0 z-30 mt-2 w-[min(20rem,calc(100vw-2rem))] rounded-2xl border-border-warm bg-white p-3 shadow-lg"
          role="dialog"
          aria-label="Notifications"
        >
          <div className="flex justify-between px-2 pb-2">
            <strong className="text-sm text-espresso">Notifications</strong>
            {unread > 0 && (
              <button
                type="button"
                disabled={busy}
                onClick={readAll}
                className="text-xs text-gold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold disabled:opacity-50"
              >
                {busy ? "Updating..." : "Mark all read"}
              </button>
            )}
          </div>
          {error && (
            <p className="px-2 py-2 text-xs text-burgundy" role="alert">
              {error}
            </p>
          )}
          {items.length
            ? items.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  disabled={busy}
                  onClick={() => read(item)}
                  className={`block w-full rounded-xl p-2 text-left text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold disabled:opacity-60 ${item.isRead ? "text-espresso/50" : "bg-cream text-espresso"}`}
                >
                  <span className="font-medium">{item.title}</span>
                  <span className="mt-1 block line-clamp-2">
                    {item.message}
                  </span>
                </button>
              ))
            : !error && (
                <p className="px-2 py-4 text-xs text-espresso/50">
                  No notifications.
                </p>
              )}
        </div>
      )}
    </div>
  );
}
