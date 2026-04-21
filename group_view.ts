// group_view.ts provides the browser side TypeScript for the group view page.
// It fetches group membership via the ClientAPI and renders the member list,
// and formats the alternative names section.

import { ClientAPI } from "./client_api.ts";

const clientAPI = new ClientAPI();

function getClgidFromPath(): string {
  const parts = window.location.pathname.split("/");
  return parts[parts.length - 1];
}

export async function renderGroupMembers(
  groupMembersElem: HTMLElement,
  clgid: string,
  api: ClientAPI,
): Promise<void> {
  const objList = await api.lookupGroupMembership(clgid);
  groupMembersElem.innerHTML = "";
  if (objList.length > 0) {
    groupMembersElem.insertAdjacentHTML(
      "beforeend",
      `<p>(${objList.length} people)</p>`,
    );
    for (const obj of objList) {
      const clpid = obj.clpid as string;
      const name = `${obj.family_name}, ${obj.given_name}`;
      const liElem = document.createElement("li");
      const anchorElem = document.createElement("a");
      anchorElem.href = `../people/${clpid}`;
      anchorElem.title = `view ${name}'s page`;
      anchorElem.innerText = name;
      liElem.appendChild(anchorElem);
      groupMembersElem.appendChild(liElem);
    }
  }
}

export function renderAlternativeNames(alternativeElem: HTMLElement): void {
  const names = alternativeElem.innerHTML.split(/\n/g).filter((n) =>
    n.trim() !== ""
  );
  if (names.length > 0) {
    const ul = document.createElement("ul");
    ul.style.listStyleType = "none";
    for (const name of names) {
      const li = document.createElement("li");
      li.innerHTML = name;
      ul.appendChild(li);
    }
    alternativeElem.appendChild(ul);
  }
}

document.addEventListener("DOMContentLoaded", async function () {
  const groupMembersElem = document.getElementById("group-members");
  const alternativeElem = document.getElementById("alternative");
  const clgid = getClgidFromPath();

  if (groupMembersElem !== null) {
    await renderGroupMembers(groupMembersElem, clgid, clientAPI);
  }
  if (alternativeElem !== null) {
    renderAlternativeNames(alternativeElem);
  }
});
