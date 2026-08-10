import { clearUsersCache } from "./user.service";

export const fetchRoles=async()=>{
    const token = localStorage.getItem("auth_token");
  console.log("AUTH TOKEN:", token); // 🔍 debug
  const res = await fetch("https://gateway.aajneetiadvertising.com/role", {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      token: token, // ✅ backend expects this
    },
  });
  
  if (!res.ok) {
    console.log("STATUS:", res.status);
    if (res.status === 401 || res.status === 403) {
      localStorage.clear();
      window.location.href = "/login";
    }
    throw new Error("Failed to fetch Roles");
  }
  return await res.json();
}

export const createUser = async (payload) => {
  const token = localStorage.getItem("auth_token");
  const res = await fetch("https://gateway.aajneetiadvertising.com/User", {
    method: "POST",
    headers: { "Content-Type": "application/json", token: token },

    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    // EspoCRM rejects a duplicate userName/email with 409 (or a "not unique" /
    // "already used" reason). Surface that as a clean, specific error so the UI
    // can toast "User already exists". `text` was previously referenced before
    // it was declared, which threw a ReferenceError and hid the real reason.
    const reason = res.headers.get("X-Status-Reason") || "";
    const body = await res.text().catch(() => "");
    const hay = `${reason} ${body}`.toLowerCase();
    if (res.status === 409 || /not unique|already|exist|duplicate|taken/.test(hay)) {
      throw new Error("User already exists");
    }
    console.error("Create user failed:", res.status, reason || body);
    throw new Error(reason || "User is not created");
  }
  // A newly created user must appear in the cached user list immediately.
  clearUsersCache();
  // EspoCRM returns array
  return await res.json();
};