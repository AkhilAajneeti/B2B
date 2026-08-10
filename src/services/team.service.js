// ── Teams reference cache ────────────────────────────────────────────────
// Team list is org reference data pulled on many pages/drawers. Same approach
// as the users cache in user.service.js: store the whole result in localStorage
// (per logged-in user) and reuse it for a few hours. Cleared on logout, on team
// mutations below, and on a 401 wipe.
const TEAMS_CACHE_TTL = 1000 * 60 * 60 * 6; // 6 hours
const teamsCacheKey = () => {
  try {
    const uid = JSON.parse(localStorage.getItem("login_object"))?.id;
    return `teams_cache_${uid || "guest"}`;
  } catch {
    return "teams_cache_guest";
  }
};
const readTeamsCache = () => {
  try {
    const raw = JSON.parse(localStorage.getItem(teamsCacheKey()));
    if (raw && Date.now() - raw.timestamp < TEAMS_CACHE_TTL) return raw.value;
  } catch {
    /* corrupt / unavailable — refetch */
  }
  return null;
};
const writeTeamsCache = (value) => {
  try {
    localStorage.setItem(
      teamsCacheKey(),
      JSON.stringify({ value, timestamp: Date.now() }),
    );
  } catch {
    /* quota or storage disabled — skip caching */
  }
};
export const clearTeamsCache = () => {
  try {
    localStorage.removeItem(teamsCacheKey());
  } catch {
    /* ignore */
  }
};

export const fetchTeam = async () => {
  const cached = readTeamsCache();
  if (cached) return cached;

  const token = localStorage.getItem("auth_token");
  console.log("AUTH TOKEN:", token); // 🔍 debug
  const res = await fetch("https://gateway.aajneetiadvertising.com/Team", {
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
    throw new Error("Failed to fetch User's");
  }
  const data = await res.json();
  writeTeamsCache(data);
  return data;
}

export const fetchTeamById = async (id) => {
  const token = localStorage.getItem("auth_token");
  console.log("AUTH TOKEN:", token); // 🔍 debug
  const res = await fetch(`https://gateway.aajneetiadvertising.com/team/${id}`, {
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
    throw new Error("Failed to fetch team's by id");
  }
  return await res.json();
}
export const fetchTeamUser = async (id) => {
  const token = localStorage.getItem("auth_token");
  const res = await fetch(`https://gateway.aajneetiadvertising.com/team/${id}/users`, {
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
    throw new Error("Failed to fetch team's by id");
  }
  return await res.json();
}

export const createTeam = async (payload) => {
  const token = localStorage.getItem("auth_token");
  const res = await fetch("https://gateway.aajneetiadvertising.com/team", {
    method: "POST",
    headers: { "Content-Type": "application/json", token: token },

    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    // Read the backend error body so the thrown message is the real reason,
    // not a ReferenceError from the previously-undefined `text`.
    const text = await res.text().catch(() => "");
    throw new Error(text || "Team is not created");
  }
  // EspoCRM returns array
  clearTeamsCache();
  return await res.json();
};

export const updateTeam = async (id, payload) => {
  const token = localStorage.getItem("auth_token");
  
  const res = await fetch(
    `https://gateway.aajneetiadvertising.com/team/${id}`,
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


  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || "Team update failed");
  }

  clearTeamsCache();
  return await res.json();
};


export const deleteTeam = async (id) => {
  const token = localStorage.getItem("auth_token");
  const res = await fetch(
    `https://gateway.aajneetiadvertising.com/team/${id}`,
    {
      method: "DELETE",
      headers: { "Content-Type": "application/json", token: token },
    }
  );
  if (!res.ok) {
    throw new Error("Failed to delete team");
  }
  clearTeamsCache();
  return res.json();
};