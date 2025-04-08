// We need to intercept the form so we can conver the list from the CSVTextarea 
// and set it up for submission since the fallback textarea inside the web component.
const groupEditForm = document.getElementById("group-edit-form");
const alternativeElem = document.getElementById("alternative")

groupEditForm.addEventListener("submit", async function (event) {
  event.preventDefault();
  let formData = new FormData(this);
  const alternativeData = alternativeElem.toCSV().replace(/^alternative,/,'');
  //console.log(`DEBUG setting formData.alternative to '${JSON.stringify(alternativeData)}'`);
  formData.set("alternative", alternativeData);
  //for (let v of formData.entries()) {
  //  console.log(`%cDEBUG form elements -> ${v}`, "color: green");
  //}

  try {
    const response = await fetch(this.action, {
      method: this.method,
      body: formData,
    });

    if (response.ok) {
      //console.log(
      //  `%cDEBUG response.status -> ${response.status}`,
      //  "color: cyan",
      //);
	  let params = new URLSearchParams(window.location.search);
	  params.delete("view");
	  window.location.search = params;
	  //console.log(`DEBUG window.location -> ${window.location} -> ${window.location.search}  || ${window.location.pathname}`);
    } else {
      console.error(`Form submission failed with status: ${response.status}`);
    }
  } catch (error) {
    console.error("Error submitting form:", error);
  }
});
