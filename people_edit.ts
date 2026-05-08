import * as mdt from "../metadatatools/mod.ts";
import { ClientAPI } from "./client_api.ts";
import { getORCIDNames } from "./orcid_api.ts";

const clientAPI = new ClientAPI();

const groupsElem = document.getElementById("groups") as unknown as {
  toCSV: () => string;
  getCellValue: (row: number, col: number) => string;
  setCellValue: (row: number, col: number, value: string) => void;
  customCleanupFilter: ((row: HTMLElement) => boolean) | null;
  addEventListener: (
    type: string,
    listener: EventListenerOrEventListenerObject,
  ) => void;
  setAutocomplete: (col: number, data: { value: string }[]) => void;
} | null;

// Populate group name datalist for col 0
async function initGroupNameAutocomplete() {
  if (!groupsElem) return;
  const groupData = await clientAPI.getList("groups.ds", "group_names") as {
    clgid: string;
    group_name: string;
  }[];
  groupsElem.setAutocomplete(
    0,
    groupData.map((g) => ({ value: g.group_name })),
  );
}

// Update row group ID when user tabs into the clgid column
async function updateRowGroupID(event: CustomEvent) {
  if (!groupsElem) return;
  const row = event.detail?.rowIndex || 0;
  const col = event.detail?.colIndex || 0;
  if (col === 1) {
    const clgid = (event.detail?.value === undefined)
      ? ""
      : event.detail.value.trim();
    if (clgid === "") {
      const groupName = groupsElem.getCellValue(row, 0);
      if (groupName === "") return;
      const objList = await clientAPI.lookupGroupName(groupName);
      if (objList.length === 1) {
        groupsElem.setCellValue(row, 1, objList[0].clgid);
        return;
      }
      for (const obj of objList) {
        if (obj.group_name === groupName) {
          groupsElem.setCellValue(row, 1, obj.clgid);
          return;
        }
      }
    }
  }
}

// Focused event listener for groups
groupsElem?.addEventListener("focused", function (event: Event) {
  (async () => {
    await updateRowGroupID(event as CustomEvent);
  })();
});

initGroupNameAutocomplete();

function slugify(s: string): string {
  return s
    .replace(/[^\p{L}\p{N}\s()]/gu, "")
    .replace(/\s{2,}/g, " ")
    .trim()
    .replace(/\s/g, "-");
}

async function updateClpid() {
  const clpidElem = document.getElementById(
    "clpid",
  ) as HTMLInputElement | null;
  const familyNameElem = document.getElementById(
    "family_name",
  ) as HTMLInputElement | null;
  const givenNameElem = document.getElementById(
    "given_name",
  ) as HTMLInputElement | null;
  if (clpidElem === null || clpidElem.value !== "") return;
  const family = familyNameElem?.value.trim() ?? "";
  const given = givenNameElem?.value.trim() ?? "";
  if (family === "" || given === "") return;
  const proposed = slugify(family + " " + given);
  if (proposed === "") return;
  const exists = await clientAPI.validateClpid(proposed);
  if (exists) {
    clpidElem.style.borderColor = "red";
    clpidElem.placeholder =
      `"${proposed}" already exists — enter a unique clpid`;
  } else {
    clpidElem.style.borderColor = "";
    clpidElem.value = proposed;
  }
}

document.addEventListener("focusout", (event: FocusEvent) => {
  const target = event.target as HTMLElement;
  if (target.id === "family_name" || target.id === "given_name") {
    updateClpid();
  }
});

const caltechElem = document.getElementById("caltech") as
  | HTMLInputElement
  | null;
const rorElem = document.getElementById("ror") as HTMLInputElement | null;

caltechElem?.addEventListener("change", function () {
  if (caltechElem.checked && rorElem !== null && rorElem.value === "") {
    rorElem.value = "https://ror.org/05dxps055";
  }
});
