/**
 * display-person.js - this widget implements a common display of a
 * Person Object.
 *
 * @author R. S. Doiel, <rsdoiel@caltech.edu>
 *
 * Copyright (c) 2022, Caltech
 * All rights not granted herein are expressly reserved by Caltech.
 *
 * Redistribution and use in source and binary forms, with or without modification, are permitted provided that the following conditions are met:
 *
 * 1. Redistributions of source code must retain the above copyright notice, this list of conditions and the following disclaimer.
 *
 * 2. Redistributions in binary form must reproduce the above copyright notice, this list of conditions and the following disclaimer in the documentation and/or other materials provided with the distribution.
 *
 * 3. Neither the name of the copyright holder nor the names of its contributors may be used to endorse or promote products derived from this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 *
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
