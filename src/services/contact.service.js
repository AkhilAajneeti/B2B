import { handleUnauthorized } from "./session";
export const fetchContacts = async () => {
  const token = localStorage.getItem("auth_token");
  console.log("AUTH TOKEN:", token); // 🔍 debug
  const res = await fetch("https://gateway.aajneetiadvertising.com/Contact", {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      token: token, // ✅ backend expects this
    },
  });
  if (!res.ok) {
    console.log("STATUS:", res.status);
    if (res.status === 401) {
      handleUnauthorized();
    }
    throw new Error("Failed to fetch accounts");
  }
  return await res.json();
};

export const fetchContactById = async (id) => {
  const token = localStorage.getItem("auth_token");
  console.log("AUTH TOKEN:", token); // 🔍 debug
  const res = await fetch(`https://gateway.aajneetiadvertising.com/Contact/${id}`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      token: token, // ✅ backend expects this
    },
  });
  if (!res.ok) {
    console.log("STATUS:", res.status);
    if (res.status === 401) {
      handleUnauthorized();
    }
    throw new Error("Failed to fetch Contacts By ID's");
  }
  console.log(res);
  return await res.json();
};

export const createContact = async (payload) => {
  const token = localStorage.getItem("auth_token");
  const res = await fetch("https://gateway.aajneetiadvertising.com/Contact", {
    method: "POST",
    headers: { "Content-Type": "application/json", token: token },

    body: JSON.stringify(payload),
  });
  const text = await res.text();
  if (!res.ok) {
    // Session is gone — send them to login rather than leaving a dead
    // page. 401 ONLY: a 403 means this role may not read THIS entity,
    // which is routine under per-role ACLs and must not end the session.
    if (res.status === 401) {
      handleUnauthorized();
    }
    throw new Error("Contact is not created");
  }
  // EspoCRM returns array
  return text ? JSON.parse(text) : null;
};

export const deleteContact = async (id) => {
  const token = localStorage.getItem("auth_token");
  const res = await fetch(
    `https://gateway.aajneetiadvertising.com/Contact/${id}`,
    {
      method: "DELETE",
      headers: { "Content-Type": "application/json", token: token },
    }
  );
  if (!res.ok) {
    // Session is gone — send them to login rather than leaving a dead
    // page. 401 ONLY: a 403 means this role may not read THIS entity,
    // which is routine under per-role ACLs and must not end the session.
    if (res.status === 401) {
      handleUnauthorized();
    }
    throw new Error("Failed to delete contact");
  }
  return res.json();
};
export const bulkDeleteContacts = async (ids = []) => {
  return Promise.all(ids.map((id) => deleteContact(id)));
};

export const updateContact = async (id, payload) => {
  const token = localStorage.getItem("auth_token");
  console.log(id, payload);
  const res = await fetch(
    `https://gateway.aajneetiadvertising.com/Contact/${id}`,
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

  const text = await res.text();
  console.log("response from contact.service.js", res);
  if (!res.ok) {
    // Session is gone — send them to login rather than leaving a dead
    // page. 401 ONLY: a 403 means this role may not read THIS entity,
    // which is routine under per-role ACLs and must not end the session.
    if (res.status === 401) {
      handleUnauthorized();
    }
    throw new Error(text || "Contact update failed");
  }

  return text ? JSON.parse(text) : null;
};

// --------------Stream-----------
//fetch by Streams
export const fetchContactStreamById = async (id) => {
  console.log(id);
  const token = localStorage.getItem("auth_token");
  console.log("AUTH TOKEN:", token); // 🔍 debug
  const res = await fetch(
    `https://gateway.aajneetiadvertising.com/Contact/${id}/stream`,
    {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        token: token,
      },
    }
  );

  console.log(res);
  if (!res.ok) {
    console.log("STATUS:", res.status);
    if (res.status === 401) {
      handleUnauthorized();
    }
    throw new Error("Failed to fetch User's stream");
  }
  return await res.json();
};

//delete stream with notes api
export const deleteContactStream = async (id) => {
  const token = localStorage.getItem("auth_token");
  const res = await fetch(
    `https://gateway.aajneetiadvertising.com/Note/${id}`,
    {
      method: "DELETE",
      headers: { "Content-Type": "application/json", token: token },
    }
  );
  if (!res.ok) {
    // Session is gone — send them to login rather than leaving a dead
    // page. 401 ONLY: a 403 means this role may not read THIS entity,
    // which is routine under per-role ACLs and must not end the session.
    if (res.status === 401) {
      handleUnauthorized();
    }
    throw new Error("Failed to delete Activity");
  }
  return res.json();
};

//create strean
export const createContactStream = async (payload) => {
  console.log(payload);
  const token = localStorage.getItem("auth_token");
  const res = await fetch("https://gateway.aajneetiadvertising.com/Note", {
    method: "POST",
    headers: { "Content-Type": "application/json", token: token },

    body: JSON.stringify(payload),
  });
  const text = await res.text();
  if (!res.ok) {
    // Session is gone — send them to login rather than leaving a dead
    // page. 401 ONLY: a 403 means this role may not read THIS entity,
    // which is routine under per-role ACLs and must not end the session.
    if (res.status === 401) {
      handleUnauthorized();
    }
    console.error("API ERROR:", text);
    throw new Error("Activity is not created", text);
  }
  // EspoCRM returns array
  return text ? JSON.parse(text) : null;
};

// Meet call related Activities

export const contactActivitesById = async (id) => {
  console.log(id);
  const token = localStorage.getItem("auth_token");
  console.log("AUTH TOKEN:", token); // 🔍 debug
  const res = await fetch(
    `https://gateway.aajneetiadvertising.com/Activities/Contact/${id}/activities`,
    {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        token: token,
      },
    }
  );

  console.log(res);
  if (!res.ok) {
    console.log("STATUS:", res.status);
    if (res.status === 401) {
      handleUnauthorized();
    }
    throw new Error("Failed to fetch Accounts Activties");
  }
  return await res.json();
};
