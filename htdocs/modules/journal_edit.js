// journal_edit.ts
var issnEditForm = document.getElementById("issn-edit-form");
var altNameElem = document.getElementById("alt_name");
issnEditForm?.addEventListener("submit", async function(event) {
  event.preventDefault();
  const formData = new FormData(issnEditForm);
  if (altNameElem !== null) {
    formData.set("alt_name", altNameElem.toCSV());
  }
  try {
    const response = await fetch(issnEditForm.action, {
      method: issnEditForm.method,
      body: formData
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
