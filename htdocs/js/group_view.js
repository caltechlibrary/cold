import { ClientAPI } from "../modules/client_api.js";

const clientAPI = new ClientAPI();

function getViewURL() {
  // Get the protocol (e.g., http: or https:)
  const protocol = window.location.protocol;

  // Get the host (e.g., apps.library.caltech.edu or localhost:8111)
  const host = window.location.host;

  // Get the pathname (e.g., /cold/people/<clpid>)
  const pathname = window.location.pathname;

  // Construct the view people Url
  let viewUrl = `${protocol}//${host}${pathname}`;
  // Log the result
  console.log(viewUrl);
  return viewUrl;
}

document.addEventListener("DOMContentLoaded", async function (event) {
  const groupMembersElem = document.getElementById("group-members");
  const baseUrl = getViewURL();
  const objList = await clientAPI.getList("people.ds", "people_names");
  if (objList.length > 0) {
    for (const obj of objList) {
      const clipid = obj.clpid,
        name = `${obj.family_name}, ${obj.given_name}`,
        peopleLink = `${baseUrl}/people/${clpid}`;
      let liElem = document.createElement("li"),
        anchorElem = document.createElement("a");
      anchorElem.href = peopleLink;
      anchorElem.title = `view ${name}'s page`;
      anchorElem.innerText = name;
      liElem.appendChildElement(anchorElem);
      groupsMembersElem.appendChildElement(liElem);
    }
  }
});
