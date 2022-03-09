/**
 * vacabulary.js implements an individual subjects, DOI prefix and issn display element and list element.
 */
"use strict";

const pair_template = document.createElement('template');

pair_template.innerHTML = `<style>
@import "/app/widgets/vocabulary.css";
@import "/css/vocabulary.css";
</style>
<span id="identifier" class="vocabulary-identifier"></span>
<style>
@import "/app/widgets/vocabulary.css";
@import "/css/vocabulary.css";
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
