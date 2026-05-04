/* GET */
export const fetchAccounts = async ({limit,page}) => {
  const token = localStorage.getItem("auth_token");
const offset=(page-1)*limit;
  // console.log("AUTH TOKEN:", token); // 🔍 debug

  const res = await fetch(`https://gateway.aajneetiadvertising.com/Account?maxSize=${limit}&offset=${offset}&orderBy=createdAt&order=desc&attributeSelect=name%2Ctype%2CmodifiedAt%2CmodifiedById%2CmodifiedByName%2CcreatedAt%2CcreatedById%2CcreatedByName`, {
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

    throw new Error("Failed to fetch accounts");
  }

  return await res.json();
};

/* CREATE */
export const createAccount = async (payload) => {
  const token = localStorage.getItem("auth_token");
  try {
    const res = await fetch("https://gateway.aajneetiadvertising.com/Account", {
      method: "POST",
      headers: { "Content-Type": "application/json", token: token },

      body: JSON.stringify(payload),
    });
  } catch (err) {
    console.error("Create Account API Error:", err?.response || err);
    throw err; // 🔥 ORIGINAL error rethrow
  }

  // const text = await res.text();
  // if (!res.ok) {
  //   throw new Error("account is not created");
  // }

  return text ? JSON.parse(text) : null;
};

/* UPDATE */
export const updateAccount = async (id, payload, versionNumber) => {
  const token = localStorage.getItem("auth_token");
  console.log(id, payload, versionNumber);
  const res = await fetch(
    `https://gateway.aajneetiadvertising.com/Account/${id}`,
    {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        // "X-Version-Number": String(versionNumber||1),
        token: token,
      },
      body: JSON.stringify(payload),
    },
  );

  const text = await res.text();
  console.log("response front servicejs", res);
  if (!res.ok) {
    throw new Error(text || "Account update failed");
  }

  return text ? JSON.parse(text) : null;
};

/* DELETE */
export const deleteAccount = async (id) => {
  const token = localStorage.getItem("auth_token");
  const res = await fetch(
    `https://gateway.aajneetiadvertising.com/Account/${id}`,
    {
      method: "DELETE",
      headers: { "Content-Type": "application/json", token: token },
    },
  );
  return res.json();
};

//
// --------------Stream-----------
//fetch by Streams
export const fetchAccStreamById = async (id) => {
  console.log(id);
  const token = localStorage.getItem("auth_token");
  console.log("AUTH TOKEN:", token); // 🔍 debug
  const res = await fetch(
    `https://gateway.aajneetiadvertising.com/Account/${id}/stream`,
    {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        token: token,
      },
    },
  );

  console.log(res);
  if (!res.ok) {
    console.log("STATUS:", res.status);
    if (res.status === 401 || res.status === 403) {
      localStorage.clear();
      window.location.href = "/login";
    }
    throw new Error("Failed to fetch User's stream");
  }
  return await res.json();
};

//delete stream with notes api
export const deleteAccStream = async (id) => {
  const token = localStorage.getItem("auth_token");
  const res = await fetch(
    `https://gateway.aajneetiadvertising.com/Note/${id}`,
    {
      method: "DELETE",
      headers: { "Content-Type": "application/json", token: token },
    },
  );
  if (!res.ok) {
    throw new Error("Failed to delete Stream");
  }
  return res.json();
};

//create stream
export const createAccStream = async (payload) => {
  console.log(payload);
  const token = localStorage.getItem("auth_token");
  const res = await fetch("https://gateway.aajneetiadvertising.com/Note", {
    method: "POST",
    headers: { "Content-Type": "application/json", token: token },

    body: JSON.stringify(payload),
  });
  const text = await res.text();
  if (!res.ok) {
    console.error("API ERROR:", text);
    throw new Error("Activity is not created", text);
  }
  // EspoCRM returns array
  return text ? JSON.parse(text) : null;
};

// Meet call related Activities

export const accActivitesById = async (id) => {
  console.log(id);
  const token = localStorage.getItem("auth_token");
  console.log("AUTH TOKEN:", token); // 🔍 debug
  const res = await fetch(
    `https://gateway.aajneetiadvertising.com/Activities/Account/${id}/activities`,
    {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        token: token,
      },
    },
  );

  console.log(res);
  if (!res.ok) {
    console.log("STATUS:", res.status);
    if (res.status === 401 || res.status === 403) {
      localStorage.clear();
      window.location.href = "/login";
    }
    throw new Error("Failed to fetch Accounts Activties");
  }
  return await res.json();
};

// finding task related to accounts
export const fetchTaskByAccount = async (id) => {
  console.log(id);
  const token = localStorage.getItem("auth_token");
  console.log("AUTH TOKEN:", token); // 🔍 debug
  const res = await fetch(
    `https://gateway.aajneetiadvertising.com/Task?accountId=${id}`,
    {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        token: token,
      },
    },
  );

  console.log(res);
  if (!res.ok) {
    console.log("STATUS:", res.status);
    if (res.status === 401 || res.status === 403) {
      localStorage.clear();
      window.location.href = "/login";
    }
    throw new Error("Failed to Task related to this account");
  }
  return await res.json();
};
// finding task related to accounts
export const fetchContactByAccount = async (id) => {
  console.log(id);
  const token = localStorage.getItem("auth_token");
  console.log("AUTH TOKEN:", token); // 🔍 debug
  const res = await fetch(
    `https://gateway.aajneetiadvertising.com/Contact?accountId=${id}`,
    {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        token: token,
      },
    },
  );

  console.log(res);
  if (!res.ok) {
    console.log("STATUS:", res.status);
    if (res.status === 401 || res.status === 403) {
      localStorage.clear();
      window.location.href = "/login";
    }
    throw new Error("Failed to Contact related to this account");
  }
  return await res.json();
};

// unlink the contact
export const unlinkContactFromAccount = async (id) => {
  const token = localStorage.getItem("auth_token");

  const res = await fetch(
    `https://gateway.aajneetiadvertising.com/Contact/${id}`,
    {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        token: token,
      },
      body: JSON.stringify({
        accountId: null,
      }),
    },
  );

  if (!res.ok) {
    const error = await res.text();
    throw new Error(error || "Failed to unlink contact");
  }

  return res.json();
};
