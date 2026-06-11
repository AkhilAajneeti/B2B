import React, { useEffect, useState } from "react";
import Icon from "../../../components/AppIcon";
import Button from "../../../components/ui/Button";
import Select from "../../../components/ui/Select";
import Input from "components/ui/Input";
import toast from "react-hot-toast";
import ReactSelect from "react-select";
import { fetchUser } from "services/user.service";
import { fetchTeam } from "services/team.service";
import { fetchContacts } from "services/contact.service";
import makeAnimated from "react-select/animated";
import { toEspoDateTime as toEspoDateTimeUtc } from "../../pipeline/utils/dateHelpers";
import { isAdminOrManager } from "../../../utils/permission.js";
const DealDrawer = ({
  deal,
  selectedIds = [],
  isOpen,
  onClose,
  mode,
  onCreate,
  onUpdate,
  onBulkUpdate,
  onDelete,
}) => {
  const [activeTab, setActiveTab] = useState("overview");
  const [isEditing, setIsEditing] = useState(false);
  const [users, setUsers] = useState([]);
  const [team, setTeam] = useState([]);
  // Only admins/managers can edit project metadata. Reps still need to be
  // able to touch the Collaborator field + its Configuration block (their
  // workflow involves adjusting the lead-split when collaborators join or
  // leave), but everything else stays locked.
  const isAdmin = isAdminOrManager();


  const [contact, setContact] = useState([]);
  const [mockStream, setmockStream] = useState([]);
  const [showActivityForm, setActivityForm] = useState(false);
  const [activityText, setActivityText] = useState("");
  const [postingActivity, setPostingActivity] = useState(false);
  const [formData, setFormData] = useState({
    projectNomen: "",
    clientNomen: "",
    whatsappTemplate: "",
    name: "",
    assignedUserId: "",
    teamId: "",
    address: "",
    description: "",
    parentName: "",
    parentType: "",
    collaboratorsIds: "",
    enableConfiguration: false,
    // Structured form of the backend `configuration` string. Each row is
    // {id, name, count}; serialized back to "id:name:count\n" on save.
    configurationItems: [],
  });
  useEffect(() => {
    if (mode === "add") {
      setFormData({
        projectNomen: "",
        clientNomen: "",
        whatsappTemplate: "",
        name: "",
        assignedUserId: "",
        teamId: "",
        address: "",
        description: "",
        parentName: "", // Account | Lead | Contact (TYPE)
        parentType: "",
        collaboratorsIds: "",
        enableConfiguration: false,
        configurationItems: [],
      });
    } else if (deal) {
      setFormData({
        // Falls back to "" so the <Input>s stay controlled even when the
        // backend returns null/undefined — otherwise React warns about
        // switching from uncontrolled to controlled when the user starts typing.
        projectNomen: deal.projectNomen || "",
        clientNomen: deal.clientNomen || "",
        whatsappTemplate: deal.whatsappTemplate || "",
        name: deal.name || "",
        address: deal.address || "",
        assignedUserId: deal.assignedUserId || "",
        // Project records store team as `teamsIds: [...]` (plural array),
        // not the singular `teamId` field used by the form's <Select>. Pull
        // the first id out so editing pre-selects the saved team. The save
        // payload below wraps it back into an array on submit.
        teamId: deal.teamId || deal.teamsIds?.[0] || "",
        collaboratorsIds: deal.collaboratorsIds || "",
        description: deal.description || "",
        parentName: deal.parentType || "",
        parentType: deal.parentId || "",
        enableConfiguration: deal.enableConfiguration || false,
        configurationItems: parseConfiguration(deal.configuration),
      });
      // Always land on the overview tab when (re-)opening an existing
      // project — if the parent reuses the same DealDrawer instance, a
      // stale `isEditing: true` from a previous edit session would
      // otherwise pop the form open instead of the overview.
      setIsEditing(false);
    }
  }, [deal, mode]);
  // mass update
  const isMassUpdate = mode === "mass-update";
  const animatedComponents = makeAnimated();
  const [massFields, setMassFields] = useState({
    status: false,
    priority: false,
    assignedUserId: false,
    dueDate: false,
  });
  const toggleMassField = (field) => {
    setMassFields((prev) => ({ ...prev, [field]: !prev[field] }));
  };

  // if (!isOpen) return null;
  const handleFieldListChange = (selectedOptions) => {
    const selected = selectedOptions || [];

    setFormData((prev) => ({
      ...prev,
      fieldList: selected,
    }));
  };
  const formatDate = (date) => {
    if (!date) return "—";

    // Espo format: YYYY-MM-DD HH:mm:ss
    const parsed = new Date(date.replace(" ", "T") + "Z");

    if (isNaN(parsed.getTime())) return "—";

    return parsed.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const tabs = [
    { id: "overview", label: "Overview", icon: "Eye" },
    { id: "Teams", label: "Teams / Collaborators", icon: "Users" },
  ];

  const handleChange = (key, value) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  // Keep configurationItems in sync with the currently selected collaborators:
  //  - New collaborator selected -> add a row with count = 1
  //  - Collaborator removed      -> drop their row
  //  - Existing collaborator     -> preserve their current count
  // Names are sourced from the loaded users list so removing & re-adding a
  // collaborator picks up their current display name even if it changed.
  useEffect(() => {
    const ids = Array.isArray(formData.collaboratorsIds)
      ? formData.collaboratorsIds
      : [];
    setFormData((prev) => {
      const prevItems = prev.configurationItems || [];
      const prevById = new Map(prevItems.map((i) => [i.id, i]));
      const nextItems = ids.map((id) => {
        if (prevById.has(id)) return prevById.get(id);
        const user = users?.find((u) => u.id === id);
        const name = user?.name || user?.userName || id;
        return { id, name, count: 1 };
      });
      const sameLength = nextItems.length === prevItems.length;
      const noChange =
        sameLength &&
        nextItems.every((n, i) => n === prevItems[i]);
      if (noChange) return prev;
      return { ...prev, configurationItems: nextItems };
    });
  }, [formData.collaboratorsIds, users]);

  const updateConfigurationCount = (id, raw) => {
    // Clamp to >= 1, fall back to 1 for invalid input (empty / negative / NaN).
    const parsed = parseInt(raw, 10);
    const count = Number.isFinite(parsed) && parsed >= 1 ? parsed : 1;
    setFormData((prev) => ({
      ...prev,
      configurationItems: (prev.configurationItems || []).map((item) =>
        item.id === id ? { ...item, count } : item,
      ),
    }));
  };

  // Configuration is stored on the backend as a newline-separated string in
  // the form "id:name:count\n" per row. We work with a structured array
  // ({id, name, count}) locally so the row UI is straightforward, then
  // serialize back to the string shape on save.
  const parseConfiguration = (raw) => {
    if (!raw || typeof raw !== "string") return [];
    return raw
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        // Names can themselves contain a colon ("Dr: Foo"), so split on the
        // FIRST and LAST colon only: id = head, count = tail, name = middle.
        const firstColon = line.indexOf(":");
        const lastColon = line.lastIndexOf(":");
        if (firstColon === -1 || lastColon === firstColon) return null;
        const id = line.slice(0, firstColon);
        const name = line.slice(firstColon + 1, lastColon);
        const count = parseInt(line.slice(lastColon + 1), 10);
        if (!id || !name || Number.isNaN(count)) return null;
        return { id, name, count };
      })
      .filter(Boolean);
  };

  const serializeConfiguration = (items = []) =>
    items
      .filter((i) => i?.id && i?.name)
      .map((i) => `${i.id}:${i.name}:${i.count || 1}`)
      .join("\n") + (items.length ? "\n" : "");

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.name?.trim()) {
      toast.error("Project name is required");
      return;
    }

    const payload = {
      // ✅ Project REQUIRED
      name: formData.name.trim(),
      assignedUserId: formData.assignedUserId || null,
      // ✅ Project expects ARRAY
      teamsIds: formData.teamId ? [formData.teamId] : [],
      address: formData.address || "",
      description: formData.description || "",

      // ✅ CORRECT parent mapping
      parentType: formData.parentName || null, // Account
      parentId: formData.parentType || null, // record ID
      collaboratorsIds: formData.collaboratorsIds || null, // record ID
      enableConfiguration: !!formData.enableConfiguration,
      configuration: serializeConfiguration(formData.configurationItems),
      attachmentsIds: [],
      reminders: [],
    };


    try {
      if (mode === "add") {
        // ✅ CREATE
        await onCreate(payload);
      } else {
        // ✅ UPDATE (id MUST be passed)
        await onUpdate(deal.id, payload);
      }

      // Drop back to overview so the next time the user opens this drawer
      // it starts in view state, not the previous edit-form state.
      setIsEditing(false);
      onClose();
    } catch (err) {
      console.error("Project creation failed", err);
      toast.error("Project is not created");
    }
  };
  const handleBulkUpdate = async (e) => {
    e.preventDefault();

    const payload = {};

    if (massFields.status) payload.status = formData.status;
    if (massFields.priority) payload.priority = formData.priority;
    if (massFields.assignedUserId)
      payload.assignedUserId = formData.assignedUserId;
    if (massFields.dueDate) payload.dateEnd = toEspoDateTime(formData.dueDate);

    if (!Object.keys(payload).length) {
      toast.error("Select at least one field to update");
      return;
    }
    onBulkUpdate(selectedIds, payload);
    onClose();
  };

  useEffect(() => {
    const loadData = async () => {
      try {
        const [usersRes, teamRes, contactRes] =
          await Promise.all([
            fetchUser(),
            fetchTeam(),


            fetchContacts(),
          ]);

        setUsers(usersRes.list || []);
        setTeam(teamRes.list || []);

        setContact(contactRes.list || []);
      } catch (err) {
        console.error("Failed to load data", err);
      }
    };

    loadData();
  }, []);

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

  const showForm = mode === "add" || isEditing;
  const handleSelectChange = (name, value) => {
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };
  const toEspoDateTime = (value) => toEspoDateTimeUtc(value);

  useEffect(() => {
    if (!isOpen) {
      setmockStream([]);
    }
  }, [isOpen]);

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
                {isMassUpdate
                  ? "Mass Update Project"
                  : mode === "add"
                    ? "Add Project"
                    : isEditing
                      ? "Edit Project"
                      : deal?.name}
              </h2>
            </div>
            <div className="flex items-center space-x-2">
              {!isMassUpdate && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (isEditing && deal) {
                      // Rehydrate to the SAME well-formed shape the mount
                      // effect uses, not the raw backend object. Otherwise
                      // formData ends up missing fields (configurationItems,
                      // the singular `teamId` derived from `teamsIds[0]`,
                      // etc.) and downstream code reading those keys crashes
                      // — e.g. the sync effect's `prev.configurationItems`
                      // or the ReactSelect's collaborators filter.
                      setFormData({
                        name: deal.name || "",
                        address: deal.address || "",
                        assignedUserId: deal.assignedUserId || "",
                        teamId: deal.teamId || deal.teamsIds?.[0] || "",
                        collaboratorsIds: deal.collaboratorsIds || "",
                        description: deal.description || "",
                        parentName: deal.parentType || "",
                        parentType: deal.parentId || "",
                        enableConfiguration: deal.enableConfiguration || false,
                        configurationItems: parseConfiguration(
                          deal.configuration,
                        ),
                      });
                    }
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
            {showForm && (
              <div className="p-6">
                {/* Lead Form Here */}
                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* ================= Overview ================= */}
                  <div className="bg-card border border-border rounded-lg p-4 space-y-4">
                    {/* Name */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Client Nomen now binds to clientNomen (was wired to
                          projectNomen — typing in either field was saving to
                          the wrong key on the backend). */}
                      <Input
                        label="Client Nomen *"
                        value={formData.clientNomen || ""}
                        onChange={(e) => handleChange("clientNomen", e.target.value)}
                        disabled={!isAdmin}
                      />
                      <Input
                        label="Project Nomen *"
                        value={formData.projectNomen || ""}
                        onChange={(e) => handleChange("projectNomen", e.target.value)}
                        disabled={!isAdmin}
                      />
                      <Input
                        label="Name *"
                        value={formData.name || ""}
                        onChange={(e) => handleChange("name", e.target.value)}
                        disabled={!isAdmin}
                      />
                      <Input
                        label="Address"
                        value={formData.address || ""}
                        onChange={(e) =>
                          handleChange("address", e.target.value)
                        }
                        disabled={!isAdmin}
                      />
                      <Select
                        label="Assigned User"
                        value={formData.assignedUserId || ""}
                        options={userOptions} // 👉 later API se users
                        onChange={(value) =>
                          handleSelectChange("assignedUserId", value)
                        }
                        searchable
                        disabled={!isAdmin}
                      />
                      <Select
                        label="Teams"
                        value={formData.teamId || ""}
                        options={teamOptions} // 👉 later API se teams
                        onChange={(value) =>
                          handleSelectChange("teamId", value)
                        }
                        searchable
                        disabled={!isAdmin}
                      />
                    </div>
                  </div>

                  {/* ================= Assigned User ================= */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-card border border-border rounded-lg p-4 space-y-4 col-span-2">
                      <h2>Collaborator</h2>
                      <ReactSelect
                        isMulti
                        closeMenuOnSelect={false}
                        components={animatedComponents}
                        options={userOptions}
                        value={userOptions.filter((option) =>
                          formData.collaboratorsIds?.includes(option.value),
                        )}
                        onChange={(value) =>
                          handleSelectChange(
                            "collaboratorsIds",
                            value.map((s) => s.value),
                          )
                        }
                        placeholder="Select Collaborators."
                        classNamePrefix="react-select"
                        styles={{
                          control: (base, state) => ({
                            ...base,
                            minHeight: "42px",
                            borderColor: state.isFocused
                              ? "#a3d9a5"
                              : "#a3d9a5",
                            boxShadow: "none",
                            "&:hover": { borderColor: "#6366f1" },
                          }),
                          multiValue: (base) => ({
                            ...base,
                            backgroundColor: "#EEF2FF",
                          }),
                          multiValueLabel: (base) => ({
                            ...base,
                            color: "#000",
                            fontWeight: 500,
                          }),
                          multiValueRemove: (base) => ({
                            ...base,
                            color: "#e8a8a0",
                            ":hover": {
                              backgroundColor: "#e8a8a0",
                              color: "#fff",
                            },
                          }),
                        }}
                      />

                      {/* Enable Configuration toggle — gates the per-collaborator
                          lead-count list below. When off, the list still renders
                          but is dimmed and non-interactive so the user can see
                          what's there without editing. */}
                      <label className="flex items-center gap-2 text-sm font-medium text-foreground cursor-pointer select-none">
                        <input
                          type="checkbox"
                          className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
                          checked={!!formData.enableConfiguration}
                          onChange={(e) =>
                            handleChange("enableConfiguration", e.target.checked)
                          }
                        />
                        Enable Configuration
                      </label>

                      {/* Configuration rows: one per selected collaborator with an
                          editable lead-count number input. Min 1. */}
                      <div
                        className={`space-y-2 transition-opacity ${formData.enableConfiguration
                          ? "opacity-100"
                          : "opacity-50 pointer-events-none"
                          }`}
                      >
                        <p className="text-sm text-muted-foreground">
                          Configuration
                        </p>
                        {(formData.configurationItems || []).length === 0 ? (
                          <p className="text-xs text-muted-foreground italic">
                            Add collaborators above to configure lead counts.
                          </p>
                        ) : (
                          (formData.configurationItems || []).map((item) => (
                            <div
                              key={item.id}
                              className="flex items-center justify-between gap-3 px-3 py-2 rounded-md bg-muted/30 border border-border"
                            >
                              <span className="text-sm text-foreground truncate">
                                {item.name}
                              </span>
                              <input
                                type="number"
                                min={1}
                                value={item.count}
                                onChange={(e) =>
                                  updateConfigurationCount(
                                    item.id,
                                    e.target.value,
                                  )
                                }
                                disabled={!formData.enableConfiguration}
                                className="w-20 px-2 py-1 text-sm text-right border border-border rounded bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary disabled:cursor-not-allowed"
                              />
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                    <div className="col-span-2">
                      <label className="block text-sm font-medium text-foreground mb-1">
                        Description
                      </label>
                      <textarea
                        className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-60 disabled:cursor-not-allowed"
                        rows={4}
                        value={formData.description || ""}
                        placeholder="Description"
                        onChange={(e) =>
                          handleChange("description", e.target.value)
                        }
                        disabled={!isAdmin}
                      />
                    </div>

                    {/* WhatsApp Template — free-text message body used to
                        seed wa.me URLs / outbound chats. Multi-line so reps
                        can paste a full template with greeting, name
                        placeholder, signature, etc. */}
                    <div className="col-span-2">
                      <label className="block text-sm font-medium text-foreground mb-1">
                        WhatsApp Template
                      </label>
                      <textarea
                        className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-60 disabled:cursor-not-allowed"
                        rows={4}
                        value={formData.whatsappTemplate || ""}
                        placeholder="Hello {name}, ..."
                        onChange={(e) =>
                          handleChange("whatsappTemplate", e.target.value)
                        }
                        disabled={!isAdmin}
                      />
                    </div>
                  </div>

                  {/* ================= Actions ================= */}
                  <div className="flex justify-end gap-3">
                    <Button type="submit">Save Project</Button>
                  </div>
                </form>
              </div>
            )}
            {mode !== "add" && deal && !isEditing && (
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
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            {/* Client Nomen */}
                            <div>
                              <p className="text-sm text-muted-foreground">
                                Client Nomen
                              </p>
                              <p className="text-foreground font-medium mt-1">
                                {deal?.clientNomen || "—"}
                              </p>
                            </div>

                            {/* Project Nomen */}
                            <div>
                              <p className="text-sm text-muted-foreground">
                                Project Nomen
                              </p>
                              <p className="text-foreground font-medium mt-1">
                                {deal?.projectNomen || "—"}
                              </p>
                            </div>
                          </div>
                          {/* Name */}
                          {isAdmin && (
                            <div>
                              <p className="text-sm text-muted-foreground">
                                Name
                              </p>
                              <p className="text-foreground font-medium">
                                {deal?.name || "—"}
                              </p>
                            </div>
                          )}

                          {/* Phone */}
                          <div>
                            <p className="text-sm text-muted-foreground">
                              Created By
                            </p>
                            {deal?.createdByName ? (
                              <p className="text-primary hover:underline">
                                {deal.createdByName}
                              </p>
                            ) : (
                              <p className="text-foreground">—</p>
                            )}
                          </div>

                          {/* Email */}
                          <div>
                            <p className="text-sm text-muted-foreground">
                              Assigned User
                            </p>
                            {deal?.assignedUserName ? (
                              <p className="text-primary hover:underline break-all">
                                {deal.assignedUserName}
                              </p>
                            ) : (
                              <p className="text-foreground">—</p>
                            )}
                          </div>

                          {/* WhatsApp */}
                          <div>
                            <p className="text-sm text-muted-foreground">
                              Last Assigned User
                            </p>
                            {deal?.lastAssignedUser ? (
                              <p className="text-primary hover:underline break-all">
                                {deal.lastAssignedUser}
                              </p>
                            ) : (
                              <p className="text-foreground">—</p>
                            )}
                          </div>

                          {/* Next Contact */}
                          <div>
                            <p className="text-sm text-muted-foreground">
                              Created At
                            </p>
                            <p className="text-foreground font-medium">
                              {deal?.createdAt
                                ? formatDate(deal.createdAt)
                                : "—"}
                            </p>
                          </div>

                          {/* Next Contact */}
                          <div>
                            <p className="text-sm text-muted-foreground">
                              Modified At
                            </p>
                            <p className="text-foreground font-medium">
                              {deal?.modifiedAt
                                ? formatDate(deal.modifiedAt)
                                : "—"}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* ================= Configuration ================= */}
                      {/* Read-only view of the round-robin lead-count
                          configuration. Parses the backend `configuration`
                          string on the fly so we don't depend on form state
                          here. When `enableConfiguration` is false, the rows
                          render dimmed to signal the values aren't active. */}
                      <div className="border border-border rounded-xl p-6">
                        <div className="flex items-center justify-between mb-6">
                          <h3 className="text-base font-semibold text-foreground">
                            Configuration
                          </h3>
                          <span
                            className={`px-3 py-1 text-xs font-medium rounded-full ${deal?.enableConfiguration
                              ? "bg-success/10 text-success"
                              : "bg-muted text-muted-foreground"
                              }`}
                          >
                            {deal?.enableConfiguration ? "Enabled" : "Disabled"}
                          </span>
                        </div>

                        {(() => {
                          const items = parseConfiguration(deal?.configuration);
                          if (items.length === 0) {
                            return (
                              <p className="text-sm text-muted-foreground italic">
                                No configuration set.
                              </p>
                            );
                          }
                          return (
                            <div
                              className={`space-y-2 ${deal?.enableConfiguration
                                ? "opacity-100"
                                : "opacity-60"
                                }`}
                            >
                              {items.map((item) => (
                                <div
                                  key={item.id}
                                  className="flex items-center justify-between gap-3 px-3 py-2 rounded-md bg-muted/30 border border-border"
                                >
                                  <span className="text-sm text-foreground truncate">
                                    {item.name}
                                  </span>
                                  <span className="text-sm font-medium text-foreground tabular-nums">
                                    {item.count}
                                  </span>
                                </div>
                              ))}
                            </div>
                          );
                        })()}
                      </div>

                      {/* ================= Details ================= */}
                      <div className="border border-border rounded-xl p-6">
                        {/* WhatsApp Template — preserve newlines and spacing
                              with whitespace-pre-wrap so templates with line
                              breaks render the way the rep wrote them. */}
                        <div className="md:col-span-2">
                          <p className="text-sm text-muted-foreground">
                            WhatsApp Template
                          </p>
                          <p className="text-foreground leading-relaxed mt-1 whitespace-pre-wrap">
                            {deal?.whatsappTemplate || "—"}
                          </p>
                        </div>

                      </div>
                    </div>
                  )}

                  {activeTab === "Teams" && (
                    <div className="space-y-6">
                      {/* ================= Assigned User ================= */}
                      <div className="border border-border rounded-xl p-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          {/* Assigned User */}
                          <div>
                            <p className="text-md text-muted-foreground">
                              Teams
                            </p>
                            <div className="flex flex-wrap gap-2 mt-2">
                              {deal?.teamsNames &&
                                Object.values(deal.teamsNames).map(
                                  (team, i) => (
                                    <span
                                      key={i}
                                      className="px-3 py-1 text-xs bg-primary text-white rounded-full"
                                    >
                                      {team}
                                    </span>
                                  ),
                                )}
                            </div>
                          </div>

                          {/* Followers */}
                          <div>
                            <p className="text-md text-muted-foreground">
                              Followers
                            </p>
                            <p className="text-primary font-medium">
                              {deal?.collaboratorsNames &&
                                Object.values(deal?.collaboratorsNames).join(
                                  " , ",
                                )}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}

            {isMassUpdate && (
              <>
                <p className="text-sm text-muted-foreground text-center pt-4 fw-bold">
                  Updating {selectedIds.length} selected project
                </p>
                <form className="space-y-6 p-6" onSubmit={handleBulkUpdate}>
                  <div className="bg-card border border-border rounded-lg p-4 space-y-4">
                    <div className="grid grid-cols-2">
                      <div className="flex gap-3 items-center">
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
                        />
                      </div>
                    </div>
                  </div>
                  <div className="flex justify-end gap-3">
                    <Button variant="ghost" onClick={onClose}>
                      Cancel
                    </Button>
                    <Button type="submit">
                      Update {selectedIds.length} project
                    </Button>
                  </div>
                </form>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default DealDrawer;
