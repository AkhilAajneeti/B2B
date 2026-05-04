export const fetchNotifications = async () => {
  const token = localStorage.getItem("auth_token");

  console.log("AUTH TOKEN:", token); // 🔍 debug

  const res = await fetch("https://gateway.aajneetiadvertising.com/Notification?maxSize=5&offset=0&orderBy=number&order=desc", {
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

    throw new Error("Failed to fetch notifications ");
  }

  return await res.json();
};


// 
export const fetchUnreadCount = async () => {
  const token = localStorage.getItem("auth_token");

  const res = await fetch(
    "https://gateway.aajneetiadvertising.com/Notification/action/notReadCount",
    {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        token: token,
      },
    }
  );
  console.log("STATUS:", res.status);
  if (!res.ok) {
    throw new Error("Failed to fetch notifications Count");
  }
  const data = await res.json(); // 🔥 FIX HERE
  console.log("COUNT DATA:", data);

  return data; // ✅ return actual data
};