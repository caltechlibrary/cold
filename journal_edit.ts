// journal_edit.ts provides the browser side TypeScript for the journal edit form.
// It intercepts form submission to extract alt_name from the
// csv-textarea custom element before posting to the middleware.

interface CSVTextareaElement extends HTMLElement {
  toCSV(): string;
}

const issnEditForm = document.getElementById(
  "issn-edit-form",
) as HTMLFormElement | null;

const altNameElem = document.getElementById(
  "alt_name",
) as CSVTextareaElement | null;

issnEditForm?.addEventListener("submit", async function (event: Event) {
  event.preventDefault();
  const formData = new FormData(issnEditForm);
  if (altNameElem !== null) {
    formData.set("alt_name", altNameElem.toCSV());
  }
  try {
    const response = await fetch(issnEditForm.action, {
      method: issnEditForm.method,
      body: formData,
    });
    if (response.ok) {
      window.location.href = response.url;
    } else {
      console.error(
        `Form submission failed with status: ${response.status}`,
      );
    }
  } catch (error) {
    console.error("Error submitting form:", error);
  }
});
