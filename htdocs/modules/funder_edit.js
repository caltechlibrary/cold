// funder_edit.ts
var funderEditForm = document.getElementById("funder-edit-form");
var grantNumbersElem = document.getElementById("grant_numbers");
var acronymsElem = document.getElementById("acronyms");
funderEditForm?.addEventListener("submit", async function(event) {
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
