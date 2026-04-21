// group_edit.ts
var groupEditForm = document.getElementById("group-edit-form");
var alternativeElem = document.getElementById("alternative");
groupEditForm?.addEventListener("submit", async function(event) {
  event.preventDefault();
  const formData = new FormData(groupEditForm);
  if (alternativeElem !== null) {
    formData.set("alternative", alternativeElem.toCSV());
  }
  try {
    const response = await fetch(groupEditForm.action, {
      method: groupEditForm.method,
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
