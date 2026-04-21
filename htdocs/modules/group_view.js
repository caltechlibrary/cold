// client_api.ts
var ClientAPI = class {
  baseUrl = "../";
  constructor(baseUrl) {
    baseUrl === void 0 ? "" : this.baseUrl = baseUrl;
  }
  joinUrlPath(baseUrl, path) {
    const url = typeof baseUrl === "string" && !/^([a-z]+:)?\/\//i.test(baseUrl) ? new URL(baseUrl, window.location.origin) : new URL(baseUrl);
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
    params.append("q", name);
    params.append("alternate", name);
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
};

// group_view.ts
var clientAPI = new ClientAPI();
function getClgidFromPath() {
  const parts = window.location.pathname.split("/");
  return parts[parts.length - 1];
}
async function renderGroupMembers(groupMembersElem, clgid, api) {
  const objList = await api.lookupGroupMembership(clgid);
  groupMembersElem.innerHTML = "";
  if (objList.length > 0) {
    groupMembersElem.insertAdjacentHTML("beforeend", `<p>(${objList.length} people)</p>`);
    for (const obj of objList) {
      const clpid = obj.clpid;
      const name = `${obj.family_name}, ${obj.given_name}`;
      const liElem = document.createElement("li");
      const anchorElem = document.createElement("a");
      anchorElem.href = `../people/${clpid}`;
      anchorElem.title = `view ${name}'s page`;
      anchorElem.innerText = name;
      liElem.appendChild(anchorElem);
      groupMembersElem.appendChild(liElem);
    }
  }
}
function renderAlternativeNames(alternativeElem) {
  const names = alternativeElem.innerHTML.split(/\n/g).filter((n) => n.trim() !== "");
  if (names.length > 0) {
    const ul = document.createElement("ul");
    ul.style.listStyleType = "none";
    for (const name of names) {
      const li = document.createElement("li");
      li.innerHTML = name;
      ul.appendChild(li);
    }
    alternativeElem.appendChild(ul);
  }
}
document.addEventListener("DOMContentLoaded", async function() {
  const groupMembersElem = document.getElementById("group-members");
  const alternativeElem = document.getElementById("alternative");
  const clgid = getClgidFromPath();
  if (groupMembersElem !== null) {
    await renderGroupMembers(groupMembersElem, clgid, clientAPI);
  }
  if (alternativeElem !== null) {
    renderAlternativeNames(alternativeElem);
  }
});
export {
  renderAlternativeNames,
  renderGroupMembers
};
