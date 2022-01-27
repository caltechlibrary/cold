/**
 * funders.js implements a common display and editing widgets for funder objects.
 */
"use strict";

const display_template = document.createElement('template'),
      input_template = document.createElement('template');

/*
 * Template definitions
 */
display_template.innerHTML = `<style>
/* Default CSS */
@import "funders.css";
/* Site overrides */
@import "/css/funders.css";
</style>
<div class="funder-display">
  <div class="funder-cl_funder_id"><label for="cl_funder_id">Funder ID:</label> <span id="cl_funder_id" /></div>
  <div class="funder-grant_number"><label for="grant_number">Grant Number:</label> <span id="grant_number" /></div>
  <div class="funder-agency"><label for="agency">Agency:</label> <span id="agency" /></div>
  <div class="funder-crossref_funder_id"><label for="crossref_funder_id">CrossRef Funder ID:</label> <span id="crossref_funder_id" /></div>
  <div class="funder-ror"><label for="ror">ROR:</label> <span id="ror" /></div>
  <div class="funder-doi"><label for="doi">DOI:</label> <span id="doi" /></div>
  <div class="funder-created no-display"><label for="created"> <span id="created" /></div>
  <div class="funder-updated no-display"><label for="updated"> <span id="updated" /></div>
</div>
`;

input_template.innerHTML = `<style>
/* Default CSS */
@import "funders.css";
/* Site overrides */
@import "/css/funders.css";
</style>
<div class="funder-display">
  <div class="funder-cl_funder_id"><label for="cl_funder_id">Funder ID:</label> <input id="cl_funder_id" name="cl_funder_id" type="text" /></div>
  <div class="funder-grant_number"><label for="grant_number">Grant Number:</label> <input id="grant_number" name="grant_number" type="text" /></div>
  <div class="funder-agency"><label for="agency">Agency:</label> <input id="agency" name="agency" type="text" size="80"/></div>
  <div class="funder-crossref_funder_id"><label for="crossref_funder_id">CrossRef Funder ID:</label> <input id="crossref_funder_id" name="crossref_funder_id" type="text" /></div>
  <div class="funder-ror"><label for="ror">ROR:</label> <input id="ror" name="ror" type="text" /></div>
  <div class="funder-doi"><label for="doi">DOI:</label> <input id="doi" name="doi" type="text" size="18" /></div>
  <div class="funder-created"><label for="created">Created:</label> <input id="created" name="created" type="date" /></div>
  <div class="funder-updated"><label for="updated">Updated:</label> <input id="updated" name="updated" type="date" /></div>
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
 * Funder is a minimalist implementation of a Funder object
 * without any component elements.
 */
class Funder {
    constructor() {
        this.cl_funder_id = '';
        this.agency = '';
        this.crossref_funder_id = '';
        this.ror = '';
        this.doi = '';
        this.grant_number = '';
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
            'cl_funder_id': this.cl_funder_id,
            'agency': this.agency,
            'crossref_funder_id': this.crossref_funder_id,
            'ror': this.ror,
            'doi': this.doi,
            'grant_number': this.grant_number,
            'created': created,
            'updated': updated
        };
    }

    set value(obj) {
        let self = this;
        for (const attr_name of [ 'cl_funder_id', 'agency', 'crossref_funder_id', 'ror', 'doi', 'grant_number' ]) {
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
 * FunderDisplay is a web component for displaying a single funder's
 * metadata.
 */
class FunderDisplay extends HTMLElement {
    constructor () {
        super();
        this.managed_attributes = [ 
            'cl_funder_id',
            'grant_number', 
            'agency',
            'crossref_funder_id',
            'ror',
            'doi',
            'created',
            'updated'
        ];

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
                wrapper = this.shadowRoot.querySelector(`.funder-${key}`);
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

class FunderInput extends HTMLElement {
    constructor () {
        super();
        this.managed_attributes = [ 
            'cl_funder_id',
            'grant_number', 
            'agency',
            'crossref_funder_id',
            'ror',
            'doi',
            'created',
            'updated'
        ];

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


export { Funder, FunderDisplay, FunderInput };
window.customElements.define('funder-display', FunderDisplay);
window.customElements.define('funder-input', FunderInput);
