// journal_edit.ts provides the browser side TypeScript for the journal edit form.
// It intercepts form submission to extract alternative_names from the
// csv-textarea custom element before posting to the middleware.

interface CSVTextareaElement extends HTMLElement {
  toCSV(): string;
}

const issnEditForm = document.getElementById(
  "issn-edit-form",
) as HTMLFormElement | null;

const alternativeNamesElem = document.getElementById(
  "alternative_names",
) as CSVTextareaElement | null;

issnEditForm?.addEventListener("submit", async function (event: Event) {
  event.preventDefault();
  const formData = new FormData(issnEditForm);
  if (alternativeNamesElem !== null) {
    formData.set("alternative_names", alternativeNamesElem.toCSV());
  }
  try {
    const response = await fetch(issnEditForm.action, {
      method: issnEditForm.method,
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
