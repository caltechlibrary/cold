// funder_edit.ts provides the browser side TypeScript for the funder edit form.
// It intercepts form submission to extract grant_numbers and acronyms from
// their csv-textarea custom elements before posting to the middleware.

interface CSVTextareaElement extends HTMLElement {
  toCSV(): string;
}

const funderEditForm = document.getElementById(
  "funder-edit-form",
) as HTMLFormElement | null;

const grantNumbersElem = document.getElementById(
  "grant_numbers",
) as CSVTextareaElement | null;

const acronymsElem = document.getElementById(
  "acronyms",
) as CSVTextareaElement | null;

funderEditForm?.addEventListener("submit", async function (event: Event) {
  event.preventDefault();
  const formData = new FormData(funderEditForm);
  if (grantNumbersElem !== null) {
    formData.set("grant_numbers", grantNumbersElem.toCSV());
  }
  if (acronymsElem !== null) {
    formData.set("acronyms", acronymsElem.toCSV());
  }
  try {
    const response = await fetch(funderEditForm.action, {
      method: funderEditForm.method,
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
