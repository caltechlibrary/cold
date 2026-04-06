/**
 * validator.ts holds validation functions for COLD's parameterized report requests.
 * It is implemented so that it can be used by server side in cold_reports.ts and browser side in htdocs/modules/validator.js.
 */

export function isValidClpid(clpid: string): boolean {
  //  const normalized = clpid.normalize("NFC");
  //  const pattern = /^[\p{L}\p{M}.()']+(?:-+[\p{L}\p{M}.()']+)*(?:-|\.)?$/u;
  //  return pattern.test(normalized);
  const pattern = /^[^\s\d]+(?:-[^\s\d]+)*(?:-|\.)?$/u;
  return pattern.test(clpid);
}
