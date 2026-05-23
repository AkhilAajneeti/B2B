import { motion, AnimatePresence } from "framer-motion";
import { useNotification } from "NotificationContext";
import { useState, useRef, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { markAllNotificationsRead } from "services/notification.service";
import Button from "./ui/Button";

const PAGE_SIZE = 5;

const NotificationDropdown = () => {
  const audioRef = useRef(null);
  const prevCountRef = useRef(0);
  const [activeTab, setActiveTab] = useState("all");
  const [page, setPage] = useState(1);
  const { open, notifications, setNotifications } = useNotification();
  const queryClient = useQueryClient();

  // Reset to page 1 whenever the tab switches or the notifications list size
  // changes — otherwise switching to "Unread" with a higher page index would
  // render an empty page.
  useEffect(() => {
    setPage(1);
  }, [activeTab, notifications.length]);
  useEffect(() => {
    if (notifications.length > prevCountRef.current) {
      audioRef.current?.play();
    }
    prevCountRef.current = notifications.length;
  }, [notifications]);

  if (!open) return null;

  const handleMarkAllRead = async () => {
    try {
      await markAllNotificationsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      queryClient.setQueryData(["notification-count"], 0);
    } catch (err) {
      console.error("Failed to mark all notifications as read", err);
    }
  };


  // logged-in user id (used to detect "assigned ... to you")
  const currentUserId = (() => {
    try {
      return JSON.parse(localStorage.getItem("login_object") || "{}")?.id || null;
    } catch {
      return null;
    }
  })();

  // "Lead" -> "lead", "CAttendanceRequest" -> "attendance request"
  const entityLabel = (type) => {
    if (!type) return "record";
    const map = {
      Lead: "lead",
      Task: "task",
      Meeting: "meeting",
      Call: "call",
      Account: "account",
      Contact: "contact",
      Case: "case",
      Project: "project",
      Opportunity: "deal",
      CAttendanceRequest: "attendance request",
    };
    return map[type] || type.replace(/([A-Z])/g, " $1").trim().toLowerCase();
  };

  // "dateEnd" -> "date end", "assignedUserId" -> "assigned user"
  const fieldLabel = (field) =>
    String(field || "")
      .replace(/([A-Z])/g, " $1")
      .replace(/\bId\b/gi, "")
      .replace(/\s+/g, " ")
      .trim()
      .toLowerCase();

  // build one readable sentence from a notification
  const parseNotification = (n) => {
    const note = n.noteData || {};
    const data = note.data || {};

    const actor = note.createdByName || n.data?.userName || "Someone";

    const parentType = note.parentType || n.relatedParentType || "";
    const parentName = note.parentName || n.data?.entityName || "";
    const entity = entityLabel(parentType);
    const target = parentName ? `${entity} ${parentName}` : entity;

    const noteType = note.type || n.type;

    let message;
    switch (noteType) {
      case "Post":
        message = note.post
          ? `commented on ${target}: "${note.post}"`
          : `commented on ${target}`;
        break;
      case "Create":
        message = `created ${target}`;
        break;
      case "CreateRelated":
        message = `created ${entityLabel(data.entityType)} ${data.entityName || ""}`.trim();
        break;
      case "Assign": {
        const toMe =
          data.assignedUserId && data.assignedUserId === currentUserId;
        const who = toMe ? "you" : data.assignedUserName || "someone";
        message = `assigned ${target} to ${who}`;
        break;
      }
      case "Status":
        message = `changed ${fieldLabel(data.field) || "status"} of ${target} to ${data.value || ""}`.trim();
        break;
      case "Update": {
        const fields = Array.isArray(data.fields)
          ? data.fields.map(fieldLabel).filter(Boolean)
          : [];
        message = fields.length
          ? `updated ${fields.join(", ")} of ${target}`
          : `updated ${target}`;
        break;
      }
      case "Relate":
        message = `linked ${target}`;
        break;
      case "EmailReceived":
        message = `received a new email on ${target}`;
        break;
      case "EmailSent":
        message = `sent an email on ${target}`;
        break;
      default:
        message = `updated ${target}`;
    }

    return {
      id: n.id,
      actor,
      message,
      entity: parentType,
      time: n.createdAt,
      read: n.read,
    };
  };

  const formatTime = (date) => {
    const d = new Date(date);
    const now = new Date();
    const diff = (now - d) / 1000;

    if (diff < 60) return "Just now";
    if (diff < 3600) return `${Math.floor(diff / 60)} min ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} hrs ago`;

    return d.toLocaleDateString();
  };
  const formatEntity = (type) => {
    const map = {
      Meeting: "📅 Meeting",
      Lead: "👤 Lead",
      Task: "✅ Task",
      Call: "📞 Call",
      Account: "🏢 Account",
      Contact: "👤 Contact",
      Case: "📂 Case",
      Project: "📁 Project",
      Note: "📝 Update",
    };
    return map[type] || "🔔 Notification";
  };
  // notification filter
  const filterNotification =
    activeTab == "unread"
      ? notifications.filter((n) => !n.read)
      : notifications;

  // Page-based pagination
  const pageCount = Math.max(1, Math.ceil(filterNotification.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);
  const visibleNotification = filterNotification.slice(
    (safePage - 1) * PAGE_SIZE,
    safePage * PAGE_SIZE,
  );

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0, y: -10, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -10, scale: 0.95 }}
          transition={{ duration: 0.25 }}
          // Responsive width: fits inside any viewport on phones (full width
          // minus 1rem margin), locks to 384px on tablets+. Right-anchored to
          // the bell button — the width formula keeps it inside the viewport.
          className="absolute right-0 mt-2 w-[calc(100vw-1rem)] max-w-sm sm:max-w-none sm:w-96 bg-white shadow-2xl rounded-2xl z-50 border overflow-hidden"
        >
          <audio ref={audioRef} src="/notification.mp3" preload="auto" />
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 px-3 sm:px-4 py-3 border-b">
            <h3 className="font-semibold text-gray-800">Notifications</h3>

            <div className="flex items-center flex-wrap gap-1.5 sm:gap-2 text-xs">
              <button
                onClick={() => setActiveTab("all")}
                className={`px-2 py-1 rounded-full ${activeTab === "all" ? "bg-gray-100" : "text-gray-500"}`}
              >
                All
              </button>
              <button
                onClick={() => setActiveTab("unread")}
                className={`px-2 py-1 rounded-full ${activeTab === "unread" ? "bg-gray-100" : "text-gray-500"}`}
              >
                Unread
              </button>
              {notifications.some((n) => !n.read) && (
                <button
                  onClick={handleMarkAllRead}
                  className="px-2 py-1 rounded-full font-medium text-blue-600 hover:bg-blue-50"
                >
                  Mark all read
                </button>
              )}
            </div>
          </div>
          {/* Body */}
          <div className="max-h-96 overflow-y-auto">
            {filterNotification.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <div className="text-3xl mb-2">🔔</div>
                <p className="text-sm text-gray-500">
                  {activeTab === "unread"
                    ? "You're all caught up 🎉"
                    : "No notifications yet"}
                </p>
              </div>
            ) : (
              visibleNotification.map((n) => {
                const item = parseNotification(n);
                const isUnread = !item.read;

                return (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className={`flex gap-3 px-4 py-3 border-b cursor-pointer hover:bg-gray-50 ${
                      isUnread ? "bg-gray-50" : ""
                    }`}
                  >
                    {/* Avatar */}
                    <div className="relative">
                      <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center font-semibold">
                        {item.actor?.[0]?.toUpperCase()}
                      </div>
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      {/* Readable message */}
                      <p className="text-sm text-gray-800 leading-snug">
                        <span className="font-semibold">{item.actor}</span>{" "}
                        <span className="text-gray-600">{item.message}</span>
                      </p>

                      {/* Entity tag + time */}
                      <p className="text-xs text-gray-400 mt-1">
                        {formatEntity(item.entity)} · {formatTime(item.time)}
                      </p>
                    </div>

                    {/* Unread dot */}
                    {isUnread && (
                      <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
                    )}
                  </motion.div>
                );
              })
            )}
          </div>

          {/* Pagination footer — only shows when there's more than one page. */}
          {filterNotification.length > PAGE_SIZE && (
            <div className="flex items-center justify-between px-3 sm:px-4 py-2.5 border-t bg-gray-50/60 text-xs">
              <Button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={safePage <= 1}
                className="!px-2.5 !py-1 !h-auto !text-xs !bg-white !text-gray-700 hover:!bg-gray-100 disabled:!opacity-40 disabled:!cursor-not-allowed border border-gray-200 rounded-md"
              >
                Prev
              </Button>
              <span className="text-gray-500 tabular-nums">
                Page <span className="font-semibold text-gray-800">{safePage}</span>{" "}
                of <span className="font-semibold text-gray-800">{pageCount}</span>
              </span>
              <Button
                onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
                disabled={safePage >= pageCount}
                className="!px-2.5 !py-1 !h-auto !text-xs !bg-white !text-gray-700 hover:!bg-gray-100 disabled:!opacity-40 disabled:!cursor-not-allowed border border-gray-200 rounded-md"
              >
                Next
              </Button>
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default NotificationDropdown;
