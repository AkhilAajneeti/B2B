import React, { useEffect, useRef, useState } from "react";
import Icon from "../../../components/AppIcon";
import Image from "../../../components/AppImage";
import Button from "../../../components/ui/Button";
import Input from "../../../components/ui/Input";
import Select from "../../../components/ui/Select";
import Avatar from "react-avatar";
import { attachment, fetchUserById, updateUser } from "services/user.service";
import { fetchTeam } from "services/team.service";
import toast from "react-hot-toast";

const ProfileTab = () => {
  const [profileData, setProfileData] = useState({});
  const [team, setTeam] = useState([]);
  const loginUserStr = localStorage.getItem("login_object");
  const loginUser = loginUserStr ? JSON.parse(loginUserStr) : null;

  const UserId = loginUser?.id;
  console.log(UserId);
  useEffect(() => {
    if (!UserId) return;

    const loadUser = async () => {
      try {
        const data = await fetchUserById(UserId);

        setProfileData({
          firstName: data.firstName || "",
          lastName: data.lastName || "",
          userName: data.userName || "",
          email: data.emailAddress || "",
          phone: data.phoneNumber || "",
          role: Object.values(data.rolesNames || {}).join(", "),
          type: data.type || "",
          teamId: data.teamsIds?.[0] || "",
          createdAt: data.createdAt,
          lastAccess: data.lastAccess,
          avatarId: data.avatarId,
        });
      } catch (error) {
        console.error("Error fetching profile:", error);
      }
    };

    loadUser();
  }, [UserId]);

  const [notifications, setNotifications] = useState({
    emailDeals: true,
    emailActivities: true,
    emailReports: false,
    pushDeals: true,
    pushActivities: false,
    pushReports: false,
    smsReminders: true,
    weeklyDigest: true,
  });

  const [isLoading, setIsLoading] = useState(false);

  const handleProfileChange = (field, value) => {
    setProfileData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleNotificationChange = (field, checked) => {
    setNotifications((prev) => ({
      ...prev,
      [field]: checked,
    }));
  };

  const handleAvatarUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();

    reader.onloadend = async () => {
      const base64 = reader.result;

      const payload = {
        role: "Attachment",
        relatedType: "User",
        field: "avatar",
        name: file.name,
        type: file.type,
        size: file.size,
        file: base64,
      };

      try {
        // 1️⃣ upload attachment
        const attachmentRes = await attachment(payload);

        console.log("Attachment uploaded:", attachmentRes);

        // 2️⃣ update user
        await updateUser(UserId, {
          avatarId: attachmentRes.id,
        });

        // 3️⃣ update UI
        setProfileData((prev) => ({
          ...prev,
          avatarId: attachmentRes.id,
        }));

        toast.success("Avatar updated");
      } catch (error) {
        console.error(error);
        toast.error("Avatar upload failed");
      }
    };

    reader.readAsDataURL(file);
  };

  const handleSaveProfile = async () => {
    setIsLoading(true);

    try {
      const payload = {
        firstName: profileData.firstName,
        lastName: profileData.lastName,
        emailAddress: profileData.email,
        phoneNumber: profileData.phone,
        teamsIds: [profileData.teamId],
      };

      await updateUser(UserId, payload);

      console.log("Profile updated successfully");
      toast.success("Your profile is updated");
    } catch (error) {
      console.error("Update error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      try {
        const [teamRes] = await Promise.all([fetchTeam()]);
        setTeam(teamRes.list || []);
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
  const fileInputRef = useRef();
  return (
    <div className="space-y-8">
      {/* Profile Information */}
      <div className="bg-card border border-border rounded-xl p-6">
        <div className="space-y-6">
          {/* Avatar Section */}
          <div className="flex items-center space-x-6">
            <div className="relative">
              <div className="w-20 h-20 rounded-full overflow-hidden bg-muted">
                <div className="w-20 h-20 rounded-full overflow-hidden bg-muted">
                  <Avatar
                    name={`${profileData?.firstName || ""} ${profileData?.lastName || ""}`}
                    size="80"
                    round
                  />
                </div>
              </div>
              <button
                onClick={() => fileInputRef.current.click()}
                className="absolute -bottom-1 -right-1 w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center"
              >
                <Icon name="Camera" size={16} />
              </button>
            </div>
            <div>
              <h4 className="font-medium text-card-foreground">
                Profile Photo
              </h4>
              <p className="text-sm text-muted-foreground mb-2">
                JPG, PNG or GIF. Max size 2MB.
              </p>
              <label className="cursor-pointer">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarUpload}
                  className="hidden"
                />

                <Button variant="outline" size="sm">
                  <Icon name="Upload" size={16} className="mr-2" />
                  Upload New Photo
                </Button>
              </label>
            </div>
          </div>

          {/* Basic Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="First Name"
              type="text"
              value={profileData?.firstName}
              onChange={(e) => handleProfileChange("firstName", e.target.value)}
              required
            />
            <Input
              label="Last Name"
              type="text"
              value={profileData?.lastName}
              onChange={(e) => handleProfileChange("lastName", e.target.value)}
              required
            />
            <Input
              label="Username"
              value={profileData?.userName || ""}
              onChange={(e) => handleProfileChange("userName", e.target.value)}
            />

            <Input
              label="Email"
              value={profileData?.email || ""}
              onChange={(e) => handleProfileChange("email", e.target.value)}
            />

            <Input
              label="Phone Number"
              value={profileData?.phone || ""}
              onChange={(e) => handleProfileChange("phone", e.target.value)}
            />
            <Input label="Role" value={profileData?.role || ""} disabled />
            <Select
              label="Teams"
              value={profileData?.teamId || ""}
              options={teamOptions}
              onChange={(value) =>
                setProfileData((prev) => ({
                  ...prev,
                  teamId: value,
                }))
              }
            />
            <Input label="Type" value={profileData?.type || ""} disabled />
          </div>

          {/* Preferences */}
          <div className="grid grid-cols-2 gap-4 text-sm text-muted-foreground">
            <p>Created At: {profileData?.createdAt}</p>
            <p>Last Access: {profileData?.lastAccess}</p>
          </div>

          <div className="flex justify-end">
            <Button
              variant="default"
              onClick={handleSaveProfile}
              loading={isLoading}
              iconName="Save"
              iconPosition="left"
            >
              Save Profile
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfileTab;
