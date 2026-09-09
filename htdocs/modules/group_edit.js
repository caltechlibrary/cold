// client_api.ts
var ClientAPI = class {
  baseUrl = "../";
  constructor(baseUrl) {
    baseUrl === void 0 ? "" : this.baseUrl = baseUrl;
  }
  joinUrlPath(baseUrl, path) {
    const url = typeof baseUrl === "string" && !/^([a-z]+:)?\/\//i.test(baseUrl) ? new URL(baseUrl, window.location.href) : new URL(baseUrl);
    const normalizedPath = path.replace(/^\/+/, "");
    const combinedPath = `${url.pathname}/${normalizedPath}`.replace(/\/\/+/g, "/");
    const newUrl = new URL(url.origin + combinedPath);
    return newUrl.toString();
  }
  async getStringList(c_name, query_name, params) {
    const base_url = this.joinUrlPath(this.baseUrl, `/api/${c_name}/${query_name}`);
    let uri = base_url;
    let resp;
    if (params !== void 0) {
      uri = `${base_url}?${params}`;
    }
    try {
      resp = await fetch(uri, {
        headers: {
          "Content-Type": "application/json"
        },
        method: "GET"
      });
    } catch (err) {
      return [];
    }
    if (resp.ok) {
      const src = await resp.text();
      if (src !== void 0 && src !== "") {
        let l = [];
        try {
          l = JSON.parse(src);
        } catch (err) {
          return [];
        }
        return l;
      }
    }
    return [];
  }
  getParamNames(params) {
    return params ? Array.from(params.keys()) : [];
  }
  async getList(c_name, query_name, params) {
    const fieldList = this.getParamNames(params);
    const base_url = this.joinUrlPath(this.baseUrl, `/api/${c_name}/${query_name}`);
    let uri = base_url;
    if (fieldList.length > 0) {
      uri = `${base_url}/${fieldList.join("/")}?${params.toString()}`;
    }
    try {
      const resp = await fetch(uri, {
        headers: {
          "Content-Type": "application/json"
        },
        method: "GET"
      });
      if (!resp.ok) {
        return [];
      }
      const src = await resp.text();
      if (src !== void 0 && src !== "") {
        try {
          return JSON.parse(src);
        } catch (err) {
          return [];
        }
      }
    } catch (err) {
      console.log(`ERROR: fetching ${uri}, ${err}`);
      return [];
    }
    return [];
  }
  /**
   * getGroupsList returns an array of clgid and group names.  If list can't be retrieved
   * then an empty list is return.
   * @returns an array of objects consisting of clgid and group name.
   */
  async getGroupsList() {
    const c_name = "groups";
    const query_name = "group_names";
    return await this.getList(c_name, query_name);
  }
  /**
   * getPeopleList returns an array of clpid and group names.  If list can't be retrieved
   * then an empty list is return.
   * @returns an array of objects consisting of clgid and group name.
   */
  async getPeopleList() {
    const c_name = "people";
    const query_name = "people_names";
    return await this.getList(c_name, query_name);
  }
  async lookupGroupName(name) {
    const c_name = "groups.ds";
    const query_name = "lookup_name";
    let params = new URLSearchParams();
    params.append("q", name + "%");
    params.append("alternate", name + "%");
    return await this.getList(c_name, query_name, params);
  }
  async lookupGroupMembership(clgid) {
    const c_name = "people.ds";
    const query_name = "lookup_clgid";
    let params = new URLSearchParams();
    params.append("q", clgid);
    return await this.getList(c_name, query_name, params);
  }
  async getROR(ror) {
    const c_name = "ror.ds";
    const query_name = "get_ror";
    let params = new URLSearchParams();
    params.append("q", ror);
    return await this.getList(c_name, query_name, params);
  }
  async lookupRORByName(funder_name) {
    const c_name = "ror.ds";
    const query_name = "lookup_ror_by_name";
    let params = new URLSearchParams();
    params.append("q", funder_name);
    return await this.getList(c_name, query_name, params);
  }
  async lookupRORByAcronym(acronym) {
    const c_name = "ror.ds";
    const query_name = "lookup_ror_by_acronym";
    let params = new URLSearchParams();
    params.append("q", acronym);
    return await this.getList(c_name, query_name, params);
  }
  async lookupPeopleName(clpid) {
    const params = new URLSearchParams();
    params.append("clpid", clpid);
    return await this.getList("people.ds", "lookup_people_name", params);
  }
  async lookupPersonByClpid(clpid) {
    const params = new URLSearchParams();
    params.append("clpid", clpid);
    return await this.getList("people.ds", "lookup_person_by_clpid", params);
  }
  async validateClpid(clpid) {
    const params = new URLSearchParams();
    params.append("clpid", clpid);
    const results = await this.getList("people.ds", "validate_clpid", params);
    return results.length > 0;
  }
  async validateClgid(clgid) {
    const params = new URLSearchParams();
    params.append("clgid", clgid);
    const results = await this.getList("groups.ds", "validate_clgid", params);
    return results.length > 0;
  }
};

// group_edit.ts
var clientAPI = new ClientAPI();
function slugify(s) {
  return s.replace(/[^\p{L}\p{N}\s()]/gu, "").replace(/\s{2,}/g, " ").trim().replace(/\s/g, "-");
}
async function updateClgid() {
  const clgidElem = document.getElementById("clgid");
  const nameElem = document.getElementById("name");
  if (clgidElem === null || clgidElem.value !== "") return;
  const name = nameElem?.value.trim() ?? "";
  if (name === "") return;
  const proposed = slugify(name);
  if (proposed === "") return;
  const exists = await clientAPI.validateClgid(proposed);
  if (exists) {
    clgidElem.style.borderColor = "red";
    clgidElem.placeholder = `"${proposed}" already exists \u2014 enter a unique clgid`;
  } else {
    clgidElem.style.borderColor = "";
    clgidElem.value = proposed;
  }
}
document.addEventListener("focusout", (event) => {
  const target = event.target;
  if (target.id === "name") {
    updateClgid();
  }
});
var groupEditForm = document.getElementById("group-edit-form");
var alternativeElem = document.getElementById("alternative");
groupEditForm?.addEventListener("submit", async function(event) {
  event.preventDefault();
  const formData = new FormData(groupEditForm);
  if (alternativeElem !== null) {
    formData.set("alternative", alternativeElem.toCSV());
  }
  try {
    const response = await fetch(groupEditForm.action, {
      method: groupEditForm.method,
      body: formData
    });
    if (response.ok) {
      window.location.href = response.url;
    } else {
      console.error(`Form submission failed with status: ${response.status}`);
    }
  } catch (error) {
    console.error("Error submitting form:", error);
  }
});
