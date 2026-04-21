// group_edit.ts provides the browser side TypeScript for the group edit form.
// It intercepts form submission to extract the alternative names from the
// csv-textarea custom element before posting to the middleware.

interface CSVTextareaElement extends HTMLElement {
  toCSV(): string;
}

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
