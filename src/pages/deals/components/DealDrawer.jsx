import React, { useEffect, useState } from "react";
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
import { useQueryClient } from "@tanstack/react-query";
import { canEditRecord } from "utils/permission";
import ActivityDrawer from "components/ActivityDrawer";
import { createTasks } from "services/tasks.service";
import { useNavigate } from "react-router-dom";
import { useLeadMeeting } from "hooks/useMeeting";
import { createLeadMeeting, createMeeting } from "services/meeting.service";
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
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    phoneNumber: "+91",
    emailAddress: "",
    whatsapp: "",
    addressCity: "",
    cProjectName: "",
    cNextContact: "",
    cPreference: "",
    assignedUserId: "",
    teamId: "",
    status: "",
    source: "",
    description: "",
    cSiteVisitAt: "",
    industry: "",
  });
  const queryClient = useQueryClient();
  const { data: usersData } = useUsers();
  const { data: teamData } = useTeams();
  const { data: streamData } = useLeadStream(deal?.id, isOpen);
  const { data: taskData } = useLeadTask(deal?.id, isOpen);
  const { data: meetData } = useLeadMeeting(deal?.id, isOpen);

  const meeting = meetData?.list || [];
  const task = taskData?.list || [];
  const users = usersData?.list || [];
  const team = teamData?.list || [];
  const streams = streamData?.list || [];
  useEffect(() => {
    if (mode === "add") {
      setFormData({
        firstName: "",
        lastName: "",
        phoneNumber: "+91",
        emailAddress: "",
        whatsapp: "",
        addressCity: "",
        cProjectName: "",
        cNextContact: "",
        cPreference: "",
        assignedUserId: "",
        teamId: "",
        status: "New",
        source: "",
        description: "",
        cSiteVisitAt: "",
        industry: "",
      });
      setIsEditing(true); // form open
    } else if (deal && mode === "view") {
      setFormData(deal);
      setIsEditing(false);
    }
  }, [deal, mode]);

  const [massFields, setMassFields] = useState({
    assignedUserId: false,
    status: false,
    source: false,
    teamId: false,
    cNextContact: false,
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

    const safeDate = date.replace(" ", "T"); // 👈 key fix
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

    const safe = value.replace(" ", "T"); // EspoCRM fix
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
      cNextContact: toEspoDateTime(formData.cNextContact),
      cSiteVisitAt: toEspoDateTime(formData.cSiteVisitAt),
      teamsIds: formData.teamId ? [formData.teamId] : formData.teamsIds,
    };
    try {
      if (mode === "add") {
        await onCreate(payload);
        toast.success("Task is  created");
      } else {
        if (!canEditRecord("Lead", deal)) {
          toast.error("You do not have permission to edit this lead");
          return;
        }

        await onUpdate(deal.id, payload);
        toast.success("Task is not Updated");
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

    if (massFields.cNextContact)
      payload.cNextContact = toEspoDateTime(formData.cNextContact);

    if (massFields.status) payload.status = formData.status;

    if (massFields.source) payload.source = formData.source;

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
        // setmockStream((prev) =>
        //   prev.map((a) =>
        //     a.id === editingActivityId ? { ...a, post: activityText } : a,
        //   ),
        // );

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
  const teamOptions = team?.map((t) => ({
    value: t.id,
    label: t.name,
  }));
  // const sourceOptions = source
  //   .filter((item) => item !== "")
  //   .map((item) => ({
  //     value: item,
  //     label: item,
  //   }));
  const sourceOptions = [
    { value: "Call", label: "Call" },
    { value: "Email", label: "Email" },
    { value: "Existing Customer", label: "Existing Customer" },
    { value: "Partner", label: "Partner" },
    { value: "Public Relations", label: "Public Relations" },
    { value: "Web Site", label: "Web Site" },
    { value: "Campaign", label: "Campaign" },
    { value: "Other", label: "Other" },
    { value: "ACL", label: "ACL" },
  ];
  const statusOptions = [
    { value: "Broker", label: "Broker" },
    { value: "Call Later", label: "Call Later" },
    { value: "Call Not Connecting", label: "Call Not Connecting" },
    { value: "Call Not Picked", label: "Call Not Picked" },
    { value: "Converted", label: "Converted" },
    { value: "Dead", label: "Dead" },
    { value: "Deal Closed", label: "Deal Closed" },
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
    { value: "Proposal Shared", label: "Proposal Shared" },
  ];
  // const statusOptions = status
  //   .filter((item) => item !== "")
  //   .map((item) => ({
  //     value: item,
  //     label: item,
  //   }));
  // const industryOptions = industry
  //   .filter((item) => item !== "")
  //   .map((item) => ({
  //     value: item,
  //     label: item,
  //   }));

  const handleSelectChange = (name, value) => {
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };
  const toEspoDateTime = (value) => {
    if (!value) return null;

    // already Espo format → do nothing
    if (value.includes(" ")) {
      return value;
    }

    // from datetime-local input
    return value.replace("T", " ") + ":00";
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
    canEditRecord("Lead", deal);
  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div className="fixed inset-0 bg-black/50 z-40" onClick={onClose} />
      )}
      {/* Drawer */}
      <div
        className={`
          fixed top-0 right-0 h-full w-full max-w-2xl bg-background border-l border-border z-50
          transform transition-transform duration-300 ease-out
          ${isOpen ? "translate-x-0" : "translate-x-full"}
        `}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-border">
            <div className="flex items-center space-x-3">
              <h2 className="text-xl font-semibold text-foreground">
                {mode === "mass-update"
                  ? `Mass Update (${selectedIds.length}) Leads`
                  : mode === "add"
                    ? "Add Lead"
                    : isEditing
                      ? "Edit Lead"
                      : deal?.name}
              </h2>
              <span
                className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStageColor(
                  deal?.status,
                )}`}
              >
                {mode !== "view" && deal && <span>{deal.status}</span>}
              </span>
            </div>
            <div className="flex items-center space-x-2">
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
                      <Input
                        label="Project Name"
                        value={formData.cProjectName || ""}
                        onChange={(e) =>
                          handleChange("cProjectName", e.target.value)
                        }
                      />
                      <Input
                        type="datetime-local"
                        label="Next Contact"
                        value={formData.cNextContact || ""}
                        onChange={(e) =>
                          handleChange("cNextContact", e.target.value)
                        }
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-card border border-border rounded-lg p-4 space-y-4">
                      <Input
                        label="Preference"
                        value={formData.cPreference || ""}
                        onChange={(e) =>
                          handleChange("cPreference", e.target.value)
                        }
                      />
                    </div>
                    <div className="bg-card border border-border rounded-lg p-4 space-y-4">
                      <Input
                        type="datetime-local"
                        label="Site Visit At"
                        value={formData.cSiteVisitAt || ""}
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
                      {mode === "add" ? (
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
                      )}
                      <Select
                        label="Industry"
                        value={formData.industry || ""}
                        options={IndustryOptions}
                        onChange={(value) => handleChange("industry", value)}
                      />
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
              <form className="space-y-6 p-5" onSubmit={handleBulkUpdate}>
                <h3 className="text-lg font-semibold text-foreground">
                  Mass Update Leads
                </h3>

                <p className="text-sm text-muted-foreground">
                  Updating {selectedIds.length} selected Leads
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Assigned User */}
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={massFields.assignedUserId}
                      onChange={() => toggleMassField("assignedUserId")}
                    />
                    <Select
                      label="Assigned User"
                      value={formData.assignedUserId}
                      options={userOptions}
                      disabled={!massFields.assignedUserId}
                      onChange={(v) => handleChange("assignedUserId", v)}
                      searchable
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Team */}
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={massFields.teamId}
                      onChange={() => toggleMassField("teamId")}
                    />
                    <Select
                      label="Team"
                      value={formData.teamId}
                      options={teamOptions}
                      disabled={!massFields.teamId}
                      onChange={(v) => handleChange("teamId", v)}
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-4">
                  <Button variant="ghost" onClick={onClose}>
                    Cancel
                  </Button>
                  <Button type="submit">
                    Update {selectedIds.length} Accounts
                  </Button>
                </div>
              </form>
            )}

            {!showForm && !isMassUpdate && deal && (
              <>
                {/* Tabs */}
                <div className="flex items-center space-x-1 p-4 border-b border-border">
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
                    <div className="space-y-6">
                      {/* ================= Overview ================= */}
                      <div className="border border-border rounded-xl p-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          {/* Name */}
                          <div>
                            <p className="text-sm text-muted-foreground">
                              Name
                            </p>
                            <p className="text-foreground font-medium">
                              {deal?.name || "None"}
                            </p>
                          </div>

                          {/* Phone */}
                          <div>
                            <p className="text-sm text-muted-foreground">
                              Phone
                            </p>
                            {deal?.phoneNumber ? (
                              <a
                                href={`tel:${deal.phoneNumber}`}
                                className="text-primary hover:underline"
                              >
                                {deal.phoneNumber}
                              </a>
                            ) : (
                              <p className="text-foreground">None</p>
                            )}
                          </div>

                          {/* Email */}
                          <div>
                            <p className="text-sm text-muted-foreground">
                              Email
                            </p>
                            {deal?.emailAddress ? (
                              <a
                                href={`mailto:${deal.emailAddress}`}
                                className="text-primary hover:underline break-all"
                              >
                                {deal.emailAddress}
                              </a>
                            ) : (
                              <p className="text-foreground">None</p>
                            )}
                          </div>

                          {/* WhatsApp */}
                          <div>
                            <p className="text-sm text-muted-foreground">
                              Whatsapp
                            </p>
                            {deal?.phoneNumber ? (
                              <a
                                href={`https://wa.me/${deal.phoneNumber.replace(/\D/g, "")}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-primary hover:underline"
                              >
                                wa.me/{deal.phoneNumber.replace(/\D/g, "")}
                              </a>
                            ) : (
                              <p className="text-foreground">None</p>
                            )}
                          </div>

                          {/* City */}
                          <div>
                            <p className="text-sm text-muted-foreground">
                              City
                            </p>
                            <p className="text-foreground font-medium">
                              {deal?.addressCity || "None"}
                            </p>
                          </div>

                          {/* Next Contact */}
                          <div>
                            <p className="text-sm text-muted-foreground">
                              Next Contact
                            </p>
                            <p className="text-foreground font-medium">
                              {deal?.cNextContactAt
                                ? formatDateTime(deal.cNextContactAt)
                                : "None"}
                            </p>
                          </div>

                          {/* Project Name */}
                          <div>
                            <p className="text-sm text-muted-foreground">
                              Project Name
                            </p>
                            <p className="text-foreground font-medium">
                              {deal?.cProject || "None"}
                            </p>
                          </div>

                          {/* Preference */}
                          <div>
                            <p className="text-sm text-muted-foreground">
                              Preference
                            </p>
                            <p className="text-foreground font-medium">
                              {deal?.cPreference || "None"}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* ================= Details ================= */}
                      <div className="border border-border rounded-xl p-6">
                        <h3 className="text-base font-semibold text-foreground mb-6">
                          Details
                        </h3>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                          {/* Status */}
                          <div>
                            <p className="text-sm text-muted-foreground">
                              Status
                            </p>
                            <span className="inline-flex px-3 py-1 rounded-full text-xs font-medium bg-success/10 text-success">
                              {deal?.status || "None"}
                            </span>
                          </div>

                          {/* Source */}
                          <div>
                            <p className="text-sm text-muted-foreground">
                              Source
                            </p>
                            <p className="text-foreground font-medium">
                              {deal?.source || "None"}
                            </p>
                          </div>
                          {/* Source */}
                          <div>
                            <p className="text-sm text-muted-foreground">
                              Site Visit
                            </p>
                            <p className="text-foreground font-medium">
                              {deal?.cSiteVisitAt
                                ? formatDateTime(deal.cSiteVisitAt)
                                : "None"}
                            </p>
                          </div>

                          {/* Description */}
                          <div className="md:col-span-2">
                            <p className="text-sm text-muted-foreground">
                              Description
                            </p>
                            <p className="text-foreground leading-relaxed mt-1">
                              {deal?.description || "None"}
                            </p>
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
                          onClick={createActivity}
                        >
                          <Icon name="Plus" size={16} className="mr-1" />
                          Add Stream
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
                    <div className="space-y-6">
                      {/* ================= Assigned User ================= */}
                      <div className="border border-border rounded-xl p-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          {/* Assigned User */}
                          <div>
                            <p className="text-sm text-muted-foreground">
                              Assigned User
                            </p>
                            <p className="text-foreground font-medium">
                              {leadData?.assignedUserName || "—"}
                            </p>
                          </div>

                          {/* Followers */}
                          <div>
                            <p className="text-sm text-muted-foreground">
                              Followers
                            </p>
                            <p className="text-foreground font-medium">
                              {leadsDetails?.followersNames ? (
                                <div className="flex flex-wrap gap-2">
                                  {Object.entries(
                                    leadsDetails.followersNames,
                                  ).map(([id, name]) => (
                                    <span
                                      key={id}
                                      className="text-sm text-primary font-medium"
                                    >
                                      {name}
                                    </span>
                                  ))}
                                </div>
                              ) : (
                                <span>—</span>
                              )}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* ================= Audit Information ================= */}
                      <div className="border border-border rounded-xl p-6">
                        <h3 className="text-base font-semibold text-foreground mb-6">
                          Audit Information
                        </h3>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          {/* Created */}
                          <div>
                            <p className="text-sm text-muted-foreground">
                              Created
                            </p>
                            <p className="text-foreground font-medium">
                              {deal?.createdAt
                                ? `${formatDateTime(deal.createdAt)} by ${deal?.createdByName || "—"}`
                                : "—"}
                            </p>
                          </div>

                          {/* Modified */}
                          <div>
                            <p className="text-sm text-muted-foreground">
                              Last Modified
                            </p>
                            <p className="text-foreground font-medium">
                              {deal?.modifiedAt
                                ? `${formatDateTime(deal.modifiedAt)} by ${deal?.modifiedByName || "—"}`
                                : "—"}
                            </p>
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
                          onClick={() => setTaskDrawerOpen(true)}
                        >
                          <Icon name="Plus" size={16} className="mr-1" />
                          Add Task
                        </Button>
                      </div>
                      <div className="space-y-4">
                        {task?.map((activity) => (
                          <div
                            key={activity.id}
                            className="flex space-x-3 p-4 bg-muted/30 rounded-lg cursor-pointer hover:bg-muted/50 transition"
                            onClick={() =>
                              navigate("/tasks", {
                                state: {
                                  taskId: activity.id,
                                },
                              })
                            }
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
                                    {activity.name}
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
                        >
                          <Icon name="Plus" size={16} className="mr-1" />
                          Add Meeting
                        </Button>
                      </div>
                      <div className="space-y-4">
                        {meeting?.map((meet) => (
                          <div
                            key={meet.id}
                            onClick={() =>
                              navigate("/meeting", {
                                state: { meetingId: meet.id },
                              })
                            }
                            className="flex space-x-3 p-4 bg-muted/30 rounded-lg cursor-pointer hover:bg-muted/50 transition"
                          >
                            {" "}
                            <Avatar name={meet.name} size="36" round />{" "}
                            <div className="flex-1">
                              {" "}
                              <div className="flex items-center justify-between">
                                {" "}
                                <h4 className="font-medium text-foreground">
                                  {" "}
                                  {meet.name}{" "}
                                </h4>{" "}
                                <span className="text-xs text-muted-foreground">
                                  {" "}
                                  {formatDate(meet.dateStart)}{" "}
                                </span>{" "}
                              </div>{" "}
                              <p className="text-sm text-muted-foreground mt-1">
                                {" "}
                                {meet.status}{" "}
                              </p>{" "}
                            </div>{" "}
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
