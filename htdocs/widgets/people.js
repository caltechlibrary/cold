/**
 * people.js implements a common display and editing widgets for person objects.
 */
"use strict";

const display_template = document.createElement('template'),
      input_template = document.createElement('template');

/*
 * Template definitions
 */
display_template.innerHTML = `<style>
/* Default CSS */
@import "people.css";
/* Site overrides */
@import "/css/people.css";
</style>
<div class="person-display">
  <div class="person-cl_person_id"><label for="cl_person_id">Person ID:</label> <span id="cl_person_id" /></div>
  <div class="person-family"><label for="family">Family Name:</label> <span id="family" /></div>
  <div class="person-given"><label for="given">Given Name:</label> <span id="given" /></div>
  <div class="person-honorific"><label for="honorific">Honorific:</label> <span id="honorific" /></div>
  <div class="person-lineage"><label for="lineaged">Lineage:</label> <span id="lineage" /></div>
  <div class="person-orcid"><label for="orcid">ORCID:</label> <span id="orcid" /></div>
  <div class="person-ror"><label for="ror">ROR:</label> <span id="ror" /></div>
  <div class="person-created no-display"><label for="created"> <span id="created" /></div>
  <div class="person-updated no-display"><label for="updated"> <span id="updated" /></div>
</div>
`;

input_template.innerHTML = `<style>
/* Default CSS */
@import "people.css";
/* Site overrides */
@import "/css/people.css";
</style>
<div class="person-input">
  <div class="person-cl_person_id"><label for="cl_person_id">Person ID:</label> <input id="cl_person_id" name="cl_person_id" type="text" /></div>
  <div class="person-family"><label for="family">Family Name:</label> <input id="family" name="family" type="text" /></div>
  <div class="person-given"><label for="given">Given Name:</label> <input id="given" name="given" type="text" /></div>
  <div class="person-honorific"><label for="honorific">Honorific:</label> <input id="honorific" honorific="honorific" type="text" /></div>
  <div class="person-lineage"><label for="lineage">Lineage:</label> <input id="lineage" name="lineage" type="text" /></div>
  <div class="person-orcid"><label for="orcid">ORCID:</label> <input id="orcid" name="orcid" type="text" size="18" /></div>
  <div class="person-ror"><label for="ror">ROR:</label> <input id="ror" name="ror" type="text" size="18" /></div>
  <div class="person-created"><label for="created">Created:</label> <input id="created" name="created" type="date" /></div>
  <div class="person-updated"><label for="updated">Updated:</label> <input id="updated" name="updated" type="date" /></div>
</div>`;

/*
 * Utility functions
 */
function yyyymmdd(date) {
    let day = `${date.getDate()}`.padStart(2, '0'),
        month = `${date.getMonth() + 1}`.padStart(2, '0'),
        year = `${date.getFullYear()}`;
    return `${year}-${month}-${day}`
}

function mmddyyyy(date) {
    let day = `${date.getDate()}`.padStart(2, '0'),
        month = `${date.getMonth() + 1}`.padStart(2, '0'),
        year = `${date.getFullYear()}`;
    return `${month}/${day}/${year}`
}


/******************************
 * Web worker classes
 ******************************/

/**
 * Person is a minimalist implementation of a Person object
 * without any component elements.
 */
class Person {
    constructor() {
        this.cl_person_id = '';
        this.family = '';
        this.given = '';
        this.honorific = '';
        this.lineage = '';
        this.orcid = '';
        this.ror = '';
        this.created = '';
        this.updated = '';
    }

    get value() {
        let created = this.created,
            updated = this.updated,
            now = Date.now()
        if (created == '') {
           created = yyymmdd(now)
        };
        if (updated == '') {
           updated = yyymmdd(now)
        }
        return {
            'cl_person_id': this.cl_person_id,
            'family': this.family,
            'given': this.given,
            'honorific': this.honorific,
            'lineage': this.lineage,
            'orcid': this.orcid,
            'ror': this.ror,
            'created': created,
            'updated': updated
        };
    }

    set value(obj) {
        let self = this;
        for (const attr_name of [ 'cl_person_id', 'family', 'given', 'honorific', 'lineage', 'orcid', 'ror' ]) {
            if (obj[attr_name] !== undefined) {
                self[attr_name] = obj[attr_name];
            }
        }
        //FIXME: Should validated date object before settings.
        if (obj.created !== undefined) {
            this.created = obj.created;
        }
        if (obj.updated !== undefined) {
            this.updated = obj.updated;
        }
    }
}

/************************************
 * Web component definitions
 ************************************/

/**
 * PersonDisplay is a web component for displaying a single person's
 * metadata.
 */
