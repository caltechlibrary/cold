// orcid_api.ts is a thin wrapper around retrieving a person's ORCID landing pages as JSON.

export async function getORCIDNames(
  orcid: string,
): Promise<{ [key: string]: any } | undefined> {
  // curl -L -H 'Accept: application/json' https://orcid.org/${orcid}
  if (orcid.indexOf("https://orcid.org/") > -1) {
    orcid = orcid.replace(/^https:\/\/orcid.org\//, "");
  }
  const orcidURL: string = `https://orcid.org/${orcid}`;
  const resp = await fetch(orcidURL, {
    "headers": {
      "accept": "application/json",
    },
  });
  if (resp.ok) {
    const rec = await resp.json();
    let family_name: string = "";
    let given_name: string = "";
    let display_name: string = "";
    if (rec.person === undefined) {
      return undefined;
    }
    if (rec.person.name === undefined) {
      return undefined;
    }
    if (
      rec.person.name["given-names"] !== undefined &&
      rec.person.name["given-names"].value !== undefined
    ) {
      given_name = rec.person.name["given-names"].value.trim();
    }
    if (
      rec.person.name["family-name"] !== undefined &&
      rec.person.name["family-name"].value !== undefined
    ) {
      family_name = rec.person.name["family-name"].value;
    }
    if (
      rec.person.name["credit-name"] !== undefined &&
      rec.person.name["credit-name"].value !== undefined
    ) {
      display_name = rec.person.name["credit-name"].value;
    }
    return {
      "display_name": display_name,
      "family_name": family_name,
      "given_name": given_name,
    };
  }
  return undefined;
}
