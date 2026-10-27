import { Navigate } from "react-router-dom";
import { isMaskedUser } from "utils/permission";

// Token truthiness alone is too weak — a tampered `auth_token = "x"`
// would let the route render, then every downstream service call 401s
// and a chain of unguarded JSON.parse() consumers crash. We also
// require a parseable `login_object` (the EspoCRM user payload with at
// least `id` and `username`) before considering the session valid.
const isSessionValid = () => {
  const token = localStorage.getItem("auth_token");
  if (!token) return false;
  const raw = localStorage.getItem("login_object");
  if (!raw) return false;
  try {
    const user = JSON.parse(raw);
    return Boolean(user && typeof user === "object" && user.id);
  } catch {
    return false;
  }
};

// `blockMasked` keeps restricted accounts off a route entirely. Hiding the
// sidebar button is presentation only — without this, the page is still one
// typed URL away.
// `allow` takes a predicate from utils/permission (canSeeTeamPerformance, etc.)
// and turns the route away when it returns false. A predicate rather than a
// boolean flag per role, so adding a restricted section does not mean adding
// another prop here — and so the route and the sidebar entry can share ONE
// definition of who may see a thing instead of drifting apart.
//
// Same reasoning as blockMasked above: hiding the sidebar entry is
// presentation, and a restricted section needs the URL closed as well, not
// just the button.
const ProtectedRoute = ({ children, blockMasked = false, allow }) => {
  if (!isSessionValid()) {
    return <Navigate to="/login" replace />;
  }
  if (blockMasked && isMaskedUser()) {
    return <Navigate to="/" replace />;
  }
  if (typeof allow === "function" && !allow()) {
    return <Navigate to="/" replace />;
  }
  return children;
};

export default ProtectedRoute;