class PersonDisplay extends HTMLElement {
    constructor () {
        super();
        this.managed_attributes = Object.keys(new Person);

        this.attachShadow({mode: 'open'});
        this.shadowRoot.appendChild(display_template.content.cloneNode(true));
        let self = this;
        for (const key of this.managed_attributes) {
            let elem_name = `${key}_input`,
                fnNameOnChange = `onchange_${key}`;
            self[elem_name] = this.shadowRoot.getElementById(key);
            self[fnNameOnChange] = function() {
                let evt = document.createEvent('HTMLEvents');
                evt.initEvent("change", false, true);
                self[key] = self[elem_name].value;
                self.setAttribute(key, self[elem_name].value);
                this.shadowRoot.host.dispatchEvent(evt);
            };
            self[fnNameOnChange] = self[fnNameOnChange].bind(this);
        }
    }

    get value() {
        let obj = {}
        for (const key of this.managed_attributes) {
            obj[key] = this.getAttribute(key);
        }
        return obj;
    }

    get as_json() {
        return JSON.stringify(this.value);
    }

    set value(obj) {
        let self = this;
        for (const key of this.managed_attributes) {
            let elem_name = `${key}_input`;
            if (obj[key] !== undefined) {
                this.setAttribute(key, obj[key]);
                self[elem_name].innerHTML = obj[key];
            }
        }
    }

    setAttribute(key, val) {
        if (this.managed_attributes.indexOf(key) >= 0) {
            let self = this,
                elem_name =  `${key}_input`;
            self[elem_name].innerHTML = val;
            let evt = document.createEvent('HTMLEvents');
            evt.initEvent("change", true, true);
            this.shadowRoot.host.dispatchEvent(evt);
        }
        super.setAttribute(key, val);
    }

    connectedCallback() {
        this.innerHTML = '';
        let self = this;
        for (const key of this.managed_attributes) {
            let val = this.getAttribute(key),
                elem_name = `${key}_input`,
                fnNameOnChange = `onchange_${key}`,
                wrapper = this.shadowRoot.querySelector(`.person-${key}`);
            if ((val === undefined) || (val == null) || (val === '')) {
                wrapper.classList.add('no-display');
                val = '';
            } else {
                wrapper.classList.remove('no-display');
            }
            self[elem_name].innerHTML = val;
            self[elem_name].addEventListener('change', self[fnNameOnChange]);
        }
    }

    disconnectCallback() {
        let self = this;
        for (const key of this.managed_attributes) {
            let elem_name = `${key}_input`,
                fnNameOnChange = `onchange_${key}`;
            self[elem_name].removeEventListener('change', self[fnNameOnChange]);
        }
    }
}

class PersonInput extends HTMLElement {
    constructor () {
        super();
        this.managed_attributes = Object.keys(new Person);

        this.attachShadow({mode: 'open'});
        this.shadowRoot.appendChild(input_template.content.cloneNode(true));
        let self = this;
        for (const key of this.managed_attributes) {
            let elem_name = `${key}_input`,
                fnNameOnChange = `onchange_${key}`;
            self[elem_name] = this.shadowRoot.getElementById(key);
            self[fnNameOnChange] = function() {
                let evt = document.createEvent('HTMLEvents');
                evt.initEvent("change", false, true);
                self[key] = self[elem_name].value;
                self.setAttribute(key, self[elem_name].value);
                this.shadowRoot.host.dispatchEvent(evt);
            };
            self[fnNameOnChange] = self[fnNameOnChange].bind(this);
        }
    }

    get value() {
        let obj = {}
        for (const key of this.managed_attributes) {
            obj[key] = this.getAttribute(key);
        }
        return obj;
    }

    get as_json() {
        return JSON.stringify(this.value);
    }

    set value(obj) {
        let self = this;
        for (const key of this.managed_attributes) {
            let elem_name = `${key}_input`;
            if (obj[key] !== undefined) {
                this.setAttribute(key, obj[key]);
                self[elem_name].value = obj[key];
            }
        }
    }

    setAttribute(key, val) {
        if (this.managed_attributes.indexOf(key) >= 0) {
            let self = this,
                elem_name =  `${key}_input`;
            self[elem_name].value = val;
            let evt = document.createEvent('HTMLEvents');
            evt.initEvent("change", true, true);
            this.shadowRoot.host.dispatchEvent(evt);
        }
        super.setAttribute(key, val);
    }

    connectedCallback() {
        this.innerHTML = '';
        let self = this,
            today = new Date();

        for (const key of this.managed_attributes) {
            let val = this.getAttribute(key),
                elem_name = `${key}_input`,
                fnNameOnChange = `onchange_${key}`;
            if ((val === undefined) || (val === null)) {
                if ((key === 'created') || (key === 'updated')) {
                    val = yyyymmdd(today);
                } else {
                    val = '';
                }
            }
            self[elem_name].value = val;
            self[elem_name].addEventListener('change', self[fnNameOnChange]);
        }
    }

    disconnectCallback() {
        let self = this;
        for (const key of this.managed_attributes) {
            let elem_name = `${key}_input`,
                fnNameOnChange = `onchange_${key}`;
            self[elem_name].removeEventListener('change', self[fnNameOnChange]);
        }
    }
}


export { Person, PersonDisplay, PersonInput };
window.customElements.define('person-display', PersonDisplay);
window.customElements.define('person-input', PersonInput);
