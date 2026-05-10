// cache services?
const CACHE_KEY = "leads_count_cache";
const CACHE_TTL = 1000 * 60 * 10; // 10 min
const leadsCountCache = new Map();
// 🔥 helpers
const getLocalCache = () => {
  try {
    return JSON.parse(localStorage.getItem(CACHE_KEY)) || {};
  } catch {
    return {};
  }
};

const setLocalCache = (key, value) => {
  const cache = getLocalCache();
  cache[key] = {
    value,
    timestamp: Date.now(),
  };
  localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
};

//industry chart
export const fetchLeadsCount = async (filters = []) => {
  // 🔥 Stable cache key (prevents order issues)
  const cacheKey = JSON.stringify(
    filters.map((f) => ({
      ...f,
      value: Array.isArray(f.value) ? [...f.value].sort() : f.value,
    }))
  );

  // ✅ 1. MEMORY CACHE
  const cached = leadsCountCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.value;
  }

  // ✅ 2. LOCAL STORAGE CACHE
  const localCache = getLocalCache();
  const localItem = localCache[cacheKey];

  if (localItem && Date.now() - localItem.timestamp < CACHE_TTL) {
    leadsCountCache.set(cacheKey, localItem);
    return localItem.value;
  }

  // 🔥 3. API CALL
  const token = localStorage.getItem("auth_token");

  const DATE_TYPES = [
    "today",
    "yesterday",
    "currentMonth",
    "lastMonth",
    "lastSevenDays", // ✅ FIXED
    "between",
    "before",
    "after",
  ];

  const query = filters
    .map((f, i) => {
      let q = `whereGroup[${i}][type]=${f.type}&whereGroup[${i}][attribute]=${f.attribute}`;

      // ✅ value handling
      if (Array.isArray(f.value)) {
        f.value.forEach((v) => {
          q += `&whereGroup[${i}][value][]=${encodeURIComponent(v)}`;
        });
      } else if (f.value != null && f.value !== "") {
        q += `&whereGroup[${i}][value]=${encodeURIComponent(f.value)}`;
      }

      // ✅ dateTime flag (based on backend support)
      if (DATE_TYPES.includes(f.type)) {
        q += `&whereGroup[${i}][dateTime]=true`;
      }

      return q;
    })
    .join("&");

  const url = `https://gateway.aajneetiadvertising.com/Lead?${query}&maxSize=1`;

  const res = await fetch(url, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      token,
    },
  });

  if (!res.ok) {
    const errorText = await res.text();
    console.error("❌ API Error:", res.status, errorText);

    if (res.status === 401 || res.status === 403) {
      localStorage.clear();
      window.location.href = "/login";
    }

    throw new Error("Failed to fetch leads count");
  }

  const data = await res.json();
  const total = data.total || 0;

  // ✅ SAVE CACHE
  const cacheEntry = {
    value: total,
    timestamp: Date.now(),
  };

  leadsCountCache.set(cacheKey, cacheEntry);
  setLocalCache(cacheKey, total);

  return total;
};

