import { ClientAPI } from "../modules/client_api.js";

const clientAPI = new ClientAPI();

document.addEventListener("DOMContentLoaded", async function (event) {
  const groupMembersElem = document.getElementById("group-members");
  const objList = await clientAPI.getList("people.ds", "people_names");
  groupMembersElem.innerHTML = ''; // Clear the element so we can populate it.
  if (objList.length > 0) {
    for (const obj of objList) {
      const clpid = obj.clpid,
        name = `${obj.family_name}, ${obj.given_name}`,
        peopleLink = `../people/${clpid}`;
     //console.log(`DEBUG obj -> ${JSON.stringify(obj)}`);
       console.log(`DEBUG name -> ${name}, clpid -> ${clpid}, peopleLink -> ${peopleLink}`);
      let liElem = document.createElement("li"),
        anchorElem = document.createElement("a");
      anchorElem.href = peopleLink;
      anchorElem.title = `view ${name}'s page`;
      anchorElem.innerText = name;
      liElem.appendChild(anchorElem);
      //groupMembersElem.appendChild(liElem);
    }
  }
});
