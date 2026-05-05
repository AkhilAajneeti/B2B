const ACCESS_ALLOW_VALUES = ["yes", "all", "team", "own"];

export const getStoredAcl = () => {
  try {
    const storedAcl = localStorage.getItem("acl");
    if (storedAcl) return JSON.parse(storedAcl);

    const storedUser = localStorage.getItem("login_object");
    if (!storedUser) return null;

    return JSON.parse(storedUser)?.acl || null;
  } catch {
    return null;
  }
};

export const hasAcl = () => Boolean(getStoredAcl());

const isAllowedValue = (value) => {
  if (value === true) return true;
  if (value === false || value == null) return false;

  return ACCESS_ALLOW_VALUES.includes(String(value).toLowerCase());
};

export const canEntity = (entity, action = "read") => {
  const acl = getStoredAcl();
  if (!acl) return true;

  const entityAcl = acl?.table?.[entity];
  if (entityAcl === true) return true;
  if (!entityAcl) return false;

  return isAllowedValue(entityAcl?.[action]);
};

export const canRead = (entity) => canEntity(entity, "read");
export const canCreate = (entity) => canEntity(entity, "create");
export const canEdit = (entity) => canEntity(entity, "edit");
export const canDelete = (entity) => canEntity(entity, "delete");

// export I want to implement permission-based control in my **Project (CProjects)** module on the frontend.

// Currently, there is no proper ACL defined for Projects. The only available config is:

// CProjects:

// * links:

//   * collaborators:

//     * readOnly: true

// This only controls the collaborators relationship and does not define create/edit/delete permissions.

// ---

// ### Requirements:

// 1. **Project Visibility (Read):**

//    * Admin and Manager users should be able to see all projects.
//    * Other users should only see projects where:

//      ```js
//      project.assignedUserId === currentUserId
//      ```

// 2. **Edit Permission:**

//    * A user should be allowed to edit a project only if:

//      ```js
//      project.assignedUserId === currentUserId
//      ```

// 3. **Create/Delete (Temporary Rule):**

//    * Since ACL is not defined:

//      * Only Admin/Manager can create or delete projects (frontend-controlled).

// 4. **UI Behavior:**

//    * Hide Edit button if user is not assigned to the project.
//    * Hide Create/Delete buttons if user is not Admin/Manager.
//    * Do not just disable buttons — completely hide them.

// ---

// ### Note:

// * This is a temporary frontend-based control.
// * Backend ACL for Projects is not yet implemented.
// * This logic should follow the same pattern used in other modules where permissions are applied.
export const getStoredUser = () => {
  try {
    const storedUser = localStorage.getItem("login_object");
    return storedUser ? JSON.parse(storedUser) : null;
  } catch {
    return null;
  }
};

const getEntityActionValue = (entity, action) => {
  const acl = getStoredAcl();
  const entityAcl = acl?.table?.[entity];

  if (!acl) return null;
  if (entityAcl === true) return "all";

  return entityAcl?.[action] || "no";
};

export const isOwnRecord = (record, user) => {
  if (!record || !user?.id) return false;

  return [
    record.assignedUserId,
    record.createdById,
    record.ownerId,
    record.userId,
  ].includes(user.id);
};

const isTeamRecord = (record, user) => {
  const userTeamIds = user?.teamsIds || [];
  const recordTeamIds = record?.teamsIds || (record?.teamId ? [record.teamId] : []);

  return recordTeamIds.some((teamId) => userTeamIds.includes(teamId));
};

export const canEntityRecord = (entity, action, record) => {
  const rawAccess = getEntityActionValue(entity, action);
  const access = typeof rawAccess === "string" ? rawAccess.toLowerCase() : rawAccess;
  if (access == null) return true;
  if (access === true || access === "yes" || access === "all") return true;
  if (access === false || access === "no") return false;

  const user = getStoredUser();

  if (access === "own") return isOwnRecord(record, user);
  if (access === "team") return isOwnRecord(record, user) || isTeamRecord(record, user);

  return isAllowedValue(access);
};

export const canEditRecord = (entity, record) =>
  canEntityRecord(entity, "edit", record);

export const canDeleteRecord = (entity, record) =>
  canEntityRecord(entity, "delete", record);

export const canGlobal = (permissionKey) => {
  const acl = getStoredAcl();
  if (!acl) return true;

  return isAllowedValue(acl?.[permissionKey]);
};

export const canReadField = (entity, field) => {
  const acl = getStoredAcl();
  if (!acl) return true;

  const fieldAcl = acl?.fieldTable?.[entity]?.[field];
  if (!fieldAcl) return true;

  return isAllowedValue(fieldAcl?.read);
};

export const canEditField = (entity, field) => {
  const acl = getStoredAcl();
  if (!acl) return true;

  const fieldAcl = acl?.fieldTable?.[entity]?.[field];
  if (!fieldAcl) return true;

  return isAllowedValue(fieldAcl?.edit);
};

export const isAdminOrManager = () => {
  const user = getStoredUser();
  const role = user?.role?.toLowerCase();
  return role === 'admin' || role === 'manager';
};
