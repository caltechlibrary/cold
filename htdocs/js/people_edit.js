import * as mdt from "../modules/mdt.js";
import { ClientAPI } from "../modules/client_api.js";

//import * as path from './path.js';

/*might not need this after all
//NOTE: We need to caculate the path to the application root, not windows.location root.
//people_edit.js is called from people_edit page so we need move up two directories to
//finc the root.
const apiPath = path.join(window.location.pathname, '..', '..');
console.log(`DEBUG API path -> ${apiPath} <-- ${window.location}`)
*/

const clientAPI = new ClientAPI();

let orcidElem = document.getElementById("orcid"),
  rorElem = document.getElementById("ror"),
  isniElem = document.getElementById("isni"),
  lcnafElem = document.getElementById("lcnaf"),
  viafElem = document.getElementById("viaf"),
  snacElem = document.getElementById("snac"),
  groupsElem = document.getElementById("groups"),
  submitButton = document.getElementById("submit");

orcidElem.addEventListener("change", function (evt) {
  let val = orcidElem.value;
  if (mdt.validateORCID(val)) {
    orcidElem.value = mdt.normalizeORCID(val);
  }
});

rorElem.addEventListener("change", function (evt) {
  let val = rorElem.value;
  if (mdt.validateROR(val)) {
    rorElem.value = mdt.normalizeROR(val);
  }
});

isniElem.addEventListener("change", function (evt) {
  let val = isniElem.value;
  if (mdt.validateISNI(val)) {
    isniElem.value = mdt.normalizeISNI(val);
  }
});

lcnafElem.addEventListener("change", function (evt) {
  let val = lcnafElem.value;
  if (mdt.validateLCNAF(val)) {
    lcnafElem.value = mdt.normalizeLCNAF(val);
  }
});

viafElem.addEventListener("change", function (evt) {
  let val = viafElem.value;
  if (mdt.validateVIAF(val)) {
    viafElem.value = mdt.normalizeVIAF(val);
  }
});

snacElem.addEventListener("change", function (evt) {
  let val = snacElem.value;
  if (mdt.validateSNAC(val)) {
    snacElem.value = mdt.normalizeSNAC(val);
  }
});

groupsElem.addEventListener("change", async function (event) {
  // Do we have an interesting event?
  if (event.detail === undefined) {
    return;
  }
  // What row are we working with?
  let row = event.detail.row;
  console.log(
    `DEBUG %cevent.detail -> ${JSON.stringify(event.detail, null, 2)}`,
    "color: magenta",
  );
  const val = event.detail.value.trim();
  if (val === undefined || val === '') {
    return;
  }
  // Check if clgid has previously been set.
  let clgid = this.getCellValue(row, 2) || "";
  if (clgid !== "") {
    return;
  }
  // OK if we get back a lookup result, pick the first one and update the cell values.
  const objList = await clientAPI.lookupGroupName(val);
  if (objList === undefined || objList.length === 0) {
    console.log(`%cfailed to find group name -> ${val}`, "color: red");
    return;
  }
  const obj = objList[0];
  let group_name = (obj.group_name === undefined || obj.group_name === "")
    ? val
    : obj.group_name;
  if (group_name !== val) {
    console.log(`DEBUG updating cell (${row}, 'group_name') to ${group_name}`);
    this.setCellValue(row, "group_name", group_name);
  }
  clgid = obj.clgid;
  console.log(`DEBUG updating cell (${row}, 'clgid') to ${clgid}`);
  this.setCellValue(row, "clgid", clgid);
});

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

const peopleEditForm = document.getElementById("people_edit");

peopleEditForm.addEventListener("submit", async function (event) {
  let formData = new FormData(this);
  const groupData = groupsElem.innerHTML;
  console.log(`DEBUG setting formData.groups to ${groupData}`);
  formData.set("groups", groupData);
  for (let v of formData.entries()) {
    console.log(`%cDEBUG form elements -> ${v}`, "color: green");
  }
  event.preventDefault(); // DEBUG

  try {
    const response = await fetch(this.action, {
      method: this.method,
      body: formData,
    });

    if (response.ok) {
      console.log(
        `%cDEBUG response.status -> ${response.status}`,
        "color: cyan",
      );
      // Redirect to the View People URL
      window.location.href = getViewURL();
    } else {
      console.error(`Form submission failed with status: ${response.status}`);
    }
  } catch (error) {
    console.error("Error submitting form:", error);
  }
});
