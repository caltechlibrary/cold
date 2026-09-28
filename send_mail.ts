import { $ } from "@david/dax";
import { splitAndValidateEmails } from "./utils.ts";

export async function send_email(
  email_addresses: string,
  subject: string,
  msg: string,
): Promise<boolean> {
  const recipients = splitAndValidateEmails(email_addresses);
  if (recipients.length === 0) {
    console.log(
      `WARNING: no valid recipients in "${email_addresses}", not sending "${subject}"`,
    );
    return false;
  }
  // Bare ${subject} is deliberate -- dax escapes a bare interpolation into a
  // single argument, and wrapping it in quotes breaks that escaping.
  // Recipients as an array, after --, per bsd-mailx's `to-addr ...` and so a
  // recipient beginning "-" is never read as an option.
  const res = await $`mail -s ${subject} -- ${recipients}`.stdinText(msg)
    .noThrow();
  if (res.code !== 0) {
    console.log(
      `ERROR: sending email failed, exit ${res.code}, recipients ${recipients}`,
    );
    return false;
  }
  return true;
}
