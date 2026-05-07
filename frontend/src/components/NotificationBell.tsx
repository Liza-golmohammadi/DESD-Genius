import { useEffect, useState, useRef, useCallback } from "react";
import api from "../api";

// ── Types ─────────────────────────────────────────────────────────────────────
interface Notification {
  id: number;
  notification_type: "new_order" | "low_stock" | "status_update";
  title: string;
  message: string;
  is_read: boolean;
  order_number: string;
  product_id: number | null;
  created_at: string;
}

// ── Icon map ──────────────────────────────────────────────────────────────────
const TYPE_CONFIG: Record<
  string,
  { icon: string; accentBg: string; accentColor: string }
> = {
  new_order: {
    icon: "📦",
    accentBg: "#dbeafe",
    accentColor: "#1e40af",
  },
  low_stock: {
    icon: "⚠️",
    accentBg: "#fef3c7",
    accentColor: "#92400e",
  },
  status_update: {
    icon: "🔄",
    accentBg: "#d1fae5",
    accentColor: "#065f46",
  },
};

// ── Time-ago helper ───────────────────────────────────────────────────────────
function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
  });
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function NotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // ── Fetch unread count (lightweight poll) ──
  const fetchCount = useCallback(async () => {
    try {
      const res = await api.get<{ unread_count: number }>(
        "/api/notifications/unread-count/"
      );
      setUnreadCount(res.data.unread_count);
    } catch {
      // silently ignore
    }
  }, []);

  // ── Fetch full list when dropdown opens ──
  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get<Notification[]>(
        "/api/notifications/?limit=30"
      );
      setNotifications(res.data);
    } catch {
      // silently ignore
    } finally {
      setLoading(false);
    }
  }, []);

  // Poll unread count every 30 seconds
  useEffect(() => {
    fetchCount();
    const interval = setInterval(fetchCount, 30_000);
    return () => clearInterval(interval);
  }, [fetchCount]);

  // When dropdown opens, load notifications
  useEffect(() => {
    if (open) fetchNotifications();
  }, [open, fetchNotifications]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // ── Mark single as read ──
  async function markRead(id: number) {
    try {
      await api.post(`/api/notifications/${id}/read/`);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      );
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch {
      // ignore
    }
  }

  // ── Mark all as read ──
  async function markAllRead() {
    try {
      await api.post("/api/notifications/mark-all-read/");
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch {
      // ignore
    }
  }

  return (
    <div ref={ref} style={{ position: "relative", flexShrink: 0 }}>
      {/* ── Bell button ── */}
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="Notifications"
        id="notification-bell"
        style={{
          position: "relative",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: 36,
          height: 36,
          background: open ? "rgba(255,255,255,0.15)" : "transparent",
          border: "1px solid rgba(255,255,255,0.2)",
          borderRadius: 8,
          cursor: "pointer",
          padding: 0,
          transition: "background 0.15s",
        }}
      >
        <svg
          width={20}
          height={20}
          viewBox="0 0 24 24"
          fill="none"
          stroke="rgba(255,255,255,0.85)"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>

        {/* ── Badge ── */}
        {unreadCount > 0 && (
          <span
            style={{
              position: "absolute",
              top: -4,
              right: -4,
              minWidth: 18,
              height: 18,
              background: "#ef4444",
              color: "#fff",
              borderRadius: 999,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 10,
              fontWeight: 800,
              padding: "0 4px",
              lineHeight: 1,
              boxShadow: "0 1px 4px rgba(0,0,0,0.3)",
              animation: "notifPulse 2s ease-in-out infinite",
            }}
          >
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {/* ── Dropdown panel ── */}
      {open && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 8px)",
            right: 0,
            width: 380,
            maxHeight: 480,
            background: "#fff",
            borderRadius: 16,
            boxShadow:
              "0 20px 60px rgba(0,0,0,0.18), 0 2px 8px rgba(0,0,0,0.08)",
            border: "1px solid #e5e7eb",
            zIndex: 200,
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            animation: "notifSlideIn 0.2s ease-out",
          }}
        >
          {/* ── Header ── */}
          <div
            style={{
              padding: "16px 20px 12px",
              borderBottom: "1px solid #f3f4f6",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <div>
              <div
                style={{
                  fontSize: 16,
                  fontWeight: 800,
                  color: "#1b4332",
                  letterSpacing: -0.3,
                }}
              >
                Notifications
              </div>
              {unreadCount > 0 && (
                <div
                  style={{ fontSize: 12, color: "#6b7280", marginTop: 2 }}
                >
                  {unreadCount} unread
                </div>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                style={{
                  background: "none",
                  border: "none",
                  color: "#2d6a4f",
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: "pointer",
                  padding: "4px 8px",
                  borderRadius: 6,
                  transition: "background 0.15s",
                }}
                onMouseEnter={(e) =>
                  ((e.target as HTMLElement).style.background =
                    "rgba(45,106,79,0.08)")
                }
                onMouseLeave={(e) =>
                  ((e.target as HTMLElement).style.background = "transparent")
                }
              >
                Mark all read
              </button>
            )}
          </div>

          {/* ── Body ── */}
          <div style={{ overflowY: "auto", flex: 1 }}>
            {loading ? (
              <div
                style={{
                  padding: 40,
                  textAlign: "center",
                  color: "#9ca3af",
                  fontSize: 14,
                }}
              >
                Loading…
              </div>
            ) : notifications.length === 0 ? (
              <div
                style={{
                  padding: "48px 20px",
                  textAlign: "center",
                }}
              >
                <div style={{ fontSize: 36, marginBottom: 8 }}>🔔</div>
                <div
                  style={{
                    fontSize: 14,
                    fontWeight: 600,
                    color: "#6b7280",
                  }}
                >
                  All caught up!
                </div>
                <div
                  style={{ fontSize: 13, color: "#9ca3af", marginTop: 4 }}
                >
                  You have no notifications yet.
                </div>
              </div>
            ) : (
              notifications.map((n) => {
                const cfg = TYPE_CONFIG[n.notification_type] ??
                  TYPE_CONFIG.status_update;

                return (
                  <div
                    key={n.id}
                    onClick={() => {
                      if (!n.is_read) markRead(n.id);
                    }}
                    style={{
                      padding: "14px 20px",
                      borderBottom: "1px solid #f3f4f6",
                      background: n.is_read ? "#fff" : "#f0fdf4",
                      cursor: n.is_read ? "default" : "pointer",
                      display: "flex",
                      gap: 12,
                      alignItems: "flex-start",
                      transition: "background 0.15s",
                    }}
                    onMouseEnter={(e) => {
                      if (!n.is_read)
                        (e.currentTarget as HTMLElement).style.background =
                          "#e6f7ee";
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLElement).style.background =
                        n.is_read ? "#fff" : "#f0fdf4";
                    }}
                  >
                    {/* Icon */}
                    <div
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: 10,
                        background: cfg.accentBg,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 18,
                        flexShrink: 0,
                      }}
                    >
                      {cfg.icon}
                    </div>

                    {/* Content */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          gap: 8,
                        }}
                      >
                        <div
                          style={{
                            fontSize: 13,
                            fontWeight: n.is_read ? 600 : 700,
                            color: "#1b4332",
                          }}
                        >
                          {n.title}
                        </div>
                        {!n.is_read && (
                          <div
                            style={{
                              width: 8,
                              height: 8,
                              borderRadius: "50%",
                              background: "#2d6a4f",
                              flexShrink: 0,
                            }}
                          />
                        )}
                      </div>
                      <div
                        style={{
                          fontSize: 12,
                          color: "#6b7280",
                          marginTop: 3,
                          lineHeight: 1.5,
                          overflow: "hidden",
                          display: "-webkit-box",
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: "vertical",
                        }}
                      >
                        {n.message}
                      </div>
                      <div
                        style={{
                          fontSize: 11,
                          color: "#9ca3af",
                          marginTop: 4,
                          display: "flex",
                          alignItems: "center",
                          gap: 6,
                        }}
                      >
                        <span
                          style={{
                            padding: "1px 6px",
                            borderRadius: 4,
                            background: cfg.accentBg,
                            color: cfg.accentColor,
                            fontSize: 10,
                            fontWeight: 700,
                            textTransform: "uppercase",
                            letterSpacing: 0.3,
                          }}
                        >
                          {n.notification_type.replace("_", " ")}
                        </span>
                        <span>{timeAgo(n.created_at)}</span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* ── Inline keyframes ── */}
      <style>{`
        @keyframes notifPulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.15); }
        }
        @keyframes notifSlideIn {
          from { opacity: 0; transform: translateY(-8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
