export const fetchProjects = async () => {
    const token = localStorage.getItem("auth_token");
    console.log("AUTH TOKEN:", token); // 🔍 debug
    const res = await fetch("https://gateway.aajneetiadvertising.com/CProjects", {
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
        throw new Error("Failed to fetch projects");
    }
    return await res.json();
};
export const fetchProjectsById = async (id) => {
    const token = localStorage.getItem("auth_token");
    console.log("AUTH TOKEN:", token); // 🔍 debug
    const res = await fetch(`https://gateway.aajneetiadvertising.com/CProjects/${id}`, {
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
        throw new Error("Failed to fetch projects by id");
    }
    return await res.json();
};

export const createProject = async (payload) => {
    console.log(payload);
    const token = localStorage.getItem("auth_token");
    const res = await fetch("https://gateway.aajneetiadvertising.com/CProjects", {
        method: "POST",
        headers: { "Content-Type": "application/json", token: token },

        body: JSON.stringify(payload),
    });
    const text = await res.text();
    if (!res.ok) {
        console.error("API ERROR:", text);
        throw new Error("Project is not created", text);
    }
    // EspoCRM returns array
    return text ? JSON.parse(text) : null;
};

export const updateProject = async (id, payload) => {
    const token = localStorage.getItem("auth_token");
    console.log(id, payload);
    const res = await fetch(
        `https://gateway.aajneetiadvertising.com/CProjects/${id}`,
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
    console.log("response from project.service.js", res);
    if (!res.ok) {
        throw new Error(text || "Project update failed");
    }

    return text ? JSON.parse(text) : null;
};

export const deleteProject = async (id) => {
    const token = localStorage.getItem("auth_token");
    const res = await fetch(
        `https://gateway.aajneetiadvertising.com/CProjects/${id}`,
        {
            method: "DELETE",
            headers: { "Content-Type": "application/json", token: token },
        }
    );
    if (!res.ok) {
        throw new Error("Failed to delete Project");
    }
    return res.json();
};
export const bulkDeleteProject = async (ids = []) => {
    return Promise.all(ids.map((id) => deleteProject(id)));
};
