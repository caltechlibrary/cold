/**
 * client_api.ts provides  the browser side API for interactive dataset API. It wraps the datasetd JSON API via ts_dataset.ts.
 */
import  { DatasetApiClient } from 'https://caltechlibrary.github.io/ts_dataset/mod.ts';

export class ColdClient {
    port: number = 8112;

    constructor(port?: number | undefined) {
        (port === undefined || isNaN(port)) ? '' : this.port = port;
    }

    async getList(c_name: string, query_name: string,  params?: URLSearchParams): Promise<{[key: string]: any}[]> {
        const base_url = `https://localhost:${this.port}/api/${c_name}/${query_name}`;
        let uri: string = base_url;
        let resp: Response;
        if (params !== undefined) {
            uri = `${base_url}?${params}`;
        }
        try {
            resp = await fetch(uri, { headers: { 'Content-Type': 'application/json'}, method: 'GET'});             
        } catch (err) {
            return [];
        }
        if  (resp.ok) {
            const src = await resp.text();
            if (src !== undefined && src !== '') {
                let l: {clgid: string,  group_name: string}[] = [];
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

    /**
     * getGroupsList returns an array of clgid and group names.  If list can't be retrieved
     * then an empty list is return.
     * @returns an array of objects consisting of clgid and group name.
     */
    async getGroupsList(): Promise<{clgid: string, group_name: string  }[]> {
        const c_name = 'groups.ds';
        const query_name = 'group_names';
        return await this.getList(c_name, query_name) as {clgid: string, group_name: string  }[];
    }

    /**
     * getPeopleList returns an array of clpid and group names.  If list can't be retrieved
     * then an empty list is return.
     * @returns an array of objects consisting of clgid and group name.
     */
    async getPeopleList(): Promise<{ clpid: string, family_name: string, given_name: string, orcid:  string }[]> {
        const c_name = 'people.ds';
        const query_name = 'people_names';
        return await this.getList(c_name, query_name) as { clpid: string, family_name: string, given_name: string, orcid:  string }[];
    }
}
