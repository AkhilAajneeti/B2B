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
const ProtectedRoute = ({ children, blockMasked = false }) => {
  if (!isSessionValid()) {
    return <Navigate to="/login" replace />;
  }
  if (blockMasked && isMaskedUser()) {
    return <Navigate to="/" replace />;
  }
  return children;
};

export default ProtectedRoute;
