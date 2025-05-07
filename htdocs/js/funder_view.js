
function getClfidFromPath() {
  const parts = window.location.pathname.split('/');
  return parts[parts.length-1];
}

document.addEventListener("DOMContentLoaded", async function (event) {
  const grantNumbersElem = document.getElementById("grant_numbers");

  if (grantNumbersElem !== undefined && grantNumbersElem !== null) {
	  const names = grantNumbersElem.innerText.split(/\n|\s+/g);
    if (names.length > 0) {
      const span = document.createElement("span");
      span.innerHTML = "Group Numbers"
      const ul = document.createElement('ul');
      ul.style = "list-style-type: none";
      for (const name of names) {
        const elem = document.createElement('li');
        elem.innerHTML = name;
        ul.appendChild(elem);
      }
      grantNumbersElem.innerHTML = '';
      grantNumbersElem.appendChild(span);
      grantNumbersElem.appendChild(ul);
    }
  }
});
