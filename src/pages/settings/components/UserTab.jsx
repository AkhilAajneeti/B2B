import React, { useEffect, useState } from "react";
import Icon from "../../../components/AppIcon";
import Image from "../../../components/AppImage";
import Button from "../../../components/ui/Button";
import Input from "../../../components/ui/Input";
import Select from "../../../components/ui/Select";
import Avatar from "react-avatar";
import TablePagination from "./TablePagination";
import {
  deleteUser,
  fetchUser,
  fetchUserById,
  updateUser,
} from "services/user.service";
import { fetchTeam } from "services/team.service";
import { createUser, fetchRoles } from "services/setting.service";
import toast from "react-hot-toast";
import UserDetailsModal from "./models/UserDetailsModal";
const UserTab = () => {
  const [teamMembers, setTeamMembers] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [team, setTeam] = useState([]);
  const [role, setRole] = useState([]);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isEdit, setIsEdit] = useState(false);
  const [isShowDetails, setIsShowDetails] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [inviteData, setInviteData] = useState({
    userName: "",
    title: "",
    firstName: "",
    lastName: "",
    phoneNumber: "",
    emailAddress: "",
    gender: "",
    teamId: "",
    type: "",
    isActive: "",
    role: "",
    password: "",
    confirmPassword: "",
  });
  const handleEdit = (member) => {
    setIsEdit(true);
    setIsInviteModalOpen(true);

    setInviteData({
      id: member.id,
      userName: member.userName || "",
      title: member.title || "",
      firstName: member.firstName || "",
      lastName: member.lastName || "",
      phoneNumber: member.phoneNumber || "",
      emailAddress: member.emailAddress || "",
      gender: member.gender || "",
      teamId: member.defaultTeamId || "",
      type: member.type || "",
      isActive: member.isActive ? "true" : "false",
      role: member.role || "",
      password: "",
      confirmPassword: "",
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

    if (!inviteData.firstName || !inviteData.userName) {
      toast.error("First name and username are required");
      return;
    }

    if (inviteData.password !== inviteData.confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }
    if (!inviteData.type) {
      toast.error("Please select user type");
      return;
    }
    if (!inviteData.teamId) {
      toast.error("Please select a team");
      return;
    }
    const payload = {
      userName: inviteData.userName,
      firstName: inviteData.firstName,
      lastName: inviteData.lastName,
      title: inviteData.title,
      phoneNumber: inviteData.phoneNumber,
      emailAddress: inviteData.emailAddress,
      gender: inviteData.gender,
      type: inviteData.type,
      isActive: inviteData.isActive === "true",
      password: inviteData.password,
      passwordConfirm: inviteData.password, // 🔥 important for Espo

      // ✅ ensure team is properly set
      teamsIds: inviteData.teamId ? [inviteData.teamId] : [],
      defaultTeamId: inviteData.teamId ? inviteData.teamId : null,
    };

    try {
      setIsLoading(true);
      console.log("Submitting payload:", payload);
      // await createUser(payload);
      if (isEdit) {
        await updateUser(inviteData.id, payload);
        toast.success("User updated successfully ✅");
      } else {
        await createUser(payload);
        toast.success("User created successfully ✅");
      }

      toast.success("User created successfully ✅");

      const data = await fetchUser();
      setTeamMembers(data.list || []);

      setIsInviteModalOpen(false);
    } catch (err) {
      toast.error("Failed to create user ❌");
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

  useEffect(() => {
    const loadData = async () => {
      try {
        const data = await fetchUser();
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
        const [teamRes, roleRes] = await Promise.all([
          fetchTeam(),
          fetchRoles(),
        ]);
        setTeam(teamRes.list || []);
        setRole(roleRes.list || []);
      } catch (err) {
        console.error("Failed to load data", err);
      }
    };
    loadData();
  }, []);

  const teamOptions = team?.map((t) => ({
    value: t.id,
    label: t.name,
  }));
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

  const typeOptions = [
    { value: "regular", label: "Regular" },
    { value: "admin", label: "Admin" },
  ];
  const ActiveOptions = [
    { value: "true", label: "true" },
    { value: "false", label: "false" },
  ];
  const GenderOptions = [
    { value: "Male", label: "Male" },
    { value: "Female", label: "Female" },
    { value: "Neutral", label: "Neutral" },
  ];

  const handleInviteChange = (field, value) => {
    setInviteData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSendInvite = async () => {
    setIsLoading(true);

    setTimeout(() => {
      const newMember = {
        id: teamMembers?.length + 1,
        name: inviteData?.email
          ?.split("@")?.[0]
          ?.replace(".", " ")
          ?.replace(/\b\w/g, (l) => l?.toUpperCase()),
        email: inviteData?.email,
        role: inviteData?.role,
        department: inviteData?.department,
        status: "Invited",
        lastActive: "Pending",
        avatar: "https://images.unsplash.com/photo-1602241470511-879ce3890853",
        avatarAlt: "Default avatar placeholder for new team member",
      };

      setTeamMembers((prev) => [...prev, newMember]);
      setInviteData({ email: "", role: "User", department: "Sales" });
      setIsInviteModalOpen(false);
      setIsLoading(false);
      console.log("Invite sent successfully");
    }, 1000);
  };

  const handleRemoveUser = async () => {
    if (!selectedUserId) return;

    try {
      setIsLoading(true);

      await deleteUser(selectedUserId);

      toast.success("User deleted successfully ✅");

      const data = await fetchUser();
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
  const ROLES = ["apiread", "calling", "Executive", "Manager"];
  const generatePassword = (length = 10) => {
    const chars =
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*";
    let password = "";

    for (let i = 0; i < length; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    return password;
  };
  const handleGeneratePassword = () => {
    const newPassword = generatePassword(12);

    setInviteData((prev) => ({
      ...prev,
      password: newPassword,
      confirmPassword: newPassword,
    }));

    toast.success("Password generated ✅");
  };
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

      {/* status */}
      <td className="p-4">
        <div className="h-4 w-24 bg-gray-300/60 rounded"></div>
      </td>
      {/* Next Contact */}
      <td className="p-4">
        <div className="h-4 w-24 bg-gray-300/60 rounded"></div>
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
                User Management
              </h3>
              <p className="text-sm text-muted-foreground">
                Manage users, roles, and permissions
              </p>
            </div>
          </div>
          <Button
            variant="default"
            onClick={() => setIsInviteModalOpen(true)}
            iconName="UserPlus"
            iconPosition="left" className="linearbg-1 text-white hover:text-white"
          >
            Create User
          </Button>
        </div>

        {/* Team Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-muted rounded-lg p-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                <Icon name="Users" size={20} className="text-primary" />
              </div>
              <div>
                <p className="text-2xl font-semibold text-card-foreground">
                  {teamMembers?.length}
                </p>
                <p className="text-sm text-muted-foreground">Total Members</p>
              </div>
            </div>
          </div>
          <div className="bg-muted rounded-lg p-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-success/10 rounded-lg flex items-center justify-center">
                <Icon name="CheckCircle" size={20} className="text-success" />
              </div>
              <div>
                <p className="text-2xl font-semibold text-card-foreground">
                  {teamMembers?.filter((m) => m?.isActive)?.length}
                </p>
                <p className="text-sm text-muted-foreground">Active</p>
              </div>
            </div>
          </div>
          <div className="bg-muted rounded-lg p-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-warning/10 rounded-lg flex items-center justify-center">
                <Icon name="Clock" size={20} className="text-warning" />
              </div>
              <div>
                <p className="text-2xl font-semibold text-card-foreground">
                  {teamMembers?.filter((m) => m?.type === "regular")?.length}
                </p>
                <p className="text-sm text-muted-foreground">Regular</p>
              </div>
            </div>
          </div>
          <div className="bg-muted rounded-lg p-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-error/10 rounded-lg flex items-center justify-center">
                <Icon name="Shield" size={20} className="text-error" />
              </div>
              <div>
                <p className="text-2xl font-semibold text-card-foreground">
                  {teamMembers?.filter((m) => m?.type === "admin")?.length}
                </p>
                <p className="text-sm text-muted-foreground">Admins</p>
              </div>
            </div>
          </div>
        </div>

        {/* Team Members Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-3 px-4 font-medium text-muted-foreground">
                  Name
                </th>
                <th className="text-left py-3 px-4 font-medium text-muted-foreground">
                  Role
                </th>
                <th className="text-left py-3 px-4 font-medium text-muted-foreground">
                  User Name
                </th>
                <th className="text-left py-3 px-4 font-medium text-muted-foreground">
                  Status
                </th>
                <th className="text-left py-3 px-4 font-medium text-muted-foreground">
                  Created At
                </th>
                <th className="text-right py-3 px-4 font-medium text-muted-foreground">
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
                      <div className="flex items-center space-x-3">
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
                            onClick={() => {
                              fetchuserById(member);
                            }}
                          >
                            {member?.name}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {member?.emailAddress}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <span className="text-sm text-card-foreground">
                        {member?.type}
                      </span>
                    </td>
                    <td className="py-4 px-4">
                      <span className="text-sm text-card-foreground">
                        {member?.userName}
                      </span>
                    </td>
                    <td className="py-4 px-4">
                      {getStatusBadge(member?.isActive ? "Active" : "InActive")}
                    </td>
                    <td className="py-4 px-4">
                      <span className="text-sm text-muted-foreground">
                        {member?.createdAt}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-right">
                      <div className="flex items-center justify-end space-x-2">
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
                          label="User Name"
                          type="text"
                          value={inviteData?.userName}
                          onChange={(e) =>
                            handleInviteChange("userName", e?.target?.value)
                          }
                          placeholder="colleague@company.com"
                          required
                        />
                        <Input
                          label="Title"
                          type="text"
                          value={inviteData?.title}
                          onChange={(e) =>
                            handleInviteChange("title", e?.target?.value)
                          }
                          placeholder="title"
                          required
                        />
                      </div>
                      {/* First Name's  && Last Name*/}
                      <div className="grid grid-cols-2 gap-2">
                        <Input
                          label="First Name"
                          type="text"
                          value={inviteData?.firstName}
                          onChange={(e) =>
                            handleInviteChange("firstName", e?.target?.value)
                          }
                          placeholder="colleague@company.com"
                          required
                        />
                        <Input
                          label="Last Name"
                          type="text"
                          value={inviteData?.lastName}
                          onChange={(e) =>
                            handleInviteChange("lastName", e?.target?.value)
                          }
                          placeholder="colleague@company.com"
                          required
                        />
                      </div>

                      {/* email & phone number */}
                      <div className="grid grid-cols-2 gap-2">
                        <Input
                          label="Email Address"
                          type="email"
                          value={inviteData?.emailAddress}
                          onChange={(e) =>
                            handleInviteChange("emailAddress", e?.target?.value)
                          }
                          placeholder="colleague@company.com"
                          required
                        />
                        <Input
                          label="Phone Number"
                          type="tel"
                          value={inviteData?.phoneNumber}
                          onChange={(e) =>
                            handleInviteChange("phoneNumber", e?.target?.value)
                          }
                          placeholder="colleague@company.com"
                          required
                        />
                      </div>

                      {/* gender & phone number */}
                      <div className="grid grid-cols-2 gap-2">
                        <Select
                          label="Gender"
                          options={GenderOptions}
                          value={inviteData?.gender}
                          onChange={(value) =>
                            handleInviteChange("gender", value)
                          }
                        />
                      </div>
                    </div>
                    {/* Team Access Control */}
                    <div className="bg-card border border-border rounded-lg p-4 space-y-4">
                      {/* Teams And Roles */}
                      <label htmlFor="">Team And Access control</label>
                      <div className="grid grid-cols-2 gap-2">
                        <Select
                          label="Team"
                          options={teamOptions}
                          value={inviteData?.teamId}
                          onChange={(value) =>
                            handleInviteChange("teamId", value)
                          }
                        />
                        <Select
                          label="Role"
                          options={roleOptions}
                          value={inviteData?.role}
                          onChange={(value) =>
                            handleInviteChange("role", value)
                          }
                        />
                      </div>
                      {/* Regular And Is Active */}
                      <div className="grid grid-cols-2 gap-2">
                        <Select
                          label="Type"
                          options={typeOptions}
                          value={inviteData?.type}
                          onChange={(value) =>
                            handleInviteChange("type", value)
                          }
                        />
                        <Select
                          label="IsActive"
                          options={ActiveOptions}
                          value={inviteData?.isActive}
                          onChange={(value) =>
                            handleInviteChange("isActive", value)
                          }
                        />
                      </div>
                    </div>
                    {/* password and generate password */}
                    <div className="bg-card border border-border rounded-lg p-4 space-y-4">
                      <div className="grid grid-cols-2 gap-2">
                        <div className="relative">
                          <Input
                            label="Password"
                            type={showPassword ? "text" : "password"}
                            value={inviteData?.password}
                            onChange={(e) =>
                              handleInviteChange("password", e?.target?.value)
                            }
                            required
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-[38px] text-muted-foreground hover:text-foreground"
                          >
                            <Icon
                              name={showPassword ? "EyeOff" : "Eye"}
                              size={18}
                            />
                          </button>
                        </div>
                        <div className="relative">
                          <Input
                            label="Confirm Password"
                            type={showConfirmPassword ? "text" : "password"}
                            value={inviteData?.confirmPassword}
                            onChange={(e) =>
                              handleInviteChange(
                                "confirmPassword",
                                e?.target?.value,
                              )
                            }
                            required
                          />
                          <button
                            type="button"
                            onClick={() =>
                              setShowConfirmPassword(!showConfirmPassword)
                            }
                            className="absolute right-3 top-[38px] text-muted-foreground hover:text-foreground"
                          >
                            <Icon
                              name={showConfirmPassword ? "EyeOff" : "Eye"}
                              size={18}
                            />
                          </button>
                        </div>
                        <Button
                          className="col-span-2"
                          variant="default"
                          onClick={handleGeneratePassword}
                          loading={isLoading}
                          iconName="Send"
                          iconPosition="left"
                          fullWidth
                          type="button"
                        >
                          Generate Password
                        </Button>
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
      {isShowDetails && selectedUser && (
        <UserDetailsModal
          user={selectedUser}
          onClose={() => setIsShowDetails(false)}
          getStatusBadge={getStatusBadge}
        />
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
                Are you sure you want to delete this user? This action cannot be
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
                  onClick={handleRemoveUser}
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

export default UserTab;
