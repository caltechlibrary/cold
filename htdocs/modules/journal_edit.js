// journal_edit.ts
var issnEditForm = document.getElementById("issn-edit-form");
var alternativeNamesElem = document.getElementById("alternative_names");
issnEditForm?.addEventListener("submit", async function(event) {
  event.preventDefault();
  const formData = new FormData(issnEditForm);
  if (alternativeNamesElem !== null) {
    formData.set("alternative_names", alternativeNamesElem.toCSV());
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
