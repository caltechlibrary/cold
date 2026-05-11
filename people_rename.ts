import { ClientAPI } from "./client_api.ts";

const clientAPI = new ClientAPI();

function renderPersonDetails(p: Record<string, unknown>): string {
  const parts: string[] = [];

  // Name
  const name = p.display_name ||
    `${p.family_name ?? ""}${p.given_name ? ", " + p.given_name : ""}`;
  parts.push(`<h2>${name}</h2>`);

  // Caltech Library ID
  if (p.clpid) {
    const idDisplay = p.include_in_feeds
      ? `<a href="https://feeds.library.caltech.edu/people/${p.clpid}" target="_blank">${p.clpid}</a>`
      : `${p.clpid}`;
    parts.push(
      `<div class="identifier">Caltech Library ID: ${idDisplay}</div>`,
    );
  }

  // Bio
  if (p.bio) parts.push(`<div class="bio">BIO: ${p.bio}</div>`);

  // Division
  if (p.division) {
    parts.push(`<div class="division">Division: ${p.division}</div>`);
  }

  // Groups
  const groups = p.groups as
    | { group_name: string; clgid: string }[]
    | undefined;
  if (groups && groups.length > 0) {
    const items = groups.map((g) =>
      g.clgid
        ? `<li><a href="../groups/${g.clgid}">${g.group_name}</a></li>`
        : `<li>${g.group_name}</li>`
    ).join("");
    parts.push(`<div class="groups">Groups:<ul>${items}</ul></div>`);
  }

  // Search CaltechAUTHORS
  if (p.clpid) {
    parts.push(
      `<p>Search <a href="https://authors.library.caltech.edu/search?q=metadata.creators.person_or_org.identifiers.identifier%3A%22${p.clpid}%22" target="_blank">@CaltechAUTHORS</a></p>`,
    );
  }

  // Identifiers
  if (p.orcid) {
    parts.push(
      `<div class="orcid">ORCID: <a href="https://orcid.org/${p.orcid}" target="_blank">${p.orcid}</a></div>`,
    );
  }
  if (p.authors_id) {
    parts.push(
      `<div class="authors_id">CaltechAUTHORS ID: ${p.authors_id}</div>`,
    );
  }
  if (p.thesis_id) {
    parts.push(`<div class="thesis_id">CaltechTHESIS ID: ${p.thesis_id}</div>`);
  }
  if (p.advisors_id) {
    parts.push(
      `<div class="advisors_id">CaltechTHESIS Advisor ID: ${p.advisors_id}</div>`,
    );
  }

  // Email
  if (p.email) parts.push(`<div class="email">Email: ${p.email}</div>`);

  // Institute affiliations
  const affiliations: string[] = [];
  if (p.caltech) {
    affiliations.push(`<li class="is_caltech">Active Caltech</li>`);
  }
  if (p.jpl) affiliations.push(`<li class="is_jpl">Active JPL</li>`);
  parts.push(
    `<div class="active-affiliations">Institute Affiliation(s):<ul>${
      affiliations.join("")
    }</ul></div>`,
  );

  // Affiliation types
  const types: string[] = [];
  if (p.faculty) types.push(`<li class="is_faculty">Faculty</li>`);
  if (p.staff) types.push(`<li class="is_staff">Staff</li>`);
  if (p.alumn) types.push(`<li class="is_alumn">Alumn</li>`);
  if (p.postdoc) types.push(`<li class="is_postdoc">Postdoc</li>`);
  if (p.visitor) types.push(`<li class="is_visitor">Visitor</li>`);
  if (p.retired) types.push(`<li class="is_retired">Retired</li>`);
  if (p.emeritus) types.push(`<li class="is_emeritus">Emeritus</li>`);
  parts.push(
    `<div class="type-affiliation">Affiliation Type(s):<ul>${
      types.join("")
    }</ul></div>`,
  );

  // Feeds status
  const givenName = p.given_name ?? "";
  const familyName = p.family_name ?? "";
  const feedsStatus = p.include_in_feeds
    ? `${givenName} ${familyName} is included in feeds`
    : `${givenName} ${familyName} is NOT included in feeds`;
  parts.push(`<div class="included-in-feeds">${feedsStatus}</div>`);

  // Updated
  if (p.updated) {
    parts.push(`<div class="updated">Record Updated: ${p.updated}</div>`);
  }

  return parts.join("\n");
}

document.addEventListener("focusout", async (event: FocusEvent) => {
  const target = event.target as HTMLElement;
  if (target.id !== "old_clpid") return;

  const oldClpidElem = document.getElementById(
    "old_clpid",
  ) as HTMLInputElement | null;
  const newClpidElem = document.getElementById(
    "new_clpid",
  ) as HTMLInputElement | null;
  const submitElem = document.getElementById(
    "rename_submit",
  ) as HTMLInputElement | null;
  const detailsDiv = document.getElementById(
    "person_details",
  ) as HTMLElement | null;

  const clpid = oldClpidElem?.value.trim() ?? "";
  if (clpid === "") {
    if (newClpidElem) newClpidElem.disabled = true;
    if (submitElem) submitElem.disabled = true;
    if (detailsDiv) detailsDiv.innerHTML = "";
    return;
  }

  const results = await clientAPI.lookupPersonByClpid(clpid);
  if (results && results.length > 0) {
    const person = results[0];
    if (detailsDiv) {
      detailsDiv.style.color = "";
      detailsDiv.innerHTML = renderPersonDetails(person);
    }
    if (newClpidElem) {
      newClpidElem.disabled = false;
      newClpidElem.focus();
    }
    if (submitElem) submitElem.disabled = false;
  } else {
    if (detailsDiv) {
      detailsDiv.style.color = "red";
      detailsDiv.textContent = "Person ID not found.";
    }
    if (newClpidElem) newClpidElem.disabled = true;
    if (submitElem) submitElem.disabled = true;
  }
});
