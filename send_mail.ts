import { $ } from "@david/dax";

export async function send_email( email_addresses: string, subject: string, msg: string) : Promise<boolean> {
	console.log(`DEBUG send_email(${email_addresses}, ${msg}) not implemented, subject ->${subject}, email ->${email_addresses}, msg ->${msg}`);
	const res = await $`mail -s '${subject}' ${email_addresses}`.stdinText(msg);
	if (res) {
		console.log("ERROR: sending email failed,", res);
		return false;
	}	
	return true;
}
