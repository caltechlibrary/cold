import * as mdt from "./mod.ts";
import { ClientAPI } from "./client_api.ts";
import { getORCIDNames } from "./orcid_api.ts";

const clientAPI = new ClientAPI();

const groupsElem = document.getElementById("groups") as unknown as {
  toCSV: () => string;
  getCellValue: (row: number, col: number) => string;
  setCellValue: (row: number, col: number, value: string) => void;
  customCleanupFilter: ((row: HTMLElement) => boolean) | null;
  addEventListener: (type: string, listener: EventListenerOrEventListenerObject) => void;
  setAutocomplete: (col: number, data: { value: string }[]) => void;
} | null;

// Update row group ID
async function updateRowGroupID(event: CustomEvent) {
  if (!groupsElem) return;
  const row = event.detail?.rowIndex || 0;
  const col = event.detail?.colIndex || 0;
  if (col === 1) {
    let clgid = (event.detail?.value === undefined) ? '' : event.detail.value.trim();
    if (clgid === '') {
      const groupName = groupsElem.getCellValue(row, 0);
      if (groupName === '') return;
      const objList = await clientAPI.lookupGroupName(groupName);
      for (const obj of objList) {
        if (obj.name === groupName) {
          groupsElem.setCellValue(row, 1, obj.clgid);
          return;
        }
      }
    }
  }
}

// Focused event listener for groups
groupsElem?.addEventListener('focused', function (event: Event) {
  (async () => {
    await updateRowGroupID(event as CustomEvent);
  })();
});
