import * as mdt from "../modules/mdt.js";
import { ClientAPI } from "../modules/client_api.js";
import { getORCIDNames } from "../modules/orcid_api.js";

//import * as path from './path.js';

/*might not need this after all
//NOTE: We need to caculate the path to the application root, not windows.location root.
//people_edit.js is called from people_edit page so we need move up two directories to
//finc the root.
const apiPath = path.join(window.location.pathname, '..', '..');
console.log(`DEBUG API path -> ${apiPath} <-- ${window.location}`)
*/

const clientAPI = new ClientAPI();

let displayNameElem = document.getElementById('display_name'),
  familyNameElem = document.getElementById('family_name'),
  givenNameElem = document.getElementById('given_name'),
  orcidElem = document.getElementById("orcid"),
  rorElem = document.getElementById("ror"),
  isniElem = document.getElementById("isni"),
  lcnafElem = document.getElementById("lcnaf"),
  viafElem = document.getElementById("viaf"),
  snacElem = document.getElementById("snac"),
  groupsElem = document.getElementById("groups");


orcidElem.addEventListener("change", async function (evt) {
  let val = orcidElem.value;
  if (val === undefined || val === '') {
	  return;
  }
  if (mdt.validateORCID(val)) {
    orcidElem.value = mdt.normalizeORCID(val);
  }
  // Check if names need to be updated from ORCID record
  if (familyNameElem.value === "" || givenNameElem.value === "" || displayNameElem.value === "") {
    let obj = await getORCIDNames(orcidElem.value);
    (displayNameElem.value === '') ? displayNameElem.value = obj.display_name : '';
    (familyNameElem.value === '') ? familyNameElem.value = obj.family_name : '';
    (givenNameElem.value === '') ? givenNameElem.value = obj.given_name: '';
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

async function updateRowGroupID(event) {
  /*
  console.log(
    `DEBUG %cevent.detail -> ${JSON.stringify(event.detail, null, 2)}`,
    "color: magenta",
  );
  */
  // Do we have an interesting event?
  if (event.detail === undefined) {
    return;
  }
  // What row are we working with?
  const row = event.detail.rowIndex || 0;
  const col = event.detail.colIndex || 0;
  if (col === 1) {
    // Check if we have a clpid populated.
    let clgid = (event.detail.value === undefined) ? '' : event.detail.value.trim();
    if (clgid === '') {
      const groupName = groupsElem.getCellValue(row, 0);
      if (groupName === '') {
        return;
      }
      const objList = await clientAPI.lookupGroupName(groupName);
      for (const obj of objList) {
        if (obj.group_name === groupName) {
          groupsElem.setCellValue(row, 1, obj.clgid)
          return;
        }
      }
      return;
    }
  }
}

groupsElem.addEventListener('focused', async function (event) {
  await updateRowGroupID(event)
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

async function updateGroupNameList(csvData) {
  let groupNames = [];
  // Get the list of group names and build a options for the autocomplete datalist

  const objList = await clientAPI.getList("groups.ds", "group_names");
  if (objList.length > 0 ) {
    for (const obj of objList) {
      groupNames.push({"value": obj.group_name});
    }
  } 
  if (groupNames.length > 0) {
    csvData.setAutocomplete(0, groupNames);
  }
};

document.addEventListener('DOMContentLoaded', async function(event) {
	await updateGroupNameList(groupsElem);
  // Once the DOM is setup we can add our  cleanup filter element to groupsElem.
  groupsElem.customCleanupFilter = (row) => {
    const cells = row.querySelectorAll('input');
    for (let cell of cells) {
      if (cell.value.trim() === "") {
        return false;
      }
    }
    return true;
  };
});

peopleEditForm.addEventListener("submit", async function (event) {
  event.preventDefault();
  let formData = new FormData(this);
  const groupData = groupsElem.toCSV();
  console.log(`DEBUG setting formData.groups to ${groupData}`);
  formData.set("groups", groupData);
  for (let v of formData.entries()) {
    console.log(`%cDEBUG form elements -> ${v}`, "color: green");
  }

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
