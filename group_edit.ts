// group_edit.ts provides the browser side TypeScript for the group edit form.
// It intercepts form submission to extract the alternative names from the
// csv-textarea custom element before posting to the middleware.
// It also generates a proposed clgid from the group name on blur.

import { ClientAPI } from "./client_api.ts";

const clientAPI = new ClientAPI();

interface CSVTextareaElement extends HTMLElement {
  toCSV(): string;
}

function slugify(s: string): string {
  return s
    .replace(/[^\p{L}\p{N}\s()]/gu, "")
    .replace(/\s{2,}/g, " ")
    .trim()
    .replace(/\s/g, "-");
}

async function updateClgid() {
  const clgidElem = document.getElementById(
    "clgid",
  ) as HTMLInputElement | null;
  const nameElem = document.getElementById("name") as HTMLInputElement | null;
  if (clgidElem === null || clgidElem.value !== "") return;
  const name = nameElem?.value.trim() ?? "";
  if (name === "") return;
  const proposed = slugify(name);
  if (proposed === "") return;
  const exists = await clientAPI.validateClgid(proposed);
  if (exists) {
    clgidElem.style.borderColor = "red";
    clgidElem.placeholder =
      `"${proposed}" already exists — enter a unique clgid`;
  } else {
    clgidElem.style.borderColor = "";
    clgidElem.value = proposed;
  }
}

document.addEventListener("focusout", (event: FocusEvent) => {
  const target = event.target as HTMLElement;
  if (target.id === "name") {
    updateClgid();
  }
});

const groupEditForm = document.getElementById(
  "group-edit-form",
) as HTMLFormElement | null;

const alternativeElem = document.getElementById(
  "alternative",
) as CSVTextareaElement | null;

groupEditForm?.addEventListener("submit", async function (event: Event) {
  event.preventDefault();
  const formData = new FormData(groupEditForm);
  if (alternativeElem !== null) {
    formData.set("alternative", alternativeElem.toCSV());
  }
  try {
    const response = await fetch(groupEditForm.action, {
      method: groupEditForm.method,
      body: formData,
    });
    if (response.ok) {
      window.location.href = response.url;
    } else {
      console.error(`Form submission failed with status: ${response.status}`);
    }
  } catch (error) {
    console.error("Error submitting form:", error);
  }
});
