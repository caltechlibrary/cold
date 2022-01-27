/**
 * groups.js implements a common display and editing widgets for group objects.
 */
"use strict";

const display_template = document.createElement('template'),
      input_template = document.createElement('template');

/*
 * Template definitions
 */
display_template.innerHTML = `<style>
/* Default CSS */
@import "groups.css";
/* Site overrides */
@import "/css/groups.css";
</style>
<div class="group-display">
  <div class="group-cl_group_id"><label for="cl_group_id">Group ID:</label> <span id="cl_group_id" /></div>
  <div class="group-name"><label for="name">Name:</label> <span id="name" /></div>
  <div class="group-ror"><label for="ror">ROR:</label> <span id="ror" /></div>
  <div class="group-doi"><label for="doi">DOI:</label> <span id="doi" /></div>
  <div class="group-created no-display"><label for="created"> <span id="created" /></div>
  <div class="group-updated no-display"><label for="updated"> <span id="updated" /></div>
</div>
`;

input_template.innerHTML = `<style>
/* Default CSS */
@import "groups.css";
/* Site overrides */
@import "/css/groups.css";
</style>
<div class="group-input">
  <div class="group-cl_group_id"><label for="cl_group_id">Group ID:</label> <input id="cl_group_id" name="cl_group_id" type="text" /></div>
  <div class="group-name"><label for="name">Name:</label> <input id="name" name="name" type="text" /></div>
  <div class="group-ror"><label for="ror">ROR:</label> <input id="ror" name="ror" type="text" /></div>
  <div class="group-doi"><label for="doi">DOI:</label> <input id="doi" name="doi" type="text" size="18" /></div>
  <div class="group-created"><label for="created">Created:</label> <input id="created" name="created" type="date" /></div>
  <div class="group-updated"><label for="updated">Updated:</label> <input id="updated" name="updated" type="date" /></div>
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
 * Group is a minimalist implementation of a Group object
 * without any component elements.
 */
class Group {
    constructor() {
        this.cl_group_id = '';
        this.name = '';
        this.ror = '';
        this.doi = '';
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
            'cl_group_id': this.cl_group_id,
            'name': this.name,
            'ror': this.ror,
            'doi': this.doi,
            'created': created,
            'updated': updated
        };
    }

    set value(obj) {
        let self = this;
        for (const attr_name of [ 'cl_group_id', 'agency', 'crossref_group_id', 'ror', 'doi', 'grant_number' ]) {
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
 * GroupDisplay is a web component for displaying a single group's
 * metadata.
 */
class GroupDisplay extends HTMLElement {
    constructor () {
        super();
        this.managed_attributes = Object.keys(new Group);

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
                wrapper = this.shadowRoot.querySelector(`.group-${key}`);
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

class GroupInput extends HTMLElement {
    constructor () {
        super();
        this.managed_attributes = Object.keys(new Group);

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


export { Group, GroupDisplay, GroupInput };
window.customElements.define('group-display', GroupDisplay);
window.customElements.define('group-input', GroupInput);
