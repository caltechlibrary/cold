/**
 * client_api.ts provides the browser side API for interactive dataset API via the COLD web service.
 * That in turn wraps the datasetd JSON API via ts_dataset.ts.
 */

/**
 * ClientAPI wraps the browser facing web service and handles retrieving information about peoples, groups, etc.
 */
export class ClientAPI {
  baseUrl: string = "../";

  constructor(baseUrl?: string) {
    (baseUrl === undefined) ? "" : this.baseUrl = baseUrl;
  }

  joinUrlPath(baseUrl: string | URL, path: string): string {
    // Resolve relative baseUrl against the full page URL (including path) so that
    // relative paths like "../" correctly resolve under a sub-path like /cold/.
    const url = typeof baseUrl === "string" && !/^([a-z]+:)?\/\//i.test(baseUrl)
      ? new URL(baseUrl, window.location.href)
      : new URL(baseUrl);
    // Remove leading slashes from the path to avoid double slashes
    const normalizedPath = path.replace(/^\/+/, "");
    // Combine the base URL's pathname with the normalized path
    const combinedPath = `${url.pathname}/${normalizedPath}`.replace(
      /\/\/+/g,
      "/",
    );
    // Construct the new URL
    const newUrl = new URL(url.origin + combinedPath);
    return newUrl.toString();
  }

  async getStringList(
    c_name: string,
    query_name: string,
    params?: URLSearchParams,
  ): Promise<string[]> {
    const base_url = this.joinUrlPath(
      this.baseUrl,
      `/api/${c_name}/${query_name}`,
    );
    let uri: string = base_url;
    let resp: Response;
    if (params !== undefined) {
      uri = `${base_url}?${params}`;
    }
    try {
      resp = await fetch(uri, {
        headers: { "Content-Type": "application/json" },
        method: "GET",
      });
    } catch (err) {
      return [];
    }
    if (resp.ok) {
      const src = await resp.text();
      if (src !== undefined && src !== "") {
        let l: string[] = [];
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

  getParamNames(params?: URLSearchParams | null): string[] {
    return params ? Array.from(params.keys()) : [];
  }

  async getList(
    c_name: string,
    query_name: string,
    params?: URLSearchParams,
  ): Promise<{ [key: string]: any }[]> {
    // Get an ordered list of parameters as an array of [key, value] pairs
    const fieldList = this.getParamNames(params);

    const base_url = this.joinUrlPath(
      this.baseUrl,
      `/api/${c_name}/${query_name}`,
    );

    let uri: string = base_url;
    if (fieldList.length > 0) {
      uri = `${base_url}/${fieldList.join("/")}?${params!.toString()}`;
    }
    try {
      const resp = await fetch(uri, {
        headers: { "Content-Type": "application/json" },
        method: "GET",
      });

      if (!resp.ok) {
        return [];
      }

      const src = await resp.text();
      if (src !== undefined && src !== "") {
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
  async getGroupsList(): Promise<{ clgid: string; group_name: string }[]> {
    const c_name = "groups";
    const query_name = "group_names";
    return await this.getList(c_name, query_name) as {
      clgid: string;
      group_name: string;
    }[];
  }

  /**
   * getPeopleList returns an array of clpid and group names.  If list can't be retrieved
   * then an empty list is return.
   * @returns an array of objects consisting of clgid and group name.
   */
  async getPeopleList(): Promise<
    { clpid: string; family_name: string; given_name: string; orcid: string }[]
  > {
    const c_name = "people";
    const query_name = "people_names";
    return await this.getList(c_name, query_name) as {
      clpid: string;
      family_name: string;
      given_name: string;
      orcid: string;
    }[];
  }

  async lookupGroupName(name: string): Promise<
    { clgid: string; group_name: string }[]
  > {
    const c_name = "groups.ds";
    const query_name = "lookup_name";
    let params = new URLSearchParams();
    params.append("q", name + "%");
    params.append("alternate", name + "%");
    return await this.getList(c_name, query_name, params) as {
      clgid: string;
      group_name: string;
    }[];
  }

  async lookupGroupMembership(clgid: string): Promise<
    { clgid: string; name: string; ok: boolean; msg: string }[]
  > {
    const c_name = "people.ds";
    const query_name = "lookup_clgid";
    let params = new URLSearchParams();
    params.append("q", clgid);
    return await this.getList(c_name, query_name, params) as {
      clgid: string;
      name: string;
      ok: boolean;
      msg: string;
    }[];
  }

  async getROR(ror: string): Promise<{ [key: string]: any }> {
    const c_name = "ror.ds";
    const query_name = "get_ror";
    let params = new URLSearchParams();
    params.append("q", ror);
    return await this.getList(c_name, query_name, params) as {
      obj: { [key: string]: any };
      ok: boolean;
      msg: string;
    }[];
  }

  async lookupRORByName(
    funder_name: string,
  ): Promise<{ ror: string; name: string; ok: boolean; msg: string }[]> {
    const c_name = "ror.ds";
    const query_name = "lookup_ror_by_name";
    let params = new URLSearchParams();
    params.append("q", funder_name);
    return await this.getList(c_name, query_name, params) as {
      ror: string;
      name: string;
      ok: boolean;
      msg: string;
    }[];
  }

  async lookupRORByAcronym(
    acronym: string,
  ): Promise<{ ror: string; name: string; ok: boolean; msg: string }[]> {
    const c_name = "ror.ds";
    const query_name = "lookup_ror_by_acronym";
    let params = new URLSearchParams();
    params.append("q", acronym);
    return await this.getList(c_name, query_name, params) as {
      ror: string;
      name: string;
      ok: boolean;
      msg: string;
    }[];
  }
}
