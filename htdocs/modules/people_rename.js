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

// people_rename.ts
var clientAPI = new ClientAPI();
function renderPersonDetails(p) {
  const parts = [];
  const name = p.display_name || `${p.family_name ?? ""}${p.given_name ? ", " + p.given_name : ""}`;
  parts.push(`<h2>${name}</h2>`);
  if (p.clpid) {
    const idDisplay = p.include_in_feeds ? `<a href="https://feeds.library.caltech.edu/people/${p.clpid}" target="_blank">${p.clpid}</a>` : `${p.clpid}`;
    parts.push(`<div class="identifier">Caltech Library ID: ${idDisplay}</div>`);
  }
  if (p.bio) parts.push(`<div class="bio">BIO: ${p.bio}</div>`);
  if (p.division) {
    parts.push(`<div class="division">Division: ${p.division}</div>`);
  }
  const groups = p.groups;
  if (groups && groups.length > 0) {
    const items = groups.map((g) => g.clgid ? `<li><a href="../groups/${g.clgid}">${g.group_name}</a></li>` : `<li>${g.group_name}</li>`).join("");
    parts.push(`<div class="groups">Groups:<ul>${items}</ul></div>`);
  }
  if (p.clpid) {
    parts.push(`<p>Search <a href="https://authors.library.caltech.edu/search?q=metadata.creators.person_or_org.identifiers.identifier%3A%22${p.clpid}%22" target="_blank">@CaltechAUTHORS</a></p>`);
  }
  if (p.orcid) {
    parts.push(`<div class="orcid">ORCID: <a href="https://orcid.org/${p.orcid}" target="_blank">${p.orcid}</a></div>`);
  }
  if (p.authors_id) {
    parts.push(`<div class="authors_id">CaltechAUTHORS ID: ${p.authors_id}</div>`);
  }
  if (p.thesis_id) {
    parts.push(`<div class="thesis_id">CaltechTHESIS ID: ${p.thesis_id}</div>`);
  }
  if (p.advisors_id) {
    parts.push(`<div class="advisors_id">CaltechTHESIS Advisor ID: ${p.advisors_id}</div>`);
  }
  if (p.email) parts.push(`<div class="email">Email: ${p.email}</div>`);
  const affiliations = [];
  if (p.caltech) {
    affiliations.push(`<li class="is_caltech">Active Caltech</li>`);
  }
  if (p.jpl) affiliations.push(`<li class="is_jpl">Active JPL</li>`);
  parts.push(`<div class="active-affiliations">Institute Affiliation(s):<ul>${affiliations.join("")}</ul></div>`);
  const types = [];
  if (p.faculty) types.push(`<li class="is_faculty">Faculty</li>`);
  if (p.staff) types.push(`<li class="is_staff">Staff</li>`);
  if (p.alumn) types.push(`<li class="is_alumn">Alumn</li>`);
  if (p.postdoc) types.push(`<li class="is_postdoc">Postdoc</li>`);
  if (p.visitor) types.push(`<li class="is_visitor">Visitor</li>`);
  if (p.retired) types.push(`<li class="is_retired">Retired</li>`);
  if (p.emeritus) types.push(`<li class="is_emeritus">Emeritus</li>`);
  parts.push(`<div class="type-affiliation">Affiliation Type(s):<ul>${types.join("")}</ul></div>`);
  const givenName = p.given_name ?? "";
  const familyName = p.family_name ?? "";
  const feedsStatus = p.include_in_feeds ? `${givenName} ${familyName} is included in feeds` : `${givenName} ${familyName} is NOT included in feeds`;
  parts.push(`<div class="included-in-feeds">${feedsStatus}</div>`);
  if (p.updated) {
    parts.push(`<div class="updated">Record Updated: ${p.updated}</div>`);
  }
  if (p.internal_notes) {
    parts.push(`<div class="internal-notes"><strong>Internal Notes:</strong><pre>${String(p.internal_notes).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")}</pre></div>`);
  }
  return parts.join("\n");
}
document.addEventListener("focusout", async (event) => {
  const target = event.target;
  if (target.id !== "old_clpid") return;
  const oldClpidElem = document.getElementById("old_clpid");
  const newClpidElem = document.getElementById("new_clpid");
  const submitElem = document.getElementById("rename_submit");
  const detailsDiv = document.getElementById("person_details");
  const clpid = oldClpidElem?.value.trim() ?? "";
  if (clpid === "") {
    if (newClpidElem) newClpidElem.disabled = true;
    if (submitElem) submitElem.disabled = true;
    if (detailsDiv) detailsDiv.innerHTML = "";
    return;
  }
  const results = await clientAPI.lookupPersonByClpid(clpid);
  if (results && results.length > 0) {
    const person = results[0];
    if (detailsDiv) {
      detailsDiv.style.color = "";
      detailsDiv.innerHTML = renderPersonDetails(person);
    }
    if (newClpidElem) {
      newClpidElem.disabled = false;
      newClpidElem.focus();
    }
    if (submitElem) submitElem.disabled = false;
  } else {
    if (detailsDiv) {
      detailsDiv.style.color = "red";
      detailsDiv.textContent = "Person ID not found.";
    }
    if (newClpidElem) newClpidElem.disabled = true;
    if (submitElem) submitElem.disabled = true;
  }
});
