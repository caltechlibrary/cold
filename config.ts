import { matchType } from "./deps.ts";

export const apiPort: number = 8112;
export const httpPort: number = 8111;

export interface ConfigInterface {
  debug: boolean;
  htdocs: string;
  /* baseUrl is the URL base path seen by the browser */
  baseUrl: string;
  httpPort: number;
  apiPort: number;
  apiUrl: string;
}

/**
 * ConfigureHandler is a configuration builder for Cold UI.
 */
export class ConfigureHandler {
  debug: boolean = false;
  htdocs: string = "htdocs";
  baseUrl: string = "";
  httpPort: number = httpPort;
  apiPort: number = apiPort;
  apiUrl: string = `http://localhost:${this.apiPort}`;

  /**
   * set will set the configuration attributes suitable to pass around to
   * the variuos handlers.
   * @param {string} key can be either debug, htdocs or apiUrl
   * @param {any} is the value to set. NOTE: the value needs to match
   * the parameter you're setting.
   * @returns {boolean} true on success, false otherwise
   */
  set(key: string, value: any): boolean {
    if (key === "debug") {
      this.debug = matchType(this.debug, value);
      return this.debug !== undefined;
    }
    if (key === "baseUrl") {
      this.baseUrl = matchType(this.baseUrl, value);
    }
    if (key === "htdocs") {
      this.htdocs = matchType(this.htdocs, value);
      return this.htdocs !== undefined;
    }
    if (key === "httpPort") {
      this.httpPort = matchType(this.httpPort, value);
      return this.httpPort !== undefined;
    }
    if (key === "apiUrl") {
      this.apiUrl = matchType(this.apiUrl, value);
      return this.apiUrl !== undefined;
    }
    if (key === "apiPort") {
      this.apiPort = matchType(this.apiPort, value);
      this.apiUrl = `http://localhost:${this.apiPort}`;
      return this.apiPort !== undefined;
    }
    return false;
  }

  /**
   * cfg returns a configuration object suitable to pass to the handlers.
   * @returns {debug: boolean, htdocs: string, apiUrl: string}
   */
  cfg(): ConfigInterface {
    return {
      debug: this.debug,
      baseUrl: this.baseUrl,
      htdocs: this.htdocs,
      httpPort: this.httpPort,
      apiUrl: this.apiUrl,
      apiPort: this.apiPort,
    };
  }
}
