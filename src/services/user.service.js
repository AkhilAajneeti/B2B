/**
 * Fetches EVERY user, not just the first page.
 *
 * The previous version hit `/User` with no `maxSize`/`offset`, so EspoCRM
 * applied its default page size (200) and silently returned only the first
 * page. Callers paginate client-side over `list`, so any user past the 200th
 * was invisible to the UI. We now walk the offsets until we've collected
 * `total`.
 */
export const fetchUser = async () => {
  const token = localStorage.getItem("auth_token");

  const PAGE_SIZE = 200; // EspoCRM's max rows per list request
  const MAX_PAGES = 50; // backstop: 10k users, guards against a runaway loop

  const list = [];
  let offset = 0;
  let total = Infinity;

  for (let page = 0; page < MAX_PAGES && offset < total; page++) {
    const res = await fetch(
      `https://gateway.aajneetiadvertising.com/User?maxSize=${PAGE_SIZE}&offset=${offset}&orderBy=userName&order=asc`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          token: token, // ✅ backend expects this
        },
      },
    );

    if (!res.ok) {
      if (res.status === 401 || res.status === 403) {
        localStorage.clear();
        window.location.href = "/login";
      }
      throw new Error("Failed to fetch User's");
    }

    const data = await res.json();
    const rows = data?.list || [];

    total = typeof data?.total === "number" ? data.total : rows.length;
    list.push(...rows);

    // Server returned nothing (or capped maxSize lower than we asked) — stop
    // rather than spinning on the same offset forever.
    if (!rows.length) break;
    offset += rows.length;
  }

  return { total: list.length, list };
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