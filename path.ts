/**
 * path.ts provides path joining for use browser-side.
 */

/**
 * join accepts one or more path parts and returns a resolved path string.
 */
export function join(...parts: string[]): string {
  const rootPath = parts.length > 0 && parts[0].indexOf("/") === 0;

  const normalizedParts: string[] = [];
  for (const part of parts) {
    normalizedParts.push(...`${part}`.split("/"));
  }

  const result: string[] = [];
  for (const part of normalizedParts) {
    if (part === "..") {
      if (result.length > 0) {
        result.pop();
      } else {
        result.push(part);
      }
    } else if (part === ".") {
      // stay in same directory
    } else if (part !== "") {
      result.push(part);
    }
  }

  return rootPath ? "/" + result.join("/") : result.join("/");
}
