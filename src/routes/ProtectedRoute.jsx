import { Navigate } from "react-router-dom";

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

const ProtectedRoute = ({ children }) => {
  if (!isSessionValid()) {
    return <Navigate to="/login" replace />;
  }
  return children;
};

export default ProtectedRoute;
