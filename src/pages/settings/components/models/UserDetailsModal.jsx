import Avatar from "react-avatar";
import Icon from "../../../../components/AppIcon";

const UserDetailsModal = ({ user, onClose, getStatusBadge }) => {
  if (!user) return null;

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-card border border-border rounded-xl w-full max-w-3xl shadow-xl">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-border">
            <h3 className="text-lg font-semibold">User Details</h3>

            <button
              onClick={() => onClose()}
              className="p-2 rounded-lg hover:bg-muted"
            >
              <Icon name="X" size={20} />
            </button>
          </div>

          {/* Body */}
          <div className="p-6">
            <div className="flex items-center justify-content-center space-x-4 mb-6">
              <Avatar name={user?.name || user?.userName} size="60" round />
              <div>
                <h4 className="text-lg font-semibold">{user?.name || "—"}</h4>
                <p className="text-muted-foreground">{user?.emailAddress}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 ">
              <div>
                <p className="text-sm text-muted-foreground">User Name</p>
                <p className="font-medium">{user?.userName || "—"}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Name</p>
                <p className="font-medium">{user?.name || "—"}</p>
              </div>

              <div>
                <p className="text-sm text-muted-foreground">Phone</p>
                <p>{user?.phoneNumber || "—"}</p>
              </div>

              <div>
                <p className="text-sm text-muted-foreground">Status</p>
                {getStatusBadge(user?.isActive ? "Active" : "Inactive")}
              </div>

              <div>
                <p className="text-sm text-muted-foreground">Team</p>
                <p>{user?.defaultTeamName || "—"}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Type</p>
                <p className="font-medium">{user?.type || "—"}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-2">Role</p>

                <p className="font-medium">
                  {user?.rolesNames
                    ? Object.values(user.rolesNames).join(", ")
                    : "—"}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Created By</p>
                <p>{user?.createdByName || "—"}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Created At</p>
                <p>{user?.createdAt || "—"}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Modified At</p>
                <p>{user?.modifiedAt || "—"}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Last Access At</p>
                <p>{user?.lastAccess || "—"}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default UserDetailsModal;
