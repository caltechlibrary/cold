/**
 * display-person.js - this widget implements a common display of a
 * Person Object.
 */

const template = document.createElement('template');

template.innerHTML = `
<style>
.person-input-component {
    width: 80%;
}
.person-input-grid-2 {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
}
label {
    grid-column: 1/2;
    padding: 0.12em;
    margins: 0.12em;
    font-size: small;
    text-valign: center;
    text-align: right;
}
input {
    grid-column: 2/2;
    padding: 0.12em;
    margins: 0.12em;
    width: auto;
}
input:required {
    background-color: lightgreen;
    border: aquamarine solid 0.024em;
}

input:invalid {
    border: red solid 3px;
}
.given-name, .family-name, .orcid-number {
    padding: 0.12em;
    margins: 0.12em;
    border: red dashed 2px;
}
</style>
<div class="person-input-component">
  <div class="person-input-grid-2">
    <label for="given">Given Name</label>
    <input id="given" name="given" required size="60" value="" />

    <label for="family">Family Name</label>
    <input id="family" name="family" required size="60" value="" />
    <label for="orcid">ORCID</label>
    <input id="orcid" pattern="[0-9]{4}-[0-9]{4}-[0-9]{4}-[0-9xX]{4}"
           name="orcid" value=""
           size="19"
           title="e.g. 0000-0003-0900-6903"/>
  </div>
</div>`;


class DisplayPerson extends HTMLDivElement {
    constructor() {
        super();
    }
}

export { DisplayPerson };
window.customElement.define('display-person', DisplayPerson);

}
