/**
 * vacabulary.js implements an individual subjects, DOI prefix and issn display element and list element.
 */
"use strict";

const template = document.createElement('template');

template.innerHTML = `
<span id="identifier"></span> <span id="name"></span>
`;

/* VocabularyMap component extends HTMLElement */
class VocabularyMap extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({mode: "open"});
        this.shadowRoot.append(template.content.cloneNode(true));
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
export { VocabularyMap };
window.customElements.define('vocabularly-map', VocabularyMap);

