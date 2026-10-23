import { handleUnauthorized } from "./session";
const apiFetch = async (url, options = {}) => {
  const res = await fetch(url, {
    headers: {
      "Content-Type": "application/json",
    },
    ...options,
  });

  if (!res.ok) {
    // Session is gone — send them to login rather than leaving a dead
    // page. 401 ONLY: a 403 means this role may not read THIS entity,
    // which is routine under per-role ACLs and must not end the session.
    if (res.status === 401) {
      handleUnauthorized();
    }
    const err = await res.text();
    throw new Error(err);
  }

  return res.json();
};

export default apiFetch;
