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
