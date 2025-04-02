import { ClientAPI } from "../modules/client_api.js";

const clientAPI = new ClientAPI();

function getClgidFromPath() {
  const parts = window.location.pathname.split('/');
  return parts[parts.length-1];
}

document.addEventListener("DOMContentLoaded", async function (event) {
  const groupMembersElem = document.getElementById("group-members");
  const clgid = getClgidFromPath();
  const objList = await clientAPI.lookupGroupMembership(clgid);

  groupMembersElem.innerHTML = ''; // Clear the element so we can populate it.
  if (objList.length > 0) {
    for (const obj of objList) {
      const clpid = obj.clpid,
        name = `${obj.family_name}, ${obj.given_name}`,
        peopleLink = `../people/${clpid}`,
        liElem = document.createElement("li"),
        anchorElem = document.createElement("a");
      anchorElem.href = peopleLink;
      anchorElem.title = `view ${name}'s page`;
      anchorElem.innerText = name;
      liElem.appendChild(anchorElem);
      groupMembersElem.appendChild(liElem);
    }
  }
});
