import React, { useEffect, useMemo, useState } from "react";
import Icon from "../../../components/AppIcon";
import Button from "../../../components/ui/Button";
import Select from "../../../components/ui/Select";
import Input from "components/ui/Input";
import toast from "react-hot-toast";
import Avatar from "react-avatar";

import { createLeadActivity, updateStream } from "services/leads.service";
import { useTeams } from "hooks/useTeams";
import { useUsers } from "hooks/useUsers";
import { useLeadStream } from "hooks/useLeadStream";
import { useLeadActivity, useLeadTask } from "hooks/useLeadActivity";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { canEditRecord, getStoredUser, formatUserDisplayName, isAdminOrManager } from "utils/permission";
import ActivityDrawer from "components/ActivityDrawer";
import { createTasks } from "services/tasks.service";
import { useNavigate } from "react-router-dom";
import { useLeadMeeting } from "hooks/useMeeting";
import { createLeadMeeting, createMeeting } from "services/meeting.service";
import { fetchTeamUser } from "services/team.service";
import { toEspoDateTime, fromEspoToLocalInput } from "../../pipeline/utils/dateHelpers";
const DealDrawer = ({
  deal,
  isOpen,
  onClose,
  mode,
  onCreate,
  onUpdate,
  onDelete,
  leadsDetails,
  onBulkUpdate,
  selectedIds = [],
}) => {
  const [activeTab, setActiveTab] = useState("overview");
  const [isEditing, setIsEditing] = useState(false);
  const [taskDrawerOpen, setTaskDrawerOpen] = useState(false);
  const [meetingDrawerOpen, setMeetingDrawerOpen] = useState(false);
  const [showActivityForm, setActivityForm] = useState(false);
  const [activityText, setActivityText] = useState("");
  const [postingActivity, setPostingActivity] = useState(false);
  const [expandedActivityId, setExpandedActivityId] = useState(null);
  const [editingActivityId, setEditingActivityId] = useState(null);
  const navigate = useNavigate();
  // Lazy init so we read the logged-in user once on mount — avoids the brief
  // flash of empty Assign User / Team selects before the mode-change effect
  // overwrites the form below.
  const [formData, setFormData] = useState(() => {
    const u = getStoredUser();
    return {
      firstName: "",
      lastName: "",
      phoneNumber: "+91",
      emailAddress: "",
      whatsapp: "",
      addressCity: "",
      cProject: "",
      cNextContactAt: "",
      cLeatReceivedAt: fromEspoToLocalInput(new Date()),
      cPreference: "",
      assignedUserId: u?.id || "",
      teamId: u?.teamIds || u?.teamIds?.[0] || "",
      status: "",
      source: "ACL",
      cSubSource: "",
      description: "",
      cSiteVisitAt: "",
      industry: "",
    };
  });
  const queryClient = useQueryClient();
  const { data: usersData } = useUsers();
  const { data: teamData } = useTeams();
  const { data: streamData } = useLeadStream(deal?.id, isOpen);
  const { data: taskData } = useLeadTask(deal?.id, isOpen);
  const { data: meetData } = useLeadMeeting(deal?.id, isOpen);
  const currentUser = getStoredUser();
  // Source / Sub Source visibility: admins & managers see both with real
  // labels; everyone else only sees the Sub Source input, relabeled "Source"
  // (the real `source` field is internal-classification-only for them).
  const isAdmin = isAdminOrManager();

  // WhatsApp URL — shared by the main Whatsapp section and the Quick Reply
  // chip near Followers. Decodes/re-encodes the backend template to fix the
  // raw-space bug; falls back to a client-side intro when no template is set.

  const currentTeamIds = useMemo(
    () => [...new Set([
      ...(currentUser?.teamsIds || []),
      ...(currentUser?.teamIds || []),
      currentUser?.teamId,
      currentUser?.defaultTeamId,
    ].filter(Boolean))],
    [currentUser?.defaultTeamId, currentUser?.teamId, currentUser?.teamIds, currentUser?.teamsIds],
  );
  const { data: teamUsersData } = useQuery({
    queryKey: ["team-users", currentTeamIds],
    queryFn: async () => {
      const responses = await Promise.all(currentTeamIds.map((id) => fetchTeamUser(id)));
      return {
        list: responses.flatMap((response) => response?.list || []),
      };
    },
    enabled: currentTeamIds.length > 0,
    staleTime: 1000 * 60 * 5,
  });

  const meeting = meetData?.list || [];
  const task = taskData?.list || [];
  const users = usersData?.list || [];
  const teamUsers = teamUsersData?.list || [];
  const team = teamData?.list || [];
  const streams = streamData?.list || [];
  const usersById = useMemo(() => {
    return [...users, ...teamUsers].reduce((acc, user) => {
      acc[user.id] = user;
      return acc;
    }, {});
  }, [teamUsers, users]);
  const teamUserIds = useMemo(
    () => new Set(teamUsers.map((user) => user.id)),
    [teamUsers],
  );

  const getPermissionRecord = (record) => {
    const assignedUser = usersById[record?.assignedUserId];
    const isAssignedToCurrentTeam = teamUserIds.has(record?.assignedUserId);

    if (!assignedUser) return record;

    return {
      ...record,
      teamsIds:
        record?.teamsIds?.length
          ? record.teamsIds
          : assignedUser.teamsIds?.length
            ? assignedUser.teamsIds
            : assignedUser.teamIds?.length
              ? assignedUser.teamIds
              : assignedUser.defaultTeamId
                ? [assignedUser.defaultTeamId]
                : isAssignedToCurrentTeam
                  ? currentTeamIds
                  : record?.teamsIds,
      teamId: record?.teamId || assignedUser.defaultTeamId || assignedUser.teamId || (isAssignedToCurrentTeam ? currentTeamIds[0] : null),
    };
  };

  useEffect(() => {
    if (mode === "add") {
      setFormData({
        firstName: "",
        lastName: "",
        phoneNumber: "+91",
        emailAddress: "",
        whatsapp: "",
        addressCity: "",
        cProject: "",
        cNextContactAt: "",
        // Default Lead Received At to "right now" so it carries through to
        // the save payload even when the rep doesn't touch the field. The
        // form already *displayed* today's date via the input's fallback
        // value, but that fallback never wrote back to formData — leaving
        // an empty string to be sent at save time.
        cLeatReceivedAt: fromEspoToLocalInput(new Date()),
        cPreference: "",
        // Default the assigned user + team to the currently logged-in user —
        // both can still be overridden from their dropdowns before saving.
        assignedUserId: currentUser?.id || "",
        teamId:
          currentUser?.teamsIds?.[0] ||
          currentUser?.teamIds?.[0] ||
          "",
        status: "New",
        source: "ACL",
        cSubSource: "",
        description: "",
        cSiteVisitAt: "",
        industry: "",
      });
      setIsEditing(true); // form open
    } else if (deal && mode === "view") {
      // Lead records store the team as `teamsIds: [...]` (plural array),
      // not the singular `teamId` field the form's <Select> binds to. Spread
      // the raw deal so every other field hydrates 1:1, then explicitly map
      // teamsIds[0] -> teamId so the Team dropdown pre-selects on edit
      // instead of forcing the rep to re-pick.
      setFormData({
        ...deal,
        teamId: deal.teamId || deal.teamsIds?.[0] || "",
      });
      setIsEditing(false);
    }
  }, [deal, mode]);

  const [massFields, setMassFields] = useState({
    assignedUserId: false,
    status: false,
    teamId: false,
    cNextContactAt: false,
  });

  const toggleMassField = (field) => {
    setMassFields((prev) => ({
      ...prev,
      [field]: !prev[field],
    }));
  };

  const handleEditActivity = (activity) => {
    setEditingActivityId(activity.id);
    setActivityText(activity.post || "");
    setActivityForm(true);
  };
  const toggleActivity = (id) => {
    setExpandedActivityId((prev) => (prev === id ? null : id));
  };
  const showForm = mode === "add" || isEditing;
  const isMassUpdate = mode === "mass-update";

  const formatDate = (date) => {
    if (!date) return "—";

    // EspoCRM datetimes are UTC; append Z so JS parses correctly,
    // then format in the user's local timezone.
    const safeDate =
      typeof date === "string" && date.length > 10
        ? `${date.replace(" ", "T")}Z`
        : date;
    const parsed = new Date(safeDate);

    if (isNaN(parsed.getTime())) return "—";

    return parsed.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };
  const formatDateTime = (value) => {
    if (!value) return "—";

    const safe =
      typeof value === "string" && value.length > 10
        ? `${value.replace(" ", "T")}Z`
        : value;
    const date = new Date(safe);

    if (isNaN(date.getTime())) return "—";

    return date.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // --- Avatar helpers — same palette/hash as DealsTable so the rep's
  //     color stays consistent across the table and this drawer.
  const ASSIGNEE_PALETTE = [
    "#6366F1", "#22C55E", "#F59E0B", "#EF4444",
    "#06B6D4", "#8B5CF6", "#EC4899", "#14B8A6",
  ];
  const getNameColor = (name = "") => {
    let hash = 0;
    for (let i = 0; i < name.length; i++) hash = (hash + name.charCodeAt(i)) >>> 0;
    return ASSIGNEE_PALETTE[hash % ASSIGNEE_PALETTE.length];
  };
  const getInitials = (name = "") => {
    const parts = name.trim().split(/\s+/);
    if (!parts[0]) return "?";
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    return (
      parts[0].charAt(0) + parts[parts.length - 1].charAt(0)
    ).toUpperCase();
  };

  const getNextContactStatus = (value) => {
    if (!value) {
      return { tone: "muted", text: "No follow-up scheduled" };
    }
    const safe =
      typeof value === "string" && value.length > 10
        ? `${value.replace(" ", "T")}Z`
        : value;
    const date = new Date(safe);
    if (isNaN(date.getTime())) {
      return { tone: "muted", text: "Next contact not set" };
    }
    const now = new Date();
    const diffMs = date.getTime() - now.getTime();
    const diffDays = Math.round(diffMs / 86400000);
    const diffHours = Math.round(diffMs / 3600000);
    const timeStr = date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });
    const dayStr = date.toLocaleDateString("en-US", {
      weekday: "short",
      day: "numeric",
      month: "short",
    });
    if (diffMs < 0) {
      const overdueDays = Math.abs(diffDays);
      return {
        tone: "rose",
        text:
          overdueDays > 0
            ? `Overdue by ${overdueDays} day${overdueDays === 1 ? "" : "s"}`
            : `Overdue by ${Math.abs(diffHours)}h`,
      };
    }
    // Same calendar day → "Today at 6:03 PM (in 3h)"
    if (date.toDateString() === now.toDateString()) {
      return {
        tone: "amber",
        text: `Today at ${timeStr}${diffHours >= 1 ? ` (in ${diffHours}h)` : ""}`,
      };
    }
    return { tone: "emerald", text: `${dayStr}, ${timeStr}` };
  };

  // --- Build the wa.me URL once so the header Quick Actions button and
  //     the Overview link share the exact same logic. Returns null when
  //     no phone/whatsapp data is present, so the caller can decide
  //     whether to disable the action.
  const buildWhatsappUrl = (d) => {
    if (!d?.cWhatsapp && !d?.phoneNumber) return null;
    const base = d?.cWhatsapp
      ? `https://${d.cWhatsapp.replace(/^https?:\/\//, "")}`
      : `https://wa.me/${(d?.phoneNumber || "").replace(/\D/g, "")}`;
    if (d?.cWhatsappTemplate) {
      try {
        const raw = decodeURIComponent(
          d.cWhatsappTemplate.replace(/^\?text=/, ""),
        );
        return `${base}?text=${encodeURIComponent(raw)}`;
      } catch {
        // Malformed %XX in the backend template — fall through to the
        // generic intro below so the rep still gets a pre-filled
        // message they can edit before sending.
      }
    }
    const fallback = `Hello *${d?.name || "Customer"}*,\n\nThank you for contacting us for your lead generation requirements.\nI'm *${formatUserDisplayName(currentUser?.username)}* Let me know when you're available so that we can discuss this in more detail.`;
    return `${base}?text=${encodeURIComponent(fallback)}`;
  };

  const getStageColor = (stage) => {
    const colors = {
      New: "bg-blue-100 text-blue-800",
      Interested: "bg-sky-100 text-sky-800",
      "Follow up": "bg-indigo-100 text-indigo-800",
      Converted: "bg-green-100 text-green-800",
      "Not interested": "bg-orange-100 text-orange-800",
      Broker: "bg-purple-100 text-purple-800",
      "Call Not Picked": "bg-red-100 text-red-800",
      Invalid: "bg-gray-100 text-gray-700",
    };
    return colors?.[stage] || "bg-gray-100 text-gray-800";
  };

  const tabs = [
    { id: "overview", label: "Overview", icon: "Eye" },
    { id: "AssignedUsers", label: "Assigned User", icon: "Users" },
    { id: "Stream", label: "Stream", icon: "Calendar" },
    { id: "Task", label: "Task", icon: "ListChecks" },
    { id: "Meeting", label: "Meeting", icon: "Projector" },
  ];

  const getActivityIcon = (type) => {
    switch (type) {
      case "Post":
        return "MessageSquare";
      case "Update":
        return "RefreshCcw";
      case "Assign":
        return "UserPlus";
      case "Create":
        return "PlusCircle";
      default:
        return "Activity";
    }
  };

  const getActivityIconColor = (type) => {
    switch (type) {
      case "Post":
        return "text-indigo-600";
      case "Update":
        return "text-blue-600";
      case "Assign":
        return "text-purple-600";
      case "Create":
        return "text-green-600";
      default:
        return "text-gray-500";
    }
  };

  const getActivityMessage = (activity) => {
    const { type, post, data, createdByName } = activity;

    if (type === "Post") {
      return post;
    }

    if (type === "Assign") {
      return `Assigned to ${data?.assignedUserName}`;
    }

    if (type === "Create") {
      return "Lead was created";
    }

    if (type === "Update") {
      if (data?.value) {
        return `Status updated to ${data.value}`;
      }
      return "Lead updated";
    }
    if (activity._scope === "Call") {
      return `${activity.direction || "Call"} call scheduled`;
    }

    if (activity._scope === "Meeting") {
      return "Meeting scheduled";
    }

    return "Activity updated";
  };

  const handleChange = (key, value) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const fullName =
      `${formData.firstName || ""} ${formData.lastName || ""}`.trim();

    // 🚨 VALIDATION FIX
    if (!fullName) {
      toast.error("Name is required");
      return;
    }
    const payload = {
      ...formData,
      name: fullName,
      cNextContactAt: toEspoDateTime(formData.cNextContactAt),
      cSiteVisitAt: toEspoDateTime(formData.cSiteVisitAt),
      cLeatReceivedAt: toEspoDateTime(formData.cLeatReceivedAt),
      teamsIds: formData.teamId ? [formData.teamId] : formData.teamsIds,
    };
    try {
      if (mode === "add") {
        await onCreate(payload);
        // toast.success("Task is  created");
      } else {
        if (!canEditRecord("Lead", getPermissionRecord(deal))) {
          toast.error("You do not have permission to edit this lead");
          return;
        }

        await onUpdate(deal.id, payload);
        // toast.success("Task is Updated");
      }

      setIsEditing(false);
      onClose(); // close drawer after success
    } catch (error) {
      console.error("Failed to save lead", error);
    }
  };
  const handleBulkUpdate = (e) => {
    e.preventDefault();

    const payload = {};

    if (massFields.assignedUserId)
      payload.assignedUserId = formData.assignedUserId;

    if (massFields.cNextContactAt)
      payload.cNextContactAt = toEspoDateTime(formData.cNextContactAt);

    if (massFields.status) payload.status = formData.status;

    if (massFields.teamId) {
      payload.teamId = formData.teamId;
      payload.teamsIds = formData.teamId ? [formData.teamId] : [];
    }

    if (!Object.keys(payload).length) {
      toast.error("Select at least one field");
      return;
    }

    onBulkUpdate(payload);
    onClose();
  };

  const handleDelete = async (e, activity) => {
    e.stopPropagation();
    const ok = window.confirm(`Delete Stream ${activity?.createdByName}?`);
    if (!ok) return;
    await onDelete(activity.id); // 👈 parent ko bol rahe ho
    queryClient.invalidateQueries(["lead-stream", deal.id]);
  };
  const createActivity = async () => {
    //post activity
    setActivityForm(true);
  };
  const handlePostActivity = async (e) => {
    e.preventDefault();

    if (!activityText.trim()) {
      toast.error("Comment cannot be empty");
      return;
    }

    try {
      setPostingActivity(true);

      if (editingActivityId) {
        // 🔥 UPDATE STREAM
        const updated = await updateStream(editingActivityId, {
          post: activityText,
        });
        queryClient.invalidateQueries(["lead-stream", deal.id]);


        toast.success("Activity updated");
      } else {
        // 🔥 CREATE STREAM
        const payload = {
          post: activityText,
          parentId: deal.id,
          parentType: "Lead",
          type: "Post",
          isInternal: false,
          attachmentsIds: [],
        };

        await createLeadActivity(payload);
        queryClient.invalidateQueries(["lead-stream", deal.id]);
        // setmockStream((prev) => [newActivity, ...prev]);

        toast.success("Activity posted");
      }

      setActivityText("");
      setEditingActivityId(null);
      setActivityForm(false);
    } catch (err) {
      console.error(err);
      toast.error("Failed to save activity");
    } finally {
      setPostingActivity(false);
    }
  };

  const userOptions = users
    ?.filter((u) => u?.isActive) // ✅ only active users
    ?.map((u) => ({
      value: u.id,
      label: u.name || u.userName,
    }));
  // teamOptions is built from useTeams() which only returns teams the logged-
  // in user has direct access to. If a lead carries a team outside that scope
  // (e.g. admin viewing a lead from a different team, or a re-assigned lead),
  // the saved team won't be in the dropdown options and the <Select> will
  // render its placeholder instead of the saved label.
  //
  // Fix: inject the lead's saved team into the option list when it's missing,
  // pulling the display name from deal.teamsNames so the rep sees the real
  // team name pre-selected even when they couldn't have picked it themselves.
  const teamOptions = useMemo(() => {
    const base = (team || []).map((t) => ({ value: t.id, label: t.name }));
    const savedTeamId =
      formData.teamId || deal?.teamId || deal?.teamsIds?.[0] || "";
    if (savedTeamId && !base.some((o) => o.value === savedTeamId)) {
      const savedTeamName =
        deal?.teamsNames?.[savedTeamId] || "Saved team";
      base.unshift({ value: savedTeamId, label: savedTeamName });
    }
    return base;
  }, [team, formData.teamId, deal?.teamId, deal?.teamsIds, deal?.teamsNames]);

  const sourceOptions = [
    { value: "Call", label: "Call" },
    { value: "Email", label: "Email" },
    { value: "Existing Customer", label: "Existing Customer" },
    { value: "Partner", label: "Partner" },
    { value: "Public Relations", label: "Public Relations" },
    { value: "Web Site", label: "Web Site" },
    { value: "Campaign", label: "Campaign" },
    { value: "ACL", label: "Aajneeti" },
    { value: "Other", label: "Other" },
  ];
  const statusOptions = [
    { value: "Broker", label: "Broker" },
    { value: "Call Later", label: "Call Later" },
    { value: "Call Not Connecting", label: "Call Not Connecting" },
    { value: "Call Not Picked", label: "Call Not Picked" },
    { value: "Dead", label: "Dead" },
    { value: "Fake Lead", label: "Fake Lead" },
    { value: "Follow up", label: "Follow up" },
    { value: "Interested", label: "Interested" },
    { value: "Invalid Number", label: "Invalid Number" },
    { value: "Irrelevant Lead", label: "Irrelevant Lead" },
    { value: "Low Budget", label: "Low Budget" },
    { value: "Low Interest", label: "Low Interest" },
    { value: "New", label: "New" },
    { value: "Not Interested", label: "Not Interested" },
    { value: "Other Location", label: "Other Location" },
    { value: "Purchased", label: "Purchased" },
    { value: "Site Visit Done", label: "Site Visit Done" },
    { value: "Site Visit Scheduled", label: "Site Visit Scheduled" },
    { value: "Switch Off", label: "Switch Off" },
  ];


  const handleSelectChange = (name, value) => {
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };
  const IndustryOptions = [
    { value: "Advertising", label: "Advertising" },
    { value: "Aerospace", label: "Aerospace" },
    { value: "Agriculture", label: "Agriculture" },
    { value: "Apparel & Accessories", label: "Apparel & Accessories" },
    { value: "Architecture", label: "Architecture" },
    { value: "Automotive", label: "Automotive" },
    { value: "Banking", label: "Banking" },
    { value: "Biotechnology", label: "Biotechnology" },
    {
      value: "Building Materials & Equipment",
      label: "Building Materials & Equipment",
    },
    { value: "Chemical", label: "Chemical" },
    { value: "Computer", label: "Computer" },
    { value: "Construction", label: "Construction" },
    { value: "Consulting", label: "Consulting" },
    { value: "Creative", label: "Creative" },
    { value: "Culture", label: "Culture" },
    { value: "Defense", label: "Defense" },
    { value: "Education", label: "Education" },
    { value: "Electric Power", label: "Electric Power" },
    { value: "Electronics", label: "Electronics" },
    { value: "Energy", label: "Energy" },
    { value: "Entertainment & Leisure", label: "Entertainment & Leisure" },
    { value: "Finance", label: "Finance" },
    { value: "Food & Beverage", label: "Food & Beverage" },
    { value: "Grocery", label: "Grocery" },
    { value: "Healthcare", label: "Healthcare" },
    { value: "Hospitality", label: "Hospitality" },
    { value: "Insurance", label: "Insurance" },
    { value: "Manufacturing", label: "Manufacturing" },
    { value: "Marketing", label: "Marketing" },
    { value: "Mass Media", label: "Mass Media" },
    { value: "Mining", label: "Mining" },
    { value: "Music", label: "Music" },
    { value: "Petroleum", label: "Petroleum" },
    { value: "Publishing", label: "Publishing" },
    { value: "Real Estate", label: "Real Estate" },
    { value: "Retail", label: "Retail" },
    { value: "Service", label: "Service" },
    { value: "Shipping", label: "Shipping" },
    { value: "Software", label: "Software" },
    { value: "Sports", label: "Sports" },
    { value: "Support", label: "Support" },
    { value: "Technology", label: "Technology" },
    { value: "Telecommunications", label: "Telecommunications" },
    { value: "Television", label: "Television" },
    {
      value: "Testing, Inspection & Certification",
      label: "Testing, Inspection & Certification",
    },
    { value: "Transportation", label: "Transportation" },
    { value: "Travel", label: "Travel" },
    { value: "Venture Capital", label: "Venture Capital" },
    { value: "Water", label: "Water" },
    { value: "Wholesale", label: "Wholesale" },
  ];

  const leadData = leadsDetails || deal;
  const canEditDeal = (deal) =>
    canEditRecord("Lead", getPermissionRecord({ ...deal, ...leadsDetails }));

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div className="fixed inset-0 bg-black/50 z-40" onClick={onClose} />
      )}
      {/* Drawer — bumped from max-w-2xl to max-w-3xl so the redesigned
          two-column sections (Contact / Interest / Lifecycle) have room
          to breathe without label/value pairs wrapping. */}
      <div
        className={`
          fixed top-0 right-0 h-full w-full max-w-2xl bg-background border-l border-border z-50
          transform transition-transform duration-300 ease-out
          ${isOpen ? "translate-x-0" : "translate-x-full"}
        `}
      >
        <div className="flex flex-col h-full">
          {/* Header — hero strip with avatar, name, working status pill.
              In add/edit/mass-update modes we just show the title, since
              there's no lead identity to render yet. */}
          <div className="flex items-start justify-between p-4 sm:p-6 border-b border-border bg-gradient-to-br from-slate-50/60 to-transparent">
            <div className="flex items-center gap-3 sm:gap-4 min-w-0">
              {mode === "view" && deal ? (
                <>
                  {/* Avatar — large, stable color from the name hash so
                      it matches the table avatar pill. */}
                  <div
                    className="w-10 h-10 sm:w-14 sm:h-14 rounded-full flex items-center justify-center text-white text-sm sm:text-lg font-bold shrink-0 shadow-sm"
                    style={{ backgroundColor: getNameColor(deal?.name) }}
                  >
                    {getInitials(deal?.name)}
                  </div>
                  <div className="min-w-0">
                    <h2 className="text-base sm:text-xl font-semibold text-foreground truncate capitalize">
                      {deal?.name}
                    </h2>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      {/* Status pill — previously only rendered when
                          mode !== "view" (so it was always empty in the
                          view we're actually looking at). Fixed: render
                          whenever deal.status is set. */}
                      {deal?.status && (
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 text-xs font-medium rounded-full ${getStageColor(
                            deal.status,
                          )}`}
                        >
                          {deal.status}
                        </span>
                      )}
                      {deal?.source && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs text-slate-600 bg-slate-100 rounded-full">
                          <Icon name="Tag" size={10} />
                          {deal.source}
                        </span>
                      )}
                      {deal?.assignedUserName && (
                        <span className="inline-flex items-center gap-1.5 pl-0.5 pr-2 py-0.5 rounded-full bg-white border border-slate-200 text-xs text-slate-700">
                          <span
                            className="w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-bold text-white"
                            style={{
                              backgroundColor: getNameColor(deal.assignedUserName),
                            }}
                          >
                            {getInitials(deal.assignedUserName)}
                          </span>
                          {deal.assignedUserName}
                        </span>
                      )}
                    </div>
                  </div>
                </>
              ) : (
                <h2 className="text-xl font-semibold text-foreground">
                  {mode === "mass-update"
                    ? `Mass Update (${selectedIds.length}) Leads`
                    : mode === "add"
                      ? "Add Lead"
                      : isEditing
                        ? "Edit Lead"
                        : deal?.name}
                </h2>
              )}
            </div>
            <div className="flex items-center space-x-2 shrink-0">
              {mode == "view" && canEditDeal(deal) && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (isEditing) setFormData(deal);
                    setIsEditing(!isEditing);
                  }}
                >
                  <Icon name="Edit" size={16} className="mr-1" />
                  {isEditing ? "Cancel" : "Edit"}
                </Button>
              )}

              <Button variant="ghost" size="icon" onClick={onClose}>
                <Icon name="X" size={20} />
              </Button>
            </div>
          </div>

          {/* Quick Actions + Next Contact strip — only in view mode.
              Three primary actions (Call / WhatsApp / Email) and a
              tone-aware "next follow-up" banner. The most-used surfaces
              for a sales rep, surfaced before the tabs. */}
          {mode === "view" && deal && !isEditing && (
            <div className="border-b border-border">
              <div className="px-6 py-3 flex flex-wrap gap-2 hidden sm:flex">
                <a
                  href={deal?.phoneNumber ? `tel:${deal.phoneNumber}` : undefined}
                  className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-colors ${deal?.phoneNumber
                    ? "bg-sky-50 text-sky-700 hover:bg-sky-100 border border-sky-200"
                    : "bg-slate-50 text-slate-400 border border-slate-200 pointer-events-none"
                    }`}
                >
                  <Icon name="Phone" size={14} />
                  Call
                </a>
                {(() => {
                  const waUrl = buildWhatsappUrl(deal);
                  return (
                    <a
                      href={waUrl || undefined}
                      target={waUrl ? "_blank" : undefined}
                      rel="noopener noreferrer"
                      className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-colors ${waUrl
                        ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200"
                        : "bg-slate-50 text-slate-400 border border-slate-200 pointer-events-none"
                        }`}
                    >
                      <Icon name="MessageCircle" size={14} />
                      WhatsApp
                    </a>
                  );
                })()}
                <a
                  href={
                    deal?.emailAddress ? `mailto:${deal.emailAddress}` : undefined
                  }
                  className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-colors ${deal?.emailAddress
                    ? "bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200"
                    : "bg-slate-50 text-slate-400 border border-slate-200 pointer-events-none"
                    }`}
                >
                  <Icon name="Mail" size={14} />
                  Email
                </a>
              </div>

              {/* Tone strip — color follows the descriptor's tone so
                  overdue is rose, today amber, future emerald, none
                  muted. Most actionable date on the screen. */}
              {(() => {
                const ncs = getNextContactStatus(deal?.cNextContactAt);
                const toneMap = {
                  rose:
                    "bg-rose-50 border-rose-200 text-rose-700",
                  amber:
                    "bg-amber-50 border-amber-200 text-amber-800",
                  emerald:
                    "bg-emerald-50 border-emerald-200 text-emerald-700",
                  muted:
                    "bg-slate-50 border-slate-200 text-slate-500",
                };
                const iconMap = {
                  rose: "AlertCircle",
                  amber: "Clock",
                  emerald: "Calendar",
                  muted: "CalendarOff",
                };
                return (
                  <div
                    className={`px-6 py-2.5 border-t flex items-center gap-2 text-sm ${toneMap[ncs.tone]}`}
                  >
                    <Icon name={iconMap[ncs.tone]} size={14} />
                    <span className="font-medium">Next contact:</span>
                    <span>{ncs.text}</span>
                  </div>
                );
              })()}
            </div>
          )}
          <div className="flex-1 overflow-y-auto">
            {showForm && !isMassUpdate && (
              <div className="p-6">
                {/* Lead Form Here */}
                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* ================= Overview ================= */}
                  <div className="bg-card border border-border rounded-lg p-4 space-y-4">
                    {/* Name */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Input
                        label="First Name *"
                        value={formData.firstName || ""}
                        onChange={(e) =>
                          handleChange("firstName", e.target.value)
                        }
                      />
                      <Input
                        label="Last Name"
                        value={formData.lastName || ""}
                        onChange={(e) =>
                          handleChange("lastName", e.target.value)
                        }
                      />
                    </div>

                    {/* Phone & Email */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Input
                        label="Phone"
                        value={formData.phoneNumber || ""}
                        onChange={(e) =>
                          handleChange("phoneNumber", e.target.value)
                        }
                      />
                      <Input
                        label="Email"
                        value={formData.emailAddress || ""}
                        onChange={(e) =>
                          handleChange("emailAddress", e.target.value)
                        }
                      />
                    </div>

                    {/* Whatsapp & City */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Input
                        label="Whatsapp"
                        value={formData.whatsapp || ""}
                        onChange={(e) =>
                          handleChange("whatsapp", e.target.value)
                        }
                      />
                      <Input
                        label="City"
                        value={formData.addressCity || ""}
                        onChange={(e) =>
                          handleChange("addressCity", e.target.value)
                        }
                      />
                    </div>

                    {/* Project & Next Contact */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {mode === "add" ? (
                        <Input
                          label="Project Name"
                          value={formData.cProject || ""}
                          onChange={(e) =>
                            handleChange("cProject", e.target.value)
                          }
                        />
                      ) : (
                        <Input
                          label="Project Name"
                          value={formData.cProject || ""}
                          onChange={(e) =>
                            handleChange("cProject", e.target.value)
                          }
                          disabled
                        />
                      )}

                      <Input
                        type="datetime-local"
                        label="Next Contact"
                        // 900s = 15-min increments to match the CRM backend's
                        // scheduling slots; the native time picker snaps to
                        // :00 / :15 / :30 / :45.
                        step={900}
                        value={fromEspoToLocalInput(formData.cNextContactAt)}
                        onChange={(e) =>
                          handleChange("cNextContactAt", e.target.value)
                        }
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-card border border-border rounded-lg p-4 space-y-4">
                      {mode === "add" ? (
                        <Input
                          label="Preference"
                          value={formData.cPreference || ""}
                          onChange={(e) =>
                            handleChange("cPreference", e.target.value)
                          }
                        />
                      ) : (
                        <Input
                          label="Preference"
                          value={formData.cPreference || ""}
                          onChange={(e) =>
                            handleChange("cPreference", e.target.value)
                          }
                          disabled
                        />
                      )}

                    </div>
                    <div className="bg-card border border-border rounded-lg p-4 space-y-4">
                      <Input
                        type="datetime-local"
                        label="Site Visit At"
                        // 15-min increments to align with backend slots.
                        step={900}
                        value={fromEspoToLocalInput(formData.cSiteVisitAt)}
                        onChange={(e) =>
                          handleChange("cSiteVisitAt", e.target.value)
                        }
                      />
                    </div>
                  </div>

                  {/* ================= Assigned User ================= */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-card border border-border rounded-lg p-4 space-y-4">
                      <Select
                        label="Assigned User"
                        value={formData.assignedUserId || ""}
                        options={userOptions} // 👉 later API se users
                        onChange={(value) =>
                          handleSelectChange("assignedUserId", value)
                        }
                        searchable
                      />
                    </div>
                    <div className="bg-card border border-border rounded-lg p-4 space-y-4">
                      <Select
                        label="Teams"
                        value={formData.teamId || ""}
                        options={teamOptions} // 👉 later API se teams
                        onChange={(value) =>
                          handleSelectChange("teamId", value)
                        }
                      />
                    </div>
                  </div>

                  {/* ================= Details ================= */}
                  <div className="bg-card border border-border rounded-lg p-4 space-y-4">
                    <h3 className="font-medium text-foreground">Details</h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Select
                        label="Status"
                        value={formData.status || "New"}
                        options={statusOptions}
                        onChange={(value) => handleChange("status", value)}
                      />
                      {isAdmin && (mode === "add" ? (
                        <Select
                          label="Source"
                          value={formData.source || ""}
                          options={sourceOptions}
                          onChange={(value) => handleChange("source", value)}
                        />
                      ) : (
                        <Select
                          label="Source"
                          value={formData.source || ""}
                          options={sourceOptions}
                          onChange={(value) => handleChange("source", value)}
                          disabled
                        />
                      ))}
                      {/* Sub Source is free-text (reps may enter campaign
                          names, ad sources, partner refs, etc. that don't
                          fit the canned sourceOptions list). Locked in
                          edit mode — write-once at creation, same rule as
                          the Source field. */}
                      <Input
                        label={isAdmin ? "Sub Source" : "Source"}
                        value={formData.cSubSource || ""}
                        onChange={(e) =>
                          handleChange("cSubSource", e.target.value)
                        }
                        disabled={mode !== "add"}
                      />
                      <Select
                        label="Industry"
                        value={formData.industry || ""}
                        options={IndustryOptions}
                        onChange={(value) => handleChange("industry", value)}
                        searchable
                      />
                      {mode === "add" ? (
                        <Input
                          type="datetime-local"
                          label="Lead Received At"
                          value={
                            fromEspoToLocalInput(formData.cLeatReceivedAt) ||
                            fromEspoToLocalInput(new Date())
                          }
                          onChange={(e) =>
                            handleChange("cLeatReceivedAt", e.target.value)
                          }
                        />
                      ) : (
                        <Input
                          type="datetime-local"
                          label="Lead Received At"
                          value={fromEspoToLocalInput(formData.cLeatReceivedAt)}
                          onChange={(e) =>
                            handleChange("cLeatReceivedAt", e.target.value)
                          }
                          disabled
                        />
                      )}

                    </div>
                    <div className="col-span-2">
                      <textarea
                        className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                        label="Description"
                        rows={4}
                        value={formData.description || ""}
                        placeholder="Description"
                        onChange={(e) =>
                          handleChange("description", e.target.value)
                        }
                      />
                    </div>
                  </div>

                  {/* ================= Actions ================= */}
                  <div className="flex justify-end gap-3">
                    <Button type="submit">Save Lead</Button>
                  </div>
                </form>
              </div>
            )}
            {/* mass upadte */}
            {isMassUpdate && (
              <form onSubmit={handleBulkUpdate}>
                {/* Intro banner — soft rose/maroon palette matching the
                    project's brand primary, consistent with the same
                    banner in meeting and tasks Mass Update forms. */}
                <div className="px-6 pt-4 pb-3">
                  <div className="rounded-xl bg-gradient-to-r from-rose-100/80 via-pink-100/70 to-rose-100/80 border border-rose-200/60 p-4 flex items-start gap-3">
                    <div className="w-10 h-10 rounded-full bg-white/80 ring-1 ring-rose-200 flex items-center justify-center text-[#AC2334] shrink-0">
                      <Icon name="Wand2" size={18} />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-[#AC2334]">
                        Updating {selectedIds.length} selected lead
                        {selectedIds.length !== 1 ? "s" : ""}
                      </p>
                      <p className="text-xs text-rose-700/80 mt-0.5 leading-relaxed">
                        Toggle the fields you want to change — unchecked fields stay as they are on each record.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Field toggle rows — each field is a self-contained
                    card with a maroon iOS-style switch. Active cards
                    use a rose border + white bg; inactive cards stay
                    muted so the rep can scan which fields will be
                    applied. */}
                <div className="px-6 pb-4 space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {/* Assigned User */}
                    <div
                      className={`rounded-xl border p-3 transition-colors ${
                        massFields.assignedUserId
                          ? "bg-white border-rose-300 shadow-sm"
                          : "bg-slate-50/60 border-slate-200"
                      }`}
                    >
                      <div className="flex items-center gap-3 mb-2">
                        <button
                          type="button"
                          role="switch"
                          aria-checked={massFields.assignedUserId}
                          onClick={() => toggleMassField("assignedUserId")}
                          className={`relative inline-flex h-6 w-10 items-center rounded-full transition-colors shrink-0 ${
                            massFields.assignedUserId ? "bg-[#AC2334]" : "bg-slate-300"
                          }`}
                        >
                          <span
                            className={`inline-block h-4 w-4 rounded-full bg-white shadow ring-1 ring-black/5 transition-transform ${
                              massFields.assignedUserId ? "translate-x-5" : "translate-x-1"
                            }`}
                          />
                        </button>
                        <span className="text-sm font-medium text-foreground flex-1">
                          Assigned User
                        </span>
                        <span
                          className={`text-[9px] uppercase font-semibold tracking-wider ${
                            massFields.assignedUserId ? "text-[#AC2334]" : "text-slate-400"
                          }`}
                        >
                          {massFields.assignedUserId ? "Will update" : "Skip"}
                        </span>
                      </div>
                      <Select
                        value={formData.assignedUserId}
                        options={userOptions}
                        disabled={!massFields.assignedUserId}
                        onChange={(v) => handleChange("assignedUserId", v)}
                        searchable
                      />
                    </div>

                    {/* Team */}
                    <div
                      className={`rounded-xl border p-3 transition-colors ${
                        massFields.teamId
                          ? "bg-white border-rose-300 shadow-sm"
                          : "bg-slate-50/60 border-slate-200"
                      }`}
                    >
                      <div className="flex items-center gap-3 mb-2">
                        <button
                          type="button"
                          role="switch"
                          aria-checked={massFields.teamId}
                          onClick={() => toggleMassField("teamId")}
                          className={`relative inline-flex h-6 w-10 items-center rounded-full transition-colors shrink-0 ${
                            massFields.teamId ? "bg-[#AC2334]" : "bg-slate-300"
                          }`}
                        >
                          <span
                            className={`inline-block h-4 w-4 rounded-full bg-white shadow ring-1 ring-black/5 transition-transform ${
                              massFields.teamId ? "translate-x-5" : "translate-x-1"
                            }`}
                          />
                        </button>
                        <span className="text-sm font-medium text-foreground flex-1">
                          Team
                        </span>
                        <span
                          className={`text-[9px] uppercase font-semibold tracking-wider ${
                            massFields.teamId ? "text-[#AC2334]" : "text-slate-400"
                          }`}
                        >
                          {massFields.teamId ? "Will update" : "Skip"}
                        </span>
                      </div>
                      <Select
                        value={formData.teamId}
                        options={teamOptions}
                        disabled={!massFields.teamId}
                        onChange={(v) => handleChange("teamId", v)}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {/* Status */}
                    <div
                      className={`rounded-xl border p-3 transition-colors ${
                        massFields.status
                          ? "bg-white border-rose-300 shadow-sm"
                          : "bg-slate-50/60 border-slate-200"
                      }`}
                    >
                      <div className="flex items-center gap-3 mb-2">
                        <button
                          type="button"
                          role="switch"
                          aria-checked={massFields.status}
                          onClick={() => toggleMassField("status")}
                          className={`relative inline-flex h-6 w-10 items-center rounded-full transition-colors shrink-0 ${
                            massFields.status ? "bg-[#AC2334]" : "bg-slate-300"
                          }`}
                        >
                          <span
                            className={`inline-block h-4 w-4 rounded-full bg-white shadow ring-1 ring-black/5 transition-transform ${
                              massFields.status ? "translate-x-5" : "translate-x-1"
                            }`}
                          />
                        </button>
                        <span className="text-sm font-medium text-foreground flex-1">
                          Status
                        </span>
                        <span
                          className={`text-[9px] uppercase font-semibold tracking-wider ${
                            massFields.status ? "text-[#AC2334]" : "text-slate-400"
                          }`}
                        >
                          {massFields.status ? "Will update" : "Skip"}
                        </span>
                      </div>
                      <Select
                        value={formData.status}
                        options={statusOptions}
                        disabled={!massFields.status}
                        onChange={(v) => handleChange("status", v)}
                      />
                    </div>

                    {/* Next Contact Date */}
                    <div
                      className={`rounded-xl border p-3 transition-colors ${
                        massFields.cNextContactAt
                          ? "bg-white border-rose-300 shadow-sm"
                          : "bg-slate-50/60 border-slate-200"
                      }`}
                    >
                      <div className="flex items-center gap-3 mb-2">
                        <button
                          type="button"
                          role="switch"
                          aria-checked={massFields.cNextContactAt}
                          onClick={() => toggleMassField("cNextContactAt")}
                          className={`relative inline-flex h-6 w-10 items-center rounded-full transition-colors shrink-0 ${
                            massFields.cNextContactAt ? "bg-[#AC2334]" : "bg-slate-300"
                          }`}
                        >
                          <span
                            className={`inline-block h-4 w-4 rounded-full bg-white shadow ring-1 ring-black/5 transition-transform ${
                              massFields.cNextContactAt ? "translate-x-5" : "translate-x-1"
                            }`}
                          />
                        </button>
                        <span className="text-sm font-medium text-foreground flex-1">
                          Next Contact
                        </span>
                        <span
                          className={`text-[9px] uppercase font-semibold tracking-wider ${
                            massFields.cNextContactAt ? "text-[#AC2334]" : "text-slate-400"
                          }`}
                        >
                          {massFields.cNextContactAt ? "Will update" : "Skip"}
                        </span>
                      </div>
                      <Input
                        type="datetime-local"
                        step={900}
                        value={fromEspoToLocalInput(formData.cNextContactAt)}
                        disabled={!massFields.cNextContactAt}
                        onChange={(e) =>
                          handleChange("cNextContactAt", e.target.value)
                        }
                      />
                    </div>
                  </div>
                </div>

                {/* Footer — Cancel + maroon-gradient submit (uses
                    project's `linearbg-1` class to match every other
                    primary CTA across the app). */}
                <div className="px-6 py-4 border-t border-border flex justify-end gap-3 bg-card">
                  <Button type="button" variant="outline" onClick={onClose}>
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    className="linearbg-1 text-white hover:text-white border-0"
                  >
                    Update {selectedIds.length} Lead
                    {selectedIds.length !== 1 ? "s" : ""}
                  </Button>
                </div>
              </form>
            )}

            {!showForm && !isMassUpdate && deal && (
              <>
                {/* Tabs */}
                <div className="flex items-center space-x-1 p-4 border-b border-border overflow-x-auto whitespace-nowrap scrollbar-hide">
                  {tabs?.map((tab) => (
                    <button
                      key={tab?.id}
                      onClick={() => setActiveTab(tab?.id)}
                      className={`
                  flex items-center space-x-2 px-3 py-2 text-sm font-medium rounded-lg transition-smooth
                  ${activeTab === tab?.id
                          ? "bg-primary text-primary-foreground"
                          : "text-muted-foreground hover:text-foreground hover:bg-muted"
                        }
                `}
                    >
                      <Icon name={tab?.icon} size={16} />
                      <span>{tab?.label}</span>
                    </button>
                  ))}
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6">
                  {activeTab === "overview" && (
                    <div className="space-y-5">


                      {/* ============ Contact ============ */}
                      <div className="border border-border rounded-xl overflow-hidden">
                        <div className="flex items-center gap-2 px-5 py-3 bg-slate-50/60 border-b border-border">
                          <Icon name="UserCircle" size={16} className="text-slate-500" />
                          <h3 className="text-sm font-semibold text-foreground">
                            Contact
                          </h3>
                        </div>
                        <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-5">
                          {/* Phone */}
                          <div className="flex items-start gap-3">
                            <Icon name="Phone" size={14} className="text-slate-400 mt-0.5 shrink-0" />
                            <div className="min-w-0">
                              <p className="text-xs text-muted-foreground mb-0.5">
                                Phone
                              </p>
                              {deal?.phoneNumber ? (
                                <a
                                  href={`tel:${deal.phoneNumber}`}
                                  className="text-sm text-primary hover:underline font-medium break-all"
                                >
                                  {deal.phoneNumber}
                                </a>
                              ) : (
                                <p className="text-sm text-muted-foreground">None</p>
                              )}
                            </div>
                          </div>

                          {/* Email */}
                          <div className="flex items-start gap-3">
                            <Icon name="Mail" size={14} className="text-slate-400 mt-0.5 shrink-0" />
                            <div className="min-w-0">
                              <p className="text-xs text-muted-foreground mb-0.5">
                                Email
                              </p>
                              {deal?.emailAddress ? (
                                <a
                                  href={`mailto:${deal.emailAddress}`}
                                  className="text-sm text-primary hover:underline font-medium break-all"
                                >
                                  {deal.emailAddress}
                                </a>
                              ) : (
                                <p className="text-sm text-muted-foreground">None</p>
                              )}
                            </div>
                          </div>

                          {/* WhatsApp — uses the shared buildWhatsappUrl
                              helper so the link logic is identical to
                              the header Quick Action. */}
                          <div className="flex items-start gap-3 md:col-span-2">
                            <Icon name="MessageCircle" size={14} className="text-emerald-500 mt-0.5 shrink-0" />
                            <div className="min-w-0">
                              <p className="text-xs text-muted-foreground mb-0.5">
                                WhatsApp
                              </p>
                              {(() => {
                                const url = buildWhatsappUrl(deal);
                                if (!url) {
                                  return (
                                    <p className="text-sm text-muted-foreground">
                                      None
                                    </p>
                                  );
                                }
                                return (
                                  <a
                                    href={url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-2 text-sm text-emerald-600 hover:text-emerald-700 hover:underline font-medium break-all"
                                  >
                                    {deal?.phoneNumber || deal?.cWhatsapp}
                                  </a>
                                );
                              })()}
                            </div>
                          </div>
                        </div>
                      </div>


                      <div className="border border-border rounded-xl overflow-hidden">
                        <div className="flex items-center gap-2 px-5 py-3 bg-slate-50/60 border-b border-border">
                          <Icon name="Briefcase" size={16} className="text-slate-500" />
                          <h3 className="text-sm font-semibold text-foreground">
                            Interest
                          </h3>
                        </div>
                        <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-5">
                          {/* Project — baseline */}
                          <div className="flex items-start gap-3">
                            <Icon name="Layers" size={14} className="text-slate-400 mt-0.5 shrink-0" />
                            <div className="min-w-0">
                              <p className="text-xs text-muted-foreground mb-0.5">
                                Project
                              </p>
                              <p className="text-sm text-foreground font-medium break-words">
                                {deal?.cProject || deal?.cProjectNomen || "None"}
                              </p>
                            </div>
                          </div>

                          {/* Project Name — only when distinct from
                              cProject (cProject often stores an id/code,
                              cProjectName the human-readable label). */}
                          {deal?.cProjectName &&
                            deal.cProjectName !== deal?.cProject && (
                              <div className="flex items-start gap-3">
                                <Icon name="Building2" size={14} className="text-slate-400 mt-0.5 shrink-0" />
                                <div className="min-w-0">
                                  <p className="text-xs text-muted-foreground mb-0.5">
                                    Project Name
                                  </p>
                                  <p className="text-sm text-foreground font-medium break-words">
                                    {deal.cProjectName}
                                  </p>
                                </div>
                              </div>
                            )}

                          {/* Project Type */}
                          {deal?.cProjectType && (
                            <div className="flex items-start gap-3">
                              <Icon name="LayoutGrid" size={14} className="text-slate-400 mt-0.5 shrink-0" />
                              <div className="min-w-0">
                                <p className="text-xs text-muted-foreground mb-0.5">
                                  Project Type
                                </p>
                                <p className="text-sm text-foreground font-medium">
                                  {deal.cProjectType}
                                </p>
                              </div>
                            </div>
                          )}

                          {deal?.cProjectBudget && (
                            <div className="flex items-start gap-3">
                              <Icon name="IndianRupee" size={14} className="text-slate-400 mt-0.5 shrink-0" />
                              <div className="min-w-0">
                                <p className="text-xs text-muted-foreground mb-0.5">
                                  Project Budget
                                </p>
                                <p className="text-sm text-foreground font-medium">
                                  {deal.cProjectBudget}
                                </p>
                              </div>
                            </div>
                          )}

                          {/* Project Location — separate from City: the
                              project's location, not the lead's. */}
                          {deal?.cProjectLocation && (
                            <div className="flex items-start gap-3">
                              <Icon name="Compass" size={14} className="text-slate-400 mt-0.5 shrink-0" />
                              <div className="min-w-0">
                                <p className="text-xs text-muted-foreground mb-0.5">
                                  Project Location
                                </p>
                                <p className="text-sm text-foreground font-medium">
                                  {deal.cProjectLocation}
                                </p>
                              </div>
                            </div>
                          )}

                          {/* Sub Source — baseline; relabeled "Source"
                              for non-admin reps so the source/sub-source
                              split stays internal. Source itself appears
                              as a pill in the hero (admin only). */}
                          <div className="flex items-start gap-3">
                            <Icon name="Tag" size={14} className="text-slate-400 mt-0.5 shrink-0" />
                            <div className="min-w-0">
                              <p className="text-xs text-muted-foreground mb-0.5">
                                {isAdmin ? "Sub Source" : "Source"}
                              </p>
                              <p className="text-sm text-foreground font-medium">
                                {deal?.cSubSource || "None"}
                              </p>
                            </div>
                          </div>

                          {/* Lead Source — distinct from the top-level
                              `source` (channel) and `cSubSource` (sub-
                              channel). Some imports carry their own
                              labeled source separately. */}
                          {deal?.cLeadSource && (
                            <div className="flex items-start gap-3">
                              <Icon name="Megaphone" size={14} className="text-slate-400 mt-0.5 shrink-0" />
                              <div className="min-w-0">
                                <p className="text-xs text-muted-foreground mb-0.5">
                                  Lead Source
                                </p>
                                <p className="text-sm text-foreground font-medium">
                                  {deal.cLeadSource}
                                </p>
                              </div>
                            </div>
                          )}

                          {/* Platform — where they were reached (FB, IG,
                              WhatsApp, Web, etc.). */}
                          {deal?.cPlatform && (
                            <div className="flex items-start gap-3">
                              <Icon name="Smartphone" size={14} className="text-slate-400 mt-0.5 shrink-0" />
                              <div className="min-w-0">
                                <p className="text-xs text-muted-foreground mb-0.5">
                                  Platform
                                </p>
                                <p className="text-sm text-foreground font-medium">
                                  {deal.cPlatform}
                                </p>
                              </div>
                            </div>
                          )}

                          {/* City — baseline */}
                          <div className="flex items-start gap-3">
                            <Icon name="MapPin" size={14} className="text-slate-400 mt-0.5 shrink-0" />
                            <div className="min-w-0">
                              <p className="text-xs text-muted-foreground mb-0.5">
                                City
                              </p>
                              <p className="text-sm text-foreground font-medium capitalize">
                                {deal?.addressCity || "None"}
                              </p>
                            </div>
                          </div>

                          {/* Client Nomen — internal client-code; admin
                              only since reps don't deal with it. */}
                          {isAdmin && deal?.cClientNomen && (
                            <div className="flex items-start gap-3">
                              <Icon name="Hash" size={14} className="text-slate-400 mt-0.5 shrink-0" />
                              <div className="min-w-0">
                                <p className="text-xs text-muted-foreground mb-0.5">
                                  Client Nomen
                                </p>
                                <p className="text-sm text-foreground font-medium break-words">
                                  {deal.cClientNomen}
                                </p>
                              </div>
                            </div>
                          )}

                          {/* Preference — full width because the parsed
                              bullets need horizontal room. Same parser
                              as before (splits on <b>…</b> tags). */}
                          <div className="flex items-start gap-3 md:col-span-2">
                            <Icon name="Heart" size={14} className="text-slate-400 mt-0.5 shrink-0" />
                            <div className="min-w-0 flex-1">
                              <p className="text-xs text-muted-foreground mb-1">
                                Preference
                              </p>
                              <div className="text-sm text-foreground">
                                {(() => {
                                  if (!deal?.cPreference) {
                                    return (
                                      <span className="text-muted-foreground">
                                        None
                                      </span>
                                    );
                                  }
                                  const parts = deal.cPreference.split(
                                    /(<b>.*?<\/b>)/g,
                                  );
                                  const items = [];
                                  let buffer = "";
                                  for (const part of parts) {
                                    const m = part.match(/^<b>(.*)<\/b>$/);
                                    if (m) {
                                      items.push({
                                        text: buffer.trim(),
                                        bold: m[1].trim(),
                                      });
                                      buffer = "";
                                    } else {
                                      buffer += part;
                                    }
                                  }
                                  if (buffer.trim()) {
                                    items.push({
                                      text: buffer.trim(),
                                      bold: null,
                                    });
                                  }
                                  if (!items.length) return deal.cPreference;
                                  return (
                                    <ul className="list-disc pl-5 space-y-1">
                                      {items.map((it, i) => (
                                        <li key={i}>
                                          {it.text}
                                          {it.bold && (
                                            <>
                                              {" "}
                                              <strong className="font-semibold">
                                                {it.bold}
                                              </strong>
                                            </>
                                          )}
                                        </li>
                                      ))}
                                    </ul>
                                  );
                                })()}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* ============ Lifecycle ============ */}
                      <div className="border border-border rounded-xl overflow-hidden">
                        <div className="flex items-center gap-2 px-5 py-3 bg-slate-50/60 border-b border-border">
                          <Icon name="Activity" size={16} className="text-slate-500" />
                          <h3 className="text-sm font-semibold text-foreground">
                            Lifecycle
                          </h3>
                        </div>
                        <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-5">
                          {/* Lead Received At */}
                          <div className="flex items-start gap-3">
                            <Icon name="Inbox" size={14} className="text-slate-400 mt-0.5 shrink-0" />
                            <div className="min-w-0">
                              <p className="text-xs text-muted-foreground mb-0.5">
                                Lead Received
                              </p>
                              <p className="text-sm text-foreground font-medium">
                                {deal?.cLeatReceivedAt
                                  ? formatDateTime(deal.cLeatReceivedAt)
                                  : "None"}
                              </p>
                            </div>
                          </div>

                          {/* Created At — the row's creation timestamp,
                              distinct from when the lead was received. */}
                          <div className="flex items-start gap-3">
                            <Icon name="PlusCircle" size={14} className="text-slate-400 mt-0.5 shrink-0" />
                            <div className="min-w-0">
                              <p className="text-xs text-muted-foreground mb-0.5">
                                Created
                              </p>
                              <p className="text-sm text-foreground font-medium">
                                {deal?.createdAt
                                  ? formatDateTime(deal.createdAt)
                                  : "None"}
                              </p>
                            </div>
                          </div>

                          {/* Next Contact — exact datetime as a reference
                              (the smart banner above is human-readable). */}
                          <div className="flex items-start gap-3">
                            <Icon name="Clock" size={14} className="text-slate-400 mt-0.5 shrink-0" />
                            <div className="min-w-0">
                              <p className="text-xs text-muted-foreground mb-0.5">
                                Next Contact
                              </p>
                              <p className="text-sm text-foreground font-medium">
                                {deal?.cNextContactAt
                                  ? formatDateTime(deal.cNextContactAt)
                                  : "None"}
                              </p>
                            </div>
                          </div>

                          {/* Site Visit */}
                          <div className="flex items-start gap-3">
                            <Icon name="Home" size={14} className="text-slate-400 mt-0.5 shrink-0" />
                            <div className="min-w-0">
                              <p className="text-xs text-muted-foreground mb-0.5">
                                Site Visit
                              </p>
                              <p className="text-sm text-foreground font-medium">
                                {deal?.cSiteVisitAt
                                  ? formatDateTime(deal.cSiteVisitAt)
                                  : "None"}
                              </p>
                            </div>
                          </div>

                          {/* Description — full width, multi-line. */}
                          <div className="flex items-start gap-3 md:col-span-2">
                            <Icon name="FileText" size={14} className="text-slate-400 mt-0.5 shrink-0" />
                            <div className="min-w-0 flex-1">
                              <p className="text-xs text-muted-foreground mb-0.5">
                                Description
                              </p>
                              <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap break-words">
                                {(() => {
                                  if (!deal?.description) return "None";
                                 
                                  const URL_RE = /(https?:\/\/[^\s)]+)/g;
                                  const parts =
                                    deal.description.split(URL_RE);
                                  return parts.map((part, i) => {
                                    if (!part) return null;
                                    if (/^https?:\/\//.test(part)) {
                                      return (
                                        <a
                                          key={i}
                                          href={part}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="text-primary hover:underline break-all"
                                        >
                                          {part}
                                        </a>
                                      );
                                    }
                                    return (
                                      <span key={i}>{part}</span>
                                    );
                                  });
                                })()}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {activeTab === "Stream" && (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-medium text-foreground">
                          Recent Stream
                        </h3>
                        <Button
                          variant="outline"
                          size="sm"
                          className={"bg-gradient-to-r from-violet-500 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white hover:text-white border-0"}
                          onClick={createActivity}
                        >
                          <Icon name="Plus" size={16} className="mr-1" />
                          Write the first stream
                        </Button>
                      </div>
                      <div className="space-y-4">
                        {/* add activity form */}
                        {showActivityForm && (
                          <form onSubmit={handlePostActivity}>
                            <textarea
                              className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                              label="Activity"
                              rows={4}
                              placeholder="Write Your Comment Here..."
                              value={activityText}
                              onChange={(e) => setActivityText(e.target.value)}
                            />
                            <div className="flex justify-end gap-2">
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setActivityForm(false);
                                  setActivityText("");
                                }}
                              >
                                Cancel
                                <Icon
                                  name="XCircle"
                                  size={16}
                                  className="mr-1"
                                />
                              </Button>

                              <Button
                                type="submit"
                                size="sm"
                                disabled={postingActivity}
                              >
                                {editingActivityId ? "Update" : "Post"}
                                <Icon
                                  name={editingActivityId ? "Save" : "Send"}
                                  size={16}
                                  className="mr-1"
                                />
                              </Button>
                            </div>
                          </form>
                        )}

                        {!showActivityForm && streams.length === 0 && (
                          <div className="relative overflow-hidden rounded-3xl border border-dashed border-violet-200 bg-gradient-to-br from-violet-50/40 via-white to-indigo-50/30 p-8 text-center">
                            <div className="absolute -top-12 -right-12 w-40 h-40 bg-violet-200/40 rounded-full blur-3xl pointer-events-none" />
                            <div className="absolute -bottom-12 -left-12 w-40 h-40 bg-indigo-200/40 rounded-full blur-3xl pointer-events-none" />
                            <div className="relative">
                              <div className="relative inline-flex">
                                <div className="absolute inset-0 bg-gradient-to-br from-violet-400 to-indigo-500 rounded-2xl blur-md opacity-40 animate-pulse" />
                                <div className="relative w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-lg">
                                  <Icon name="MessageSquare" size={28} className="text-white" />
                                </div>
                              </div>
                              <h4 className="mt-4 text-lg font-bold text-slate-900">
                                No conversations yet
                              </h4>
                              <p className="mt-1.5 text-sm text-slate-500 max-w-sm mx-auto">
                                Notes, updates, and team mentions about this lead live here as a timeline.
                              </p>
                              <div className="mt-5 flex flex-wrap justify-center gap-1.5">
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs text-violet-700 bg-violet-100/70 rounded-full">
                                  <Icon name="Sparkles" size={10} />
                                  Quick notes
                                </span>
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs text-indigo-700 bg-indigo-100/70 rounded-full">
                                  <Icon name="AtSign" size={10} />
                                  Mention teammates
                                </span>
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs text-slate-600 bg-slate-100 rounded-full">
                                  <Icon name="Clock" size={10} />
                                  Auto-timestamped
                                </span>
                              </div>

                            </div>
                          </div>
                        )}
                        {streams?.map((activity) => (
                          <div
                            key={activity.id}
                            className="flex space-x-3 p-4 bg-muted/30 rounded-lg"
                          >
                            {/* AVATAR */}
                            <Avatar
                              name={activity.name}
                              size="36"
                              round
                              textSizeRatio={2}
                              color={
                                activity.createdById === "system"
                                  ? "#9CA3AF"
                                  : undefined
                              }
                            />

                            {/* CONTENT */}
                            <div className="flex-1">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-2">
                                  <h4 className="font-medium text-foreground">
                                    {activity.createdByName || "System"}
                                  </h4>

                                  <Icon
                                    name={getActivityIcon(activity.type)}
                                    size={14}
                                    className={getActivityIconColor(
                                      activity.type,
                                    )}
                                  />

                                  <span className="text-xs text-muted-foreground">
                                    {activity.type}
                                  </span>
                                </div>

                                <span className="text-xs text-muted-foreground">
                                  {formatDate(activity.createdAt)}
                                </span>
                                <div
                                  className={`flex items-center space-x-1 transition-opacity`}
                                >
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleEditActivity(activity)}
                                    className="h-8 w-8 hidden"
                                  >
                                    <Icon name="Edit" size={14} />
                                  </Button>

                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={(e) => handleDelete(e, activity)}
                                    className="h-8 w-8 text-destructive hover:text-destructive"
                                  >
                                    <Icon name="Trash2" size={14} />
                                  </Button>
                                </div>
                              </div>

                              {/* MESSAGE */}
                              <p className="text-sm text-muted-foreground mt-1">
                                {getActivityMessage(activity)}
                              </p>

                              {/* STATUS BADGE */}
                              {activity?.data?.value && (
                                <span
                                  className={`inline-block mt-2 px-2 py-0.5 text-xs rounded-full ${getStageColor(
                                    activity.data.value,
                                  )}`}
                                >
                                  {activity.data.value}
                                </span>
                              )}

                              {activity?.data?.statusValue && (
                                <span
                                  className={`inline-block mt-2 px-2 py-0.5 text-xs rounded-full ${getStageColor(
                                    activity.data.statusValue,
                                  )}`}
                                >
                                  {activity.data.statusValue}
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {activeTab === "AssignedUsers" && (
                    <div className="space-y-5">

                      <div className="border border-border rounded-xl overflow-hidden">
                        <div className="flex items-center gap-2 px-5 py-3 bg-slate-50/60 border-b border-border">
                          <Icon name="UserCheck" size={16} className="text-slate-500" />
                          <h3 className="text-sm font-semibold text-foreground">
                            Assigned User
                          </h3>
                        </div>
                        <div className="p-6">
                          {leadData?.assignedUserName ? (() => {
                           
                            const rep =
                              users.find(
                                (u) => u.id === leadData.assignedUserId,
                              ) ||
                              users.find(
                                (u) => u.name === leadData.assignedUserName,
                              );

                            return (
                              <div className="flex items-start gap-4">
                                <div className="relative shrink-0">
                                  <div
                                    className="w-16 h-16 rounded-full flex items-center justify-center text-white text-xl font-bold shadow-md ring-4 ring-white"
                                    style={{
                                      backgroundColor: getNameColor(
                                        leadData.assignedUserName,
                                      ),
                                    }}
                                  >
                                    {getInitials(leadData.assignedUserName)}
                                  </div>
                                  <div className="absolute bottom-0 right-0 w-4 h-4 rounded-full bg-emerald-500 border-2 border-white" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <h4 className="text-base font-semibold text-slate-900 truncate">
                                    {leadData.assignedUserName}
                                  </h4>

                                  {(rep?.emailAddress || rep?.phoneNumber) && (
                                    <div className="mt-3 space-y-1.5">
                                      {rep?.phoneNumber && (
                                        <a
                                          href={`tel:${rep.phoneNumber}`}
                                          className="flex items-center gap-2 text-xs text-slate-600 hover:text-primary transition-colors"
                                        >
                                          <Icon name="Phone" size={12} className="text-slate-400" />
                                          <span className="font-medium">
                                            {rep.phoneNumber}
                                          </span>
                                        </a>
                                      )}
                                      {rep?.emailAddress && (
                                        <a
                                          href={`mailto:${rep.emailAddress}`}
                                          className="flex items-center gap-2 text-xs text-slate-600 hover:text-primary transition-colors break-all"
                                        >
                                          <Icon name="Mail" size={12} className="text-slate-400 shrink-0" />
                                          <span className="font-medium">
                                            {rep.emailAddress}
                                          </span>
                                        </a>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })() : (
                            /* Empty state — no rep assigned. Amber not
                               rose because this isn't a failure, just an
                               unfilled state requiring action. */
                            <div className="text-center py-8">
                              <div className="inline-flex w-14 h-14 rounded-full bg-amber-50 items-center justify-center border border-amber-100">
                                <Icon name="UserX" size={22} className="text-amber-500" />
                              </div>
                              <h4 className="mt-3 text-sm font-semibold text-slate-900">
                                No rep assigned
                              </h4>
                              <p className="mt-1 text-xs text-slate-500 max-w-sm mx-auto">
                                Assign this lead to take ownership of follow-ups.
                              </p>
                            </div>
                          )}


                          {(() => {
                            const followers = leadsDetails?.followersNames
                              ? Object.entries(leadsDetails.followersNames)
                              : [];
                            return (
                              <div className="mt-6 pt-5 border-t border-border">
                                <div className="flex items-center gap-2 mb-3">
                                  <Icon name="Users" size={14} className="text-slate-500" />
                                  <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-600">
                                    Followers
                                  </h4>
                                  {followers.length > 0 && (
                                    <span className="text-xs text-muted-foreground">
                                      ({followers.length})
                                    </span>
                                  )}
                                </div>
                                {followers.length > 0 ? (
                                  <div className="flex flex-wrap gap-2">
                                    {followers.map(([id, name]) => (
                                      <div
                                        key={id}
                                        className="inline-flex items-center gap-2 pl-0.5 pr-3 py-0.5 rounded-full bg-slate-50 border border-slate-200 hover:bg-slate-100 transition-colors"
                                      >
                                        <div
                                          className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-bold shrink-0"
                                          style={{ backgroundColor: getNameColor(name) }}
                                        >
                                          {getInitials(name)}
                                        </div>
                                        <span className="text-sm font-medium text-slate-700">
                                          {name}
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <p className="text-xs text-slate-400">
                                    No followers yet.
                                  </p>
                                )}
                              </div>
                            );
                          })()}
                        </div>
                      </div>

                      {/* ============ Audit Trail ============ */}
                      <div className="border border-border rounded-xl overflow-hidden">
                        <div className="flex items-center gap-2 px-5 py-3 bg-slate-50/60 border-b border-border">
                          <Icon name="History" size={16} className="text-slate-500" />
                          <h3 className="text-sm font-semibold text-foreground">
                            Audit Trail
                          </h3>
                        </div>
                        <div className="p-5">
                          {/* Vertical timeline — `pl-6` reserves the
                              gutter, the `absolute` line + dots sit in
                              that gutter. Created uses emerald (origin),
                              modified uses sky (motion). */}
                          <div className="relative pl-6">
                            <div className="absolute left-1.5 top-2 bottom-2 w-px bg-slate-200" />

                            {/* Created */}
                            <div className="relative pb-5">
                              <div className="absolute -left-6 top-1 w-4 h-4 rounded-full border-2 border-emerald-400 bg-white flex items-center justify-center">
                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                              </div>
                              <p className="text-[10px] uppercase tracking-wider text-emerald-600 font-medium">
                                Created
                              </p>
                              <p className="text-sm font-medium text-slate-900 mt-0.5">
                                {deal?.createdAt
                                  ? formatDateTime(deal.createdAt)
                                  : "—"}
                              </p>
                              {deal?.createdByName && (
                                <div className="mt-1 flex items-center gap-1.5">
                                  <div
                                    className="w-4 h-4 rounded-full flex items-center justify-center text-white text-[8px] font-bold"
                                    style={{
                                      backgroundColor: getNameColor(deal.createdByName),
                                    }}
                                  >
                                    {getInitials(deal.createdByName)}
                                  </div>
                                  <p className="text-xs text-slate-500">
                                    by {deal.createdByName}
                                  </p>
                                </div>
                              )}
                            </div>

                            {/* Modified */}
                            <div className="relative">
                              <div className="absolute -left-6 top-1 w-4 h-4 rounded-full border-2 border-sky-400 bg-white flex items-center justify-center">
                                <div className="w-1.5 h-1.5 rounded-full bg-sky-500" />
                              </div>
                              <p className="text-[10px] uppercase tracking-wider text-sky-600 font-medium">
                                Last modified
                              </p>
                              <p className="text-sm font-medium text-slate-900 mt-0.5">
                                {deal?.modifiedAt
                                  ? formatDateTime(deal.modifiedAt)
                                  : "—"}
                              </p>
                              {deal?.modifiedByName && (
                                <div className="mt-1 flex items-center gap-1.5">
                                  <div
                                    className="w-4 h-4 rounded-full flex items-center justify-center text-white text-[8px] font-bold"
                                    style={{
                                      backgroundColor: getNameColor(deal.modifiedByName),
                                    }}
                                  >
                                    {getInitials(deal.modifiedByName)}
                                  </div>
                                  <p className="text-xs text-slate-500">
                                    by {deal.modifiedByName}
                                  </p>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {activeTab === "Task" && (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-medium text-foreground">
                          Recent Task
                        </h3>
                        <Button
                          variant="outline"
                          size="sm"
                          className={"bg-gradient-to-r from-orange-400 to-orange-500 hover:from-orange-600 hover:to-orange-600 text-white hover:text-white border-0"}
                          onClick={() => setTaskDrawerOpen(true)}
                        >
                          <Icon name="Plus" size={16} className="mr-1" />
                          Create first task
                        </Button>
                      </div>
                      <div className="space-y-4">

                        {task.length === 0 && (
                          <div className="relative overflow-hidden rounded-3xl border border-dashed border-orange-200 bg-gradient-to-br from-orange-50/40 via-white to-orange-50/30 p-8 text-center">
                            <div className="absolute -top-12 -left-12 w-40 h-40 bg-orange-200/40 rounded-full blur-3xl pointer-events-none" />
                            <div className="absolute -bottom-12 -right-12 w-40 h-40 bg-orange-200/40 rounded-full blur-3xl pointer-events-none" />
                            <div className="relative">
                              <div className="relative inline-flex">
                                <div className="absolute inset-0 bg-gradient-to-br from-orange-400 to-orange-500 rounded-2xl blur-md opacity-40 animate-pulse" />
                                <div className="relative w-16 h-16 rounded-2xl bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center shadow-lg">
                                  <Icon name="ListChecks" size={28} className="text-white" />
                                </div>
                              </div>
                              <h4 className="mt-4 text-lg font-bold text-slate-900">
                                No tasks queued
                              </h4>
                              <p className="mt-1.5 text-sm text-slate-500 max-w-sm mx-auto">
                                Plan your next move — follow up, schedule a callback.
                              </p>
                              <div className="mt-5 flex flex-wrap justify-center gap-2">
                                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-full border bg-rose-50 text-rose-700 border-rose-200">
                                  <Icon name="Phone" size={12} />
                                  Call back
                                </span>
                                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-full border bg-amber-50 text-amber-700 border-amber-200">
                                  <Icon name="FileText" size={12} />
                                  Send proposal
                                </span>
                                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-full border bg-teal-50 text-teal-700 border-teal-200">
                                  <Icon name="MapPin" size={12} />
                                  Schedule visit
                                </span>
                                {/* <span className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-full border bg-sky-50 text-sky-700 border-sky-200">
                                  <Icon name="Mail" size={12} />
                                  Email follow-up
                                </span> */}
                              </div>

                            </div>
                          </div>
                        )}
                        {task?.map((activity) => (
                          <div
                            key={activity.id}
                            className="group relative overflow-hidden rounded-3xl border border-slate-200/70 bg-white/90 backdrop-blur-xl p-4 cursor-pointer transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_12px_40px_rgba(15,23,42,0.12)]"
                            onClick={() =>
                              navigate("/tasks", {
                                state: {
                                  taskId: activity.id,
                                },
                              })
                            }
                          >

                            {/* glow effect */}
                            <div className="absolute inset-0 bg-gradient-to-br from-violet-50/40 via-transparent to-sky-50/40 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

                            <div className="relative flex gap-3">

                              {/* Avatar */}
                              <div className="shrink-0">
                                <div className="relative">
                                  <div className="rounded-full p-[2px] bg-gradient-to-br from-violet-400 via-fuchsia-400 to-pink-400 shadow-lg">
                                    <div className="bg-white rounded-full overflow-hidden">
                                      <Avatar
                                        name={activity.name}
                                        size="46"
                                        round={false}
                                        textSizeRatio={2}
                                        color={
                                          activity.createdById === "system"
                                            ? "#9CA3AF"
                                            : undefined
                                        }
                                      />
                                    </div>
                                  </div>


                                </div>
                              </div>

                              {/* Content */}
                              <div className="flex-1 min-w-0">

                                {/* top section */}
                                <div className="flex items-start justify-between gap-2">

                                  <div className="min-w-0">
                                    <div className="flex items-center gap-1.5 flex-wrap">

                                      <h4 className="text-[16px] font-semibold text-slate-900 truncate">
                                        {activity.name}
                                      </h4>

                                      <div className="flex items-center justify-center w-5 h-5 rounded-full bg-violet-100 text-violet-600">
                                        <Icon
                                          name={getActivityIcon(activity.type)}
                                          size={11}
                                        />
                                      </div>

                                      <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wide">
                                        {activity.type}
                                      </span>
                                    </div>

                                    {/* description */}
                                    {(activity.description ||
                                      activity?.data?.description) && (
                                        <p className="mt-1 text-[13px] leading-relaxed text-slate-500 line-clamp-2">
                                          {activity.description ||
                                            activity?.data?.description}
                                        </p>
                                      )}
                                  </div>

                                  {/* date */}
                                  <div className="shrink-0 rounded-lg bg-slate-50 px-2.5 py-1 border border-slate-100">
                                    <span className="text-[11px] font-medium text-slate-500 whitespace-nowrap">
                                      {formatDate(activity.createdAt)}
                                    </span>
                                  </div>
                                </div>

                                {/* bottom section */}
                                <div className="flex flex-wrap items-center gap-1.5 mt-3">

                                  {/* status */}
                                  {(activity?.status ||
                                    activity?.data?.statusValue ||
                                    activity?.data?.value) && (
                                      <span
                                        className={`px-2.5 py-1 text-[11px] font-semibold rounded-xl shadow-sm ${getStageColor(
                                          activity?.status ||
                                          activity?.data?.statusValue ||
                                          activity?.data?.value
                                        )}`}
                                      >
                                        {activity?.status ||
                                          activity?.data?.statusValue ||
                                          activity?.data?.value}
                                      </span>
                                    )}

                                  {/* priority */}
                                  {(activity.priority ||
                                    activity?.data?.priority) && (
                                      <span
                                        className={`px-2.5 py-1 text-[11px] font-semibold rounded-xl border shadow-sm ${(activity.priority ||
                                          activity?.data?.priority) === "High"
                                          ? "bg-red-50 text-red-600 border-red-200"
                                          : (activity.priority ||
                                            activity?.data?.priority) === "Medium"
                                            ? "bg-amber-50 text-amber-600 border-amber-200"
                                            : "bg-emerald-50 text-emerald-600 border-emerald-200"
                                          }`}
                                      >
                                        {(activity.priority ||
                                          activity?.data?.priority)}{" "}
                                        Priority
                                      </span>
                                    )}

                                  {/* activity message */}
                                  <div className="flex items-center gap-1 text-[11px] text-slate-500 ml-auto">
                                    <div className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse" />

                                    <span>
                                      {getActivityMessage(activity)}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {activeTab === "Meeting" && (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-medium text-foreground">
                          Recent Meeting
                        </h3>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setMeetingDrawerOpen(true)}
                          className="bg-gradient-to-r from-sky-500 to-sky-700 hover:from-cyan-700 hover:to-sky-700 text-white hover:text-white border-0"
                        >
                          <Icon name="Plus" size={16} className="mr-1" />
                          Schedule Meeting
                        </Button>
                      </div>
                      <div className="space-y-4">

                        {meeting.length === 0 && (
                          <div className="relative overflow-hidden rounded-3xl border border-dashed border-cyan-200 bg-gradient-to-br from-cyan-50/40 via-white to-sky-50/30 p-8 text-center">
                            <div className="absolute -top-12 -right-12 w-40 h-40 bg-cyan-200/40 rounded-full blur-3xl pointer-events-none" />
                            <div className="absolute -bottom-12 -left-12 w-40 h-40 bg-sky-200/40 rounded-full blur-3xl pointer-events-none" />
                            <div className="relative">
                              <div className="relative inline-flex">
                                <div className="absolute inset-0 bg-gradient-to-br from-cyan-400 to-sky-500 rounded-2xl blur-md opacity-40 animate-pulse" />
                                <div className="relative w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-500 to-sky-600 flex items-center justify-center shadow-lg">
                                  <Icon name="Calendar" size={28} className="text-white" />
                                </div>
                              </div>
                              <h4 className="mt-4 text-lg font-bold text-slate-900">
                                No meetings on the books
                              </h4>
                              <p className="mt-1.5 text-sm text-slate-500 max-w-sm mx-auto">
                                Schedule a touch-base, site visit, or proposal walkthrough.
                              </p>
                              {/* Mini week-view placeholder. Bars use a
                                  decreasing opacity from Mon → Fri so it
                                  reads as "upcoming days, unfilled". */}
                              <div className="mt-5 inline-flex flex-col gap-1.5">
                                {[
                                  { day: "MON", width: "35%" },
                                  { day: "WED", width: "55%" },
                                  { day: "FRI", width: "25%" },
                                ].map(({ day, width }) => (
                                  <div
                                    key={day}
                                    className="flex items-center gap-3 px-4 py-1.5 bg-white/70 rounded-xl border border-slate-200 min-w-[220px]"
                                  >
                                    <span className="text-[10px] font-bold text-cyan-600 uppercase tracking-wider w-7">
                                      {day}
                                    </span>
                                    <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                      <div
                                        className="h-full bg-gradient-to-r from-cyan-400 to-sky-400 rounded-full opacity-30"
                                        style={{ width }}
                                      />
                                    </div>
                                    <span className="text-[10px] text-slate-400">—</span>
                                  </div>
                                ))}
                              </div>

                            </div>
                          </div>
                        )}
                        {meeting?.map((meet) => (
                          <div
                            key={meet.id}
                            onClick={() =>
                              navigate("/meeting", {
                                state: { meetingId: meet.id },
                              })
                            }
                            className="group relative overflow-hidden rounded-3xl border border-slate-200/70 bg-white/90 backdrop-blur-xl p-4 cursor-pointer transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_12px_40px_rgba(15,23,42,0.12)]"
                          >

                            {/* glow effect */}
                            <div className="absolute inset-0 bg-gradient-to-br from-cyan-50/40 via-transparent to-blue-50/40 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

                            <div className="relative flex gap-3">

                              {/* Avatar */}
                              <div className="shrink-0">
                                <div className="relative">
                                  <div className="rounded-xl p-[2px] bg-gradient-to-br from-cyan-400 via-sky-400 to-blue-500 shadow-lg">
                                    <div className="bg-white rounded-xl overflow-hidden">
                                      <Avatar
                                        name={meet.name}
                                        size="46"
                                        round={false}
                                        textSizeRatio={2}
                                      />
                                    </div>
                                  </div>

                                  {/* active dot */}
                                  <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full border-[2px] border-white bg-cyan-500 shadow-md" />
                                </div>
                              </div>

                              {/* Content */}
                              <div className="flex-1 min-w-0">

                                {/* Top Section */}
                                <div className="flex items-start justify-between gap-2">

                                  <div className="min-w-0">
                                    <div className="flex items-center gap-1.5 flex-wrap">

                                      <h4 className="text-[16px] font-semibold text-slate-900 truncate">
                                        {meet.name}
                                      </h4>

                                      <div className="flex items-center justify-center w-5 h-5 rounded-full bg-violet-100 text-violet-600">
                                        <Icon
                                          name="CalendarDays"
                                          size={11}
                                        />
                                      </div>

                                      <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wide">
                                        Meeting
                                      </span>
                                    </div>

                                    {/* Description */}
                                    {(meet.description || meet.agenda) && (
                                      <p className="mt-1 text-[13px] leading-relaxed text-slate-500 line-clamp-2">
                                        {meet.description || meet.agenda}
                                      </p>
                                    )}
                                  </div>

                                  {/* Date */}
                                  <div className="shrink-0 rounded-lg bg-slate-50 px-2.5 py-1 border border-slate-100">
                                    <span className="text-[11px] font-medium text-slate-500 whitespace-nowrap">
                                      {formatDate(meet.dateStart)}
                                    </span>
                                  </div>
                                </div>

                                {/* Bottom Section */}
                                <div className="flex flex-wrap items-center gap-1.5 mt-3">

                                  {/* Status */}
                                  {meet.status && (
                                    <span
                                      className={`px-2.5 py-1 text-[11px] font-semibold rounded-xl shadow-sm ${meet.status === "Held"
                                        ? "bg-emerald-50 text-emerald-600"
                                        : meet.status === "Planned"
                                          ? "bg-blue-50 text-blue-600"
                                          : meet.status === "Not Held"
                                            ? "bg-red-50 text-red-600"
                                            : "bg-slate-100 text-slate-600"
                                        }`}
                                    >
                                      {meet.status}
                                    </span>
                                  )}

                                  {/* Meeting Time */}
                                  {meet.dateStart && (
                                    <span className="px-2.5 py-1 text-[11px] font-medium rounded-xl bg-violet-50 text-violet-700 border border-violet-100">
                                      {new Date(meet.dateStart).toLocaleTimeString([], {
                                        hour: "2-digit",
                                        minute: "2-digit",
                                      })}
                                    </span>
                                  )}

                                  {/* Footer Message */}
                                  <div className="flex items-center gap-1 text-[11px] text-slate-500 ml-auto">
                                    <div className="w-1.5 h-1.5 rounded-full bg-violet-700 animate-pulse" />

                                    <span>
                                      Meeting scheduled
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
        <ActivityDrawer
          isOpen={taskDrawerOpen}
          entityType="task"
          onClose={() => setTaskDrawerOpen(false)}
          mode="add"
          deal={{
            parentType: "Lead",
            parentId: deal?.id,
            assignedUserId: deal?.assignedUserId,
            teamIds: deal?.teamsIds,
          }}
          onCreate={async (payload) => {
            await createTasks(payload);

            queryClient.invalidateQueries({
              queryKey: ["lead-task", deal?.id],
            });

            setTaskDrawerOpen(false);
          }}
        />
        <ActivityDrawer
          isOpen={meetingDrawerOpen}
          onClose={() => setMeetingDrawerOpen(false)}
          mode="add"
          entityType="meeting"
          deal={{
            parentType: "Lead",
            parentId: deal?.id,
            assignedUserId: deal?.assignedUserId,
            teamsIds: deal?.teamsIds,
          }}
          onCreate={async (payload) => {

            await createMeeting({
              ...payload,
              parentId: deal?.id,
              parentType: "Lead",
            });

            queryClient.invalidateQueries({
              queryKey: ["lead-meeting", deal?.id],
            });

            toast.success("Meeting created");

            setMeetingDrawerOpen(false);
          }}
        />
      </div>
    </>
  );
};

export default React.memo(DealDrawer);


