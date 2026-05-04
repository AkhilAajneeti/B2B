import React, { useEffect, useState } from "react";
import Icon from "../../../components/AppIcon";
import Image from "../../../components/AppImage";
import Button from "../../../components/ui/Button";
import Input from "../../../components/ui/Input";
import Avatar from "react-avatar";
import ReactSelect from "react-select";
import CreatableSelect from "react-select/creatable";
import TablePagination from "./TablePagination";
import {
  deleteUser,
  fetchUser,
  fetchUserById,
  updateUser,
} from "services/user.service";
import {
  createTeam,
  deleteTeam,
  fetchTeam,
  fetchTeamUser,
  updateTeam,
} from "services/team.service";
import { createUser, fetchRoles } from "services/setting.service";
import toast from "react-hot-toast";
const TeamsTab = () => {
  const [teamMembers, setTeamMembers] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [team, setTeam] = useState([]);
  const [role, setRole] = useState([]);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isEdit, setIsEdit] = useState(false);
  const [isShowDetails, setIsShowDetails] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [isTeamModalOpen, setIsTeamModalOpen] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [teamUsers, setTeamUsers] = useState([]);
  const [inviteData, setInviteData] = useState({
    id: null,
    name: "",
    positionList: [], // ✅ array
    description: "",
    rolesIds: [], // ✅ array
    rolesNames: {},
  });
  const handleEdit = (member) => {
    setIsEdit(true);
    setIsInviteModalOpen(true);

    setInviteData({
      id: member.id,
      name: member.name || "",
      positionList: member.positionList || [],
      description: member.description || "",
      rolesIds: member.rolesIds || [],
      rolesNames: member.rolesNames || {},
    });
  };

  const handleChange = (key, value) => {
    setInviteData((prev) => ({
      ...prev,
      [key]: value,
    }));
  };
  const handleSubmit = async (e) => {
    e.preventDefault();
    const payload = {
      name: inviteData.name || "",
      positionList: inviteData.positionList || [],
      description: inviteData.description || "",
      rolesIds: inviteData.rolesIds || [],
      rolesNames: inviteData.rolesNames || {},
    };

    try {
      setIsLoading(true);
      console.log("Submitting payload:", payload);
      // await createUser(payload);
      if (isEdit) {
        await updateTeam(inviteData.id, payload);
        toast.success("User updated successfully ✅");
      } else {
        await createTeam(payload);
        toast.success("User created successfully ✅");
      }

      toast.success("User created successfully ✅");

      const data = await fetchTeam();
      setTeamMembers(data.list || []);

      setIsInviteModalOpen(false);
    } catch (err) {
      toast.error("Failed to create team ❌");
    } finally {
      setIsLoading(false);
    }
  };
  const fetchuserById = async (member) => {
    try {
      setIsLoading(true);

      const data = await fetchUserById(member.id);

      console.log("Full User Data:", data); // 🔍 debug

      setSelectedUser(data); // ✅ SET CORRECT STATE
      setIsShowDetails(true); // ✅ open modal
    } catch (err) {
      console.error("failed to fetch data", err);
      toast.error("Failed to load user details");
    } finally {
      setIsLoading(false);
    }
  };

  const handleTeamClick = async (team) => {
    try {
      setIsLoading(true);
      setSelectedTeam(team);

      const data = await fetchTeamUser(team.id);
      setTeamUsers(data.list || []);

      setIsTeamModalOpen(true);
    } catch (err) {
      toast.error("Failed to load team users ❌");
    } finally {
      setIsLoading(false);
    }
  };
  useEffect(() => {
    const loadData = async () => {
      try {
        const data = await fetchTeam();
        setTeamMembers(data.list || []);
      } catch (err) {
        console.error("failed to fetch data", err);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, []);
  useEffect(() => {
    const loadData = async () => {
      try {
        const [roleRes] = await Promise.all([fetchRoles()]);
        setRole(roleRes.list || []);
      } catch (err) {
        console.error("Failed to load data", err);
      }
    };
    loadData();
  }, []);
  const roleOptions = role?.map((t) => ({
    value: t.id,
    label: t.name,
  }));
  const paginatedMembers = React.useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return teamMembers.slice(startIndex, endIndex);
  }, [teamMembers, currentPage, itemsPerPage]);

  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);

  const handleInviteChange = (field, value) => {
    setInviteData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleRemoveTeam = async () => {
    if (!selectedUserId) return;

    try {
      setIsLoading(true);

      await deleteTeam(selectedUserId);

      toast.success("User deleted successfully ✅");

      const data = await fetchTeam();
      setTeamMembers(data.list || []);

      setIsDeleteModalOpen(false);
      setSelectedUserId(null);
    } catch (err) {
      toast.error("Failed to delete user ❌");
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      Active: {
        bg: "bg-success/10",
        text: "text-success",
        icon: "CheckCircle",
      },
      Invited: { bg: "bg-warning/10", text: "text-warning", icon: "Clock" },
      Inactive: {
        bg: "bg-muted",
        text: "text-muted-foreground",
        icon: "XCircle",
      },
    };

    const config = statusConfig?.[status] || statusConfig?.Inactive;

    return (
      <span
        className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${config?.bg} ${config?.text}`}
      >
        <Icon name={config?.icon} size={12} className="mr-1" />
        {status}
      </span>
    );
  };

  const totalPages = Math.ceil(teamMembers?.length / itemsPerPage);
  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  const handleItemsPerPageChange = (newItemsPerPage) => {
    setItemsPerPage(newItemsPerPage);
    setCurrentPage(1);
  };
  useEffect(() => {
    setCurrentPage(1);
  }, [itemsPerPage]);
  const SkeletonRow = () => (
    <tr className="animate-pulse border-t border-border">
      {/* Company */}
      <td className="p-4">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-gray-300/60 rounded-lg"></div>
          <div>
            <div className="h-4 w-24 bg-gray-300/70 rounded mb-1"></div>
            <div className="h-3 w-32 bg-gray-300/50 rounded"></div>
          </div>
        </div>
      </td>

      {/* Industry */}
      <td className="p-4">
        <div className="h-4 w-20 bg-gray-300/60 rounded"></div>
      </td>

      {/* Type */}
      <td className="p-4">
        <div className="h-4 w-16 bg-gray-300/60 rounded"></div>
      </td>

      {/* Actions */}
      <td className="p-4">
        <div className="flex space-x-2">
          <div className="h-8 w-8 bg-gray-300/60 rounded"></div>
          <div className="h-8 w-8 bg-gray-300/60 rounded"></div>
        </div>
      </td>
    </tr>
  );
  return (
    <div>
      {/* Team Overview */}
      <div className="bg-card border border-border rounded-xl p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-4">
            <Icon name="Users" size={24} className="text-primary" />
            <div>
              <h3 className="text-lg font-semibold text-card-foreground">
                Team Management
              </h3>
              <p className="text-sm text-muted-foreground">
                Manage teams, roles, and permissions
              </p>
            </div>
          </div>
          <Button
            variant="default"
            onClick={() => setIsInviteModalOpen(true)}
            iconName="UserPlus"
            iconPosition="left"
          >
            Create Team
          </Button>
        </div>

        {/* Team Stats */}

        {/* Team Members Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="py-3 ps-5 text-left font-medium text-muted-foreground">
                  Name
                </th>

                <th className="py-3 px-3 text-center font-medium text-muted-foreground">
                  Created At
                </th>
                <th className="py-3 px-3 text-center font-medium text-muted-foreground">
                  Modified At
                </th>
                <th className="py-3 px-4 text-center font-medium text-muted-foreground">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 6 }).map((_, i) => <SkeletonRow key={i} />)
              ) : !paginatedMembers?.length ? (
                <tr>
                  <td colSpan="4">
                    <div className="flex items-center justify-center h-[200px] text-gray-400 text-sm">
                      No leads available
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedMembers?.map((member) => (
                  <tr
                    key={member?.id}
                    className="border-b border-border hover:bg-muted/50 transition-smooth"
                  >
                    <td className="py-4 px-4">
                      <div className="flex items-center space-x-4">
                        <div className="w-10 h-10 rounded-full overflow-hidden flex items-center justify-center">
                          {member?.avatar ? (
                            <Image
                              src={member.avatar}
                              alt={member?.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <Avatar
                              name={member?.name || member?.userName || "User"}
                              size="40"
                              round
                              textSizeRatio={2}
                              className="font-medium"
                            />
                          )}
                        </div>

                        <div>
                          <p
                            className="font-medium text-card-foreground"
                            onClick={() => handleTeamClick(member)}
                          >
                            {member?.name}
                          </p>
                        </div>
                      </div>
                    </td>

                    <td className="py-4 px-4 text-center">
                      <span className="text-sm text-muted-foreground">
                        {member?.createdAt}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-center">
                      <span className="text-sm text-muted-foreground">
                        {member?.modifiedAt}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-center">
                      <div className="flex items-center justify-center space-x-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(member)}
                          aria-label="Edit member"
                        >
                          <Icon name="Edit" size={16} />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setSelectedUserId(member?.id);
                            setIsDeleteModalOpen(true);
                          }}
                          aria-label="Remove member"
                        >
                          <Icon name="Trash2" size={16} />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Teams Pagination */}
        <TablePagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={teamMembers?.length}
          itemsPerPage={itemsPerPage}
          onPageChange={handlePageChange}
          onItemsPerPageChange={handleItemsPerPageChange}
        />
      </div>
      {/* Invite Modal */}

      {isInviteModalOpen && (
        <>
          {/* Overlay */}
          <div
            className="fixed inset-0 bg-black/50 z-50"
            onClick={() => setIsInviteModalOpen(false)}
          />

          {/* Modal Wrapper */}
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Modal Box */}
            <div
              className="relative bg-card border border-border rounded-xl w-full max-w-4xl
                      max-h-[90vh] overflow-hidden shadow-xl"
            >
              {/* Header (Sticky) */}
              <div className="sticky top-0 bg-card z-10 flex items-center justify-between p-6 border-b border-border">
                <h3 className="text-lg font-semibold text-card-foreground">
                  {isEdit ? "Update User" : "Create User"}
                </h3>

                <button
                  onClick={() => setIsInviteModalOpen(false)}
                  className="p-2 rounded-lg hover:bg-muted transition"
                >
                  <Icon name="X" size={20} />
                </button>
              </div>

              {/* Scrollable Body */}
              <div className="p-6 overflow-y-auto max-h-[calc(90vh-80px)]">
                <form onSubmit={handleSubmit}>
                  <div className="space-y-4">
                    {/* userName's  && Title*/}
                    <div className="bg-card border border-border rounded-lg p-4 space-y-4">
                      <div className="grid grid-cols-2 gap-2">
                        <Input
                          label="Name"
                          type="text"
                          value={inviteData?.name}
                          onChange={(e) =>
                            handleInviteChange("name", e?.target?.value)
                          }
                          placeholder="Team Name "
                          required
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div className="border-border rounded-lg space-y-2 bg-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary">
                          <h2>Position List</h2>
                          <CreatableSelect
                            isMulti
                            options={[]} // 👈 important
                            placeholder="Type & press enter"
                            noOptionsMessage={() => null} // 👈 hides "No options"
                            formatCreateLabel={(inputValue) =>
                              `Add "${inputValue}"`
                            }
                            value={inviteData.positionList.map((pos) => ({
                              value: pos,
                              label: pos,
                            }))}
                            onChange={(selectedOptions) => {
                              const values = selectedOptions
                                ? selectedOptions.map((opt) => opt.value)
                                : [];

                              setInviteData((prev) => ({
                                ...prev,
                                positionList: values,
                              }));
                            }}
                            styles={{
                              control: (base, state) => ({
                                ...base,
                                minHeight: "42px",
                                borderRadius: "0.5rem",
                                borderColor: state.isFocused
                                  ? "#a3d9a5"
                                  : "#a3d9a5",
                                boxShadow: state.isFocused
                                  ? "0 0 0 2px hsl(var(--primary) / 0.2)"
                                  : "none",
                                "&:hover": {
                                  borderColor: "#a3d9a5",
                                },
                              }),
                            }}
                          />
                        </div>
                        <div className="border-border rounded-lg space-y-2 bg-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary">
                          <h2>Collaborator</h2>
                          <ReactSelect
                            isMulti
                            options={roleOptions}
                            value={roleOptions.filter((option) =>
                              inviteData.rolesIds.includes(option.value),
                            )}
                            onChange={(selectedOptions) => {
                              const ids = selectedOptions.map(
                                (opt) => opt.value,
                              );

                              const namesObj = {};
                              selectedOptions.forEach((opt) => {
                                namesObj[opt.value] = opt.label;
                              });

                              setInviteData((prev) => ({
                                ...prev,
                                rolesIds: ids,
                                rolesNames: namesObj,
                              }));
                            }}
                            placeholder="Select Roles"
                            classNamePrefix="react-select"
                            styles={{
                              control: (base, state) => ({
                                ...base,
                                minHeight: "42px",
                                borderRadius: "0.5rem",
                                borderColor: state.isFocused
                                  ? "#a3d9a5"
                                  : "#a3d9a5",
                                boxShadow: state.isFocused
                                  ? "0 0 0 2px hsl(var(--primary) / 0.2)"
                                  : "none",
                                "&:hover": {
                                  borderColor: "#a3d9a5",
                                },
                              }),
                            }}
                          />
                        </div>
                      </div>
                      <div>
                        <textarea
                          className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                          label="Description"
                          rows={4}
                          value={inviteData?.description || ""}
                          placeholder="Description"
                          onChange={(e) =>
                            handleInviteChange("description", e?.target?.value)
                          }
                        />
                      </div>
                    </div>
                    <div className="flex space-x-3 pt-4">
                      <Button
                        variant="outline"
                        onClick={() => setIsInviteModalOpen(false)}
                        fullWidth
                      >
                        Cancel
                      </Button>
                      <Button
                        type="submit"
                        variant="default"
                        loading={isLoading}
                        iconName="Send"
                        iconPosition="left"
                        fullWidth
                      >
                        {isEdit ? "Update User" : "Create User"}
                      </Button>
                    </div>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </>
      )}

      {isTeamModalOpen && (
        <>
          {/* Overlay */}
          <div
            className="fixed inset-0 bg-black/50 z-50"
            onClick={() => setIsTeamModalOpen(false)}
          />

          {/* Modal */}
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-card border border-border rounded-xl w-full max-w-2xl shadow-xl">
              {/* Header */}
              <div className="flex justify-between items-center p-4 border-b">
                <h3 className="text-lg font-semibold">
                  {selectedTeam?.name} - Team Members
                </h3>
                <button onClick={() => setIsTeamModalOpen(false)}>
                  <Icon name="X" />
                </button>
              </div>

              {/* Body */}
              <div className="p-4 max-h-[400px] overflow-y-auto">
                {isLoading ? (
                  <p>Loading...</p>
                ) : !teamUsers.length ? (
                  <p className="text-center text-gray-400">
                    No users in this team
                  </p>
                ) : (
                  teamUsers.map((user) => (
                    <div
                      key={user.id}
                      className="flex items-center justify-between p-3 border-b"
                    >
                      <div className="flex items-center gap-3">
                        <Avatar name={user.name} size="35" round />
                        <div>
                          <p className="font-medium">{user.name}</p>
                          <p className="text-xs text-gray-500">{user.email}</p>
                        </div>
                      </div>

                      {getStatusBadge(user.status)}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </>
      )}

      {isDeleteModalOpen && (
        <>
          {/* Overlay */}
          <div
            className="fixed inset-0 bg-black/50 z-50"
            onClick={() => setIsDeleteModalOpen(false)}
          />

          {/* Modal */}
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-card border border-border rounded-xl w-full max-w-md shadow-xl p-6">
              <div className="flex items-center space-x-3 mb-4">
                <Icon name="AlertTriangle" size={24} className="text-error" />
                <h3 className="text-lg font-semibold text-card-foreground">
                  Confirm Delete
                </h3>
              </div>

              <p className="text-sm text-muted-foreground mb-6">
                Are you sure you want to delete this team? This action cannot be
                undone.
              </p>

              <div className="flex justify-end space-x-3">
                <Button
                  variant="outline"
                  onClick={() => setIsDeleteModalOpen(false)}
                >
                  Cancel
                </Button>

                <Button
                  variant="destructive"
                  onClick={handleRemoveTeam}
                  loading={isLoading}
                >
                  Delete
                </Button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default TeamsTab;
