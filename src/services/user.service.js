export const fetchUser = async () => {
  const token = localStorage.getItem("auth_token");

  const res = await fetch("https://gateway.aajneetiadvertising.com/User", {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      token: token, // ✅ backend expects this
    },
  });
  if (!res.ok) {

    if (res.status === 401 || res.status === 403) {
      localStorage.clear();
      window.location.href = "/login";
    }
    throw new Error("Failed to fetch User's");
  }
  return await res.json();
}
export const fetchUserById = async (id) => {
  const token = localStorage.getItem("auth_token");

  const res = await fetch(`https://gateway.aajneetiadvertising.com/User/${id}`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      token: token, // ✅ backend expects this
    },
  });
  if (!res.ok) {

    if (res.status === 401 || res.status === 403) {
      localStorage.clear();
      window.location.href = "/login";
    }
    throw new Error("Failed to fetch User's by id");
  }
  return await res.json();
}


export const updateUser = async (id, payload) => {
  const token = localStorage.getItem("auth_token");

  const res = await fetch(
    `https://gateway.aajneetiadvertising.com/User/${id}`,
    {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        token: token,
      },
      body: JSON.stringify(payload),
    }
  );

  console.log("response from User.service.js", res);
  if (!res.ok) {
    // `text` was previously referenced before declaration → throwing
    // here raised `ReferenceError: text is not defined`, swallowing
    // the real EspoCRM error body. Read it now so the thrown message
    // surfaces the actual backend reason.
    const text = await res.text().catch(() => "");
    throw new Error(text || "User update failed");
  }

  return await res.json();
};


export const deleteUser = async (id) => {
  const token = localStorage.getItem("auth_token");
  const res = await fetch(
    `https://gateway.aajneetiadvertising.com/User/${id}`,
    {
      method: "DELETE",
      headers: { "Content-Type": "application/json", token: token },
    }
  );
  if (!res.ok) {
    throw new Error("Failed to delete User");
  }
  return res.json();
};

// upload attachment
export const attachment = async (payload) => {
  const token = localStorage.getItem("auth_token");

  const res = await fetch(
    `https://gateway.aajneetiadvertising.com/User/Attachment`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        token: token,
      },
      body: JSON.stringify(payload),
    }
  );

  if (!res.ok) {
    throw new Error(text || "User update failed");
  }

  return res.json();
};