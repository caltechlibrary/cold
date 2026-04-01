/**
 * clids.ts holds validation function for COLD's internal identifiers.
 */

export function isValidClpid(clpid: string): boolean {
//  const normalized = clpid.normalize("NFC");
//  const pattern = /^[\p{L}\p{M}.()']+(?:-+[\p{L}\p{M}.()']+)*(?:-|\.)?$/u;
//  return pattern.test(normalized);
  const pattern = /^[^\s\d]+(?:-[^\s\d]+)*(?:-|\.)?$/u;
  return pattern.test(clpid);
}
