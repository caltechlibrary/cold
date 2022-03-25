/**
 * vacabulary.js implements an individual subjects, DOI prefix and issn display element and list element.
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
"use strict";

import { Cfg } from "./config.js";

const pair_template = document.createElement('template');

pair_template.innerHTML = `<style>
@import "${Cfg.prefix_path}/app/widgets/vocabulary.css";
</style>
<span id="identifier" class="vocabulary-identifier"></span>
<style>
@import "${Cfg.prefix_path}/app/widgets/vocabulary.css";
</style>
<span id="name" class="vocabulary-name"></span>
`;



/* VocabularyPair component extends HTMLElement displaying a single identifier/name pair in spans. */
class VocabularyPair extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({mode: "open"});
        this.shadowRoot.append(pair_template.content.cloneNode(true));
        this.elem_identifier = this.shadowRoot.getElementById('identifier');
        this.elem_name = this.shadowRoot.getElementById('name');
    }

    connectCallback() {
        let identifier = this.getAttribute("identifier"),
            name = this.getAttribute("name");
        this.elem_identifier.innerHTML = identifier;
        this.elem_name.innerHTML = name;
    }

    get value() {
        let obj = {
            'identifier': this.getAttribute("identifier"),
            'name': this.getAttribute("name")
        };
        return obj;
    }

    set value(obj) {
        if (obj.identifier !== undefined) {
            this.setAttribute('identifier', obj.identifier);
            this.elem_identifier.innerHTML = obj.identifier;
        }
        if (obj.name !== undefined) {
            this.setAttribute('name', obj.name);
            this.elem_name.innerHTML = obj.name;
        }
    }
}


export { VocabularyPair };
window.customElements.define('vocabulary-pair', VocabularyPair);
