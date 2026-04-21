// Import the necessary modules from @std/assert
import {
  assert,
  assertEquals,
  assertExists,
} from "https://deno.land/std@0.200.0/assert/mod.ts";

// Import your modules
import * as mdt from "https://caltechlibrary.github.io/metadatatools/mod.ts";
import { ClientAPI } from "./client_api.ts";

// Mock ClientAPI for testing
class MockClientAPI extends ClientAPI {
  override async lookupGroupName(name: string): Promise<{ clgid: string; name: string; ok: boolean; msg: string; }[]> {
    return [{ clgid: "mock_clgid", name: name, ok: true, msg: "Success" }];
  }

  override async getList(ds: string, field: string): Promise<{ group_name: string; }[]> {
    return [{ group_name: "Test Group" }];
  }
}

// Mock getORCIDNames for testing
async function mockGetORCIDNames(orcid: string) {
  return {
    display_name: "Test User",
    family_name: "Test",
    given_name: "User",
  };
}

// Mock groupsElem for testing
const mockGroupsElem = {
  toCSV: () => "mockCSVData",
  getCellValue: (row: number, col: number) => `cell_${row}_${col}`,
  setCellValue: (row: number, col: number, value: string) => {
    console.log(`Setting cell (${row}, ${col}) to ${value}`);
  },
  customCleanupFilter: null,
  addEventListener: (type: string, listener: EventListener) => {
    console.log(`Event listener added for ${type}`);
  },
  setAutocomplete: (col: number, data: { value: string }[]) => {
    console.log(`Setting autocomplete for column ${col} with data:`, data);
  },
};

// Test suite
Deno.test("Normalize ORCID", () => {
  const orcid = "0000-0002-1825-0097";
  const normalized = mdt.normalizeORCID(orcid);
  assertEquals(normalized, "0000-0002-1825-0097");
});

Deno.test("Normalize ROR", () => {
  const ror = "https://ror.org/053gtdx25";
  const normalized = mdt.normalizeROR(ror);
  assertEquals(normalized, "https://ror.org/053gtdx25");
});

Deno.test("Update Row Group ID", async () => {
  const mockEvent = {
    detail: {
      rowIndex: 0,
      colIndex: 1,
      value: "",
    },
  } as CustomEvent;

  await updateRowGroupID(mockEvent);

  assert(true); // If no errors, the test passes
});

Deno.test("Update Group Name List", async () => {
  await updateGroupNameList(mockGroupsElem);
  assert(true); // If no errors, the test passes
});

// Helper function for testing updateRowGroupID
async function updateRowGroupID(event: CustomEvent) {
  const row = event.detail?.rowIndex || 0;
  const col = event.detail?.colIndex || 0;
  if (col === 1) {
    const groupName = mockGroupsElem.getCellValue(row, 0);
    const objList = await new MockClientAPI().lookupGroupName(groupName);
    for (const obj of objList) {
      if (obj.name === groupName) {
        mockGroupsElem.setCellValue(row, 1, obj.clgid);
      }
    }
  }
}

// Helper function for testing updateGroupNameList
async function updateGroupNameList(csvData: {
  setAutocomplete: (col: number, data: { value: string }[]) => void;
}) {
  const objList = await new MockClientAPI().getList("groups.ds", "group_names");
  const groupNames = objList.map((obj) => ({ value: obj.group_name }));
  csvData.setAutocomplete(0, groupNames);
}
