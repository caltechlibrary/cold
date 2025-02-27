/**
 * path.js provides some path functions for calculating paths browser side.
 */

/**
 * join - accept one or more path returning an updated path.
 * @param parts (string), takes one or more path parts to be joined
 * @returns resolved path as a string
 */
export function join(...parts) {
    // Check to see if first element is starting from the root.
    let rootPath = false;
    ((parts.length > 0) && (`${parts[0]}`.indexOf('/') === 0)) ? rootPath = true : rootPath = false;

    const normalizedParts = [];
    // Normalize our path parts so we can resolve relative path elements.
    for (const part of parts) {
      const pathParts = `${part}`.split('/');
      normalizedParts.push(...pathParts);
    }
  
    const result = [];
    // For each normalized parts decide if they should be included in final result.
    // You can backup beyond the root.
    for (const part of normalizedParts) {
      if (part === '..') {
        // Move up one directory
        if (result.length > 0) {
            result.pop();
        } else {
            result.push(part);
        }
      } else if (part === '.') {
        // Do nothing, stay in the same directory
      } else if (part !== '') {
        // Add the part to the result
        result.push(part);
      }
    }  
    if (rootPath) {
        return '/' + result.join('/');
    }
    return result.join('/');
  }
  