export const fetchLeads = async ({ limit = 100, page = 1 }) => {
  const token = localStorage.getItem("auth_token");

  const offset = (page - 1) * limit; // ✅ FIX

  const res = await fetch(
    `https://gateway.aajneetiadvertising.com/Lead?maxSize=${limit}&offset=${offset}`,
    {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        token,
      },
    }
  );

  if (!res.ok) {
    console.log("STATUS:", res.status);
    if (res.status === 401 || res.status === 403) {
      localStorage.clear();
      window.location.href = "/login";
    }
    throw new Error("Failed to fetch leads");
  }

  return await res.json();
};
export const fetchNewLeads = async ({ limit, page, filters = {} }) => {
  const token = localStorage.getItem("auth_token");
  const offset = (page - 1) * limit;

  let where = [];


  // ✅ DATE FILTER
  if (filters.dateType) {
    const type = filters.dateType;

    switch (type) {
      // ✅ simple types
      case "today":
      case "lastSevenDays":
      case "currentMonth":
      case "lastMonth":
      case "nextMonth":
      case "currentQuarter":
      case "lastQuarter":
      case "currentYear":
      case "lastYear":
      case "past":
      case "future":
      case "ever":
      case "isEmpty":
        where.push({
          type,
          attribute: "createdAt",
          dateTime: true,
        });
        break;

      case "on":
      case "before":
      case "after":
        if (filters.closeDateFrom) {
          where.push({
            type,
            attribute: "createdAt",
            value: filters.closeDateFrom,
            dateTime: true,
          });
        }
        break;

      case "between":
        if (filters.closeDateFrom && filters.closeDateTo) {
          where.push({
            type,
            attribute: "createdAt",
            value: [filters.closeDateFrom, filters.closeDateTo],
            dateTime: true,
          });
        }
        break;

      case "lastXDays":
      case "afterXDays":
        if (filters.xDays) {
          where.push({
            type,
            value: filters.xDays,
          });
        }
        break;
    }
  }

  // ✅ OTHER FILTERS
  if (filters.search) {
    where.push({
      type: "like",
      attribute: "name",
      value: `%${filters.search}%`,
    });
  }

  if (filters.status) {
    where.push({
      type: "equals",
      attribute: "status",
      value: filters.status,
    });
  }

  if (filters.source) {
    where.push({
      type: "equals",
      attribute: "source",
      value: filters.source,
    });
  }
  if (filters.sector) {
    where.push({
      type: "equals",
      attribute: "cSector",
      value: filters.sector,
    });
  }

  if (filters.assignUser) {
    where.push({
      type: "equals",
      attribute: "assignedUserId",
      value: filters.assignUser,
    });
  }

  // ✅ QUERY BUILDER (FIXED)
  const query = where
    .map((f, i) => {
      let q = `whereGroup[${i}][type]=${f.type}`;

      // 🔥 ALWAYS ensure attribute for safety (backend crash fix)
      const attribute = f.attribute || "createdAt";
      q += `&whereGroup[${i}][attribute]=${attribute}`;

      // value
      if (Array.isArray(f.value)) {
        f.value.forEach((v) => {
          q += `&whereGroup[${i}][value][]=${encodeURIComponent(v)}`;
        });
      } else if (f.value !== undefined && f.value !== "") {
        q += `&whereGroup[${i}][value]=${encodeURIComponent(f.value)}`;
      }

      // 🔥 ensure datetime for date filters
      if (
        f.dateTime ||
        [
          "today",
          "lastSevenDays",
          "currentMonth",
          "lastMonth",
          "between",
          "before",
          "after",
        ].includes(f.type)
      ) {
        q += `&whereGroup[${i}][dateTime]=true`;
      }

      return q;
    })
    .join("&");

  const baseUrl = `https://gateway.aajneetiadvertising.com/Lead?maxSize=${limit}&offset=${offset}&orderBy=createdAt&order=desc`;

  const url = query ? `${baseUrl}&${query}` : baseUrl;

  console.log("FINAL API:", url);

  const res = await fetch(url, {
    headers: {
      "Content-Type": "application/json",
      token,
    },
  });

  if (!res.ok) {
    console.error("API FAILED:", res.status);
    throw new Error("Failed to fetch leads");
  }

  return await res.json();
};
export const fetchLeadsById = async (id) => {
  const token = localStorage.getItem("auth_token");
  console.log("AUTH TOKEN:", token); // 🔍 debug
  const res = await fetch(`https://gateway.aajneetiadvertising.com/Lead/${id}`, {
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
    throw new Error("Failed to fetch accounts by id");
  }
  return await res.json();
};

export const createLead = async (payload) => {
  console.log(payload);
  const token = localStorage.getItem("auth_token");
  const res = await fetch("https://gateway.aajneetiadvertising.com/Lead", {
    method: "POST",
    headers: { "Content-Type": "application/json", token: token },

    body: JSON.stringify(payload),
  });
  const text = await res.text();
  if (!res.ok) {
    console.error("API ERROR:", text);
    throw new Error("Lead is not created", text);
  }
  // EspoCRM returns array
  return text ? JSON.parse(text) : null;
};

export const updateLead = async (id, payload) => {
  const token = localStorage.getItem("auth_token");
  console.log(id, payload);
  const res = await fetch(
    `https://gateway.aajneetiadvertising.com/Lead/${id}`,
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
    throw new Error(text || "Lead update failed");
  }

  return text ? JSON.parse(text) : null;
};

export const deleteLead = async (id) => {
  const token = localStorage.getItem("auth_token");
  const res = await fetch(
    `https://gateway.aajneetiadvertising.com/Lead/${id}`,
    {
      method: "DELETE",
      headers: { "Content-Type": "application/json", token: token },
    }
  );
  if (!res.ok) {
    throw new Error("Failed to delete contact");
  }
  return res.json();
};
export const bulkDeleteleads = async (ids = []) => {
  return Promise.all(ids.map((id) => deleteLead(id)));
};

// --------------Stream-----------
//fetch by Streams
export const leadStreamById = async (id) => {
  console.log(id);
  const token = localStorage.getItem("auth_token");
  console.log("AUTH TOKEN:", token); // 🔍 debug
  const res = await fetch(
    `https://gateway.aajneetiadvertising.com/Lead/${id}/stream`,
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
    if (res.status === 401 || res.status === 403) {
      localStorage.clear();
      window.location.href = "/login";
    }
    throw new Error("Failed to fetch User's stream");
  }
  return await res.json();
};
export const updateStream = async (id, payload) => {
  console.log(id);
  const token = localStorage.getItem("auth_token");
  console.log("AUTH TOKEN:", token); // 🔍 debug
  const res = await fetch(
    `https://gateway.aajneetiadvertising.com/Lead/${id}/stream`,
    {
      method: "POST",
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
    if (res.status === 401 || res.status === 403) {
      localStorage.clear();
      window.location.href = "/login";
    }
    throw new Error("Failed to fetch User's stream");
  }
  return await res.json();
};

//delete activity with notes api
export const deleteActivity = async (id) => {
  const token = localStorage.getItem("auth_token");
  const res = await fetch(
    `https://gateway.aajneetiadvertising.com/Note/${id}`,
    {
      method: "DELETE",
      headers: { "Content-Type": "application/json", token: token },
    }
  );
  if (!res.ok) {
    throw new Error("Failed to delete Activity");
  }
  return res.json();
};

//create strean
export const createLeadActivity = async (payload) => {
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

export const leadActivitesById = async (id) => {
  console.log(id);
  const token = localStorage.getItem("auth_token");
  console.log("AUTH TOKEN:", token); // 🔍 debug
  const res = await fetch(
    `https://gateway.aajneetiadvertising.com/Activities/Lead/${id}/activities`,
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
    if (res.status === 401 || res.status === 403) {
      localStorage.clear();
      window.location.href = "/login";
    }
    throw new Error("Failed to fetch User's Activties");
  }
  return await res.json();
};


// fetch task by lead id
export const fetchLeadTask = async (id) => {
  console.log(id);
  const token = localStorage.getItem("auth_token");
  console.log("AUTH TOKEN:", token); // 🔍 debug
  const res = await fetch(
    `https://gateway.aajneetiadvertising.com/Lead/${id}/tasks`,
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
    if (res.status === 401 || res.status === 403) {
      localStorage.clear();
      window.location.href = "/login";
    }
    throw new Error("Failed to fetch task for this lead");
  }
  return await res.json();
};
export const createLeadTask = async (id) => {
  console.log(id);
  const token = localStorage.getItem("auth_token");
  console.log("AUTH TOKEN:", token); // 🔍 debug
  const res = await fetch(
    `https://gateway.aajneetiadvertising.com/Lead/${id}/tasks`,
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
    if (res.status === 401 || res.status === 403) {
      localStorage.clear();
      window.location.href = "/login";
    }
    throw new Error("Failed to fetch task for this lead");
  }
  return await res.json();
};