/**
 * groups.js implements a common display and editing widgets for group objects.
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

const display_template = document.createElement('template'),
      input_template = document.createElement('template'),
      table_template = document.createElement('template');
      
/*
 * Template definitions
 */

display_template.innerHTML = `<style>
/* Default CSS */
@import "groups.css";
</style>
<div class="group-display">
    <div class="group-cl_group_id"><label for="cl_group_id">Group ID:</label> <span id="cl_group_id" /></div>
    <div class="group-name"><label for="name">Name:</label> <span id="name" /></div>
    <div class="group-alternative"><label for="name">Alternative:</label> <span id="alternative" /></div>
    <div class="group-email"><label for="name">Email:</label> <span id="email" /></div>
    <div class="group-date"><label for="date">Date:</label> <span id="date" /></div>
    <div class="group-description"><label for="description">Description:</label> <span id="description" /></div>
    <div class="group-start"><label for="start">Start:</label> <span id="start" /></div>
    <div class="group-approx_start"><label for="approx_start">Approx Start:</label> <span id="approx_start" /></div>
    <div class="group-activity"><label for="activity">Activity:</label> <span id="activity" /></div>
    <div class="group-end"><label for="end">End:</label> <span id="end" /></div>
    <div class="group-approx_end"><label for="approx_end">Approx End:</label> <span id="approx_end" /></div>
    <div class="group-website"><label for="website">Website:</label> <span id="website" /></div>
    <div class="group-pi"><label for="pi">PI:</label> <span id="pi" /></div>
    <div class="group-parent"><label for="parent">Parent:</label> <span id="parent" /></div>
    <div class="group-prefix"><label for="prefix">Prefix:</label> <span id="prefix" /></div>
    <div class="group-grid"><label for="grid">GRID:</label> <span id="grid" /></div>
    <div class="group-isni"><label for="isni">ISNI:</label> <span id="isni" /></div>
    <div class="group-ringgold"><label for="isni">Ringgold:</label> <span id="ringgold" /></div>
    <div class="group-viaf"><label for="isni">VIAF:</label> <span id="viaf" /></div>
    <div class="group-ror"><label for="isni">ROR:</label> <span id="ror" /></div>
    <div class="group-updated"><label for="updated">Updated:</label> <span id="updated" /></div>
</div>
`;

input_template.innerHTML = `<style>
/* Default CSS */
@import "groups.css";
</style>
<div class="group-input">
    <div class="group-cl_group_id"><label for="cl_group_id">Group ID:</label> <input type="text" id="cl_group_id" value="" size="80" required="true"></div>
    <div class="group-name"><label for="name">Name:</label> <input type="text" id="name" value="" size="80"></div>
    <div class="group-alternative"><label for="name">Alternative:</label> <input type="text" id="alternative" value="" size="80" ></div>
    <div class="group-email"><label for="name">Email:</label> <input type="email" id="email" value=""></div>
    <div class="group-date"><label for="date">Date:</label> <input type="date" id="date" value=""></div>
    <div class="group-description"><label for="description">Description:</label> <textarea type="text" id="description" cols="80" rows="10"></textarea></div>
    <div class="group-start"><label for="start">Start:</label> <input type="text" pattern="[0-9][0-9][0-9][0-9]|[0-9][0-9][0-9][0-9]-[0-9][0-9]|[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]" id="start" value="" size="12"></div>
    <div class="group-approx_start"><label for="approx_start">Approx Start:</label> <input type="text" pattern="yes|no" id="approx_start" value="" size="80"></div>
    <div class="group-activity"><label for="activity">Activity:</label> <input type="text" id="activity" value="" size="80"></div>
    <div class="group-end"><label for="end">End:</label> <input type="text" pattern="[0-9][0-9][0-9][0-9]|[0-9][0-9][0-9][0-9]-[0-9][0-9]|[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]" id="end" value="" size="12"></div>
    <div class="group-approx_end"><label for="approx_end">Approx End:</label> <input type="text" pattern="yes|no" id="approx_end" value="" size="80"></div>
    <div class="group-website"><label for="website">Website:</label> <input type="url" id="website" value=""></div>
    <div class="group-pi"><label for="pi">PI:</label> <input type="text" id="pi" value="" size="80"></div>
    <div class="group-parent"><label for="parent">Parent:</label> <input type="text" id="parent" value="" size="80"></div>
    <div class="group-prefix"><label for="prefix">Prefix:</label> <input type="text" id="prefix" value="" size="80"></div>
    <div class="group-grid"><label for="grid">GRID:</label> <input type="text" id="grid" value="" size="80"></div>
    <div class="group-isni"><label for="isni">ISNI:</label> <input type="text" id="isni" value="" size="80"></div>
    <div class="group-ringgold"><label for="isni">Ringgold:</label> <input type="text" id="ringgold" value="" size="80"></div>
    <div class="group-viaf"><label for="isni">VIAF:</label> <input type="text" id="viaf" value="" size="80"></div>
    <div class="group-ror"><label for="isni">ROR:</label> <input type="text" id="ror" value="" size="80"></div>
    <div class="group-updated"><label for="updated">Updated:</label> <input type="date" id="updated" value="" size="80"></div>
</div>`;

table_template.innerHTML = `<style>
/* Default CSS */
@import "groups.css";
</style>
<table id="group-list">
  <thead>
    <tr>
      <th class="group-col-cl_group_id" title="click column to sort ascending, click again for descending">Group ID</th>
      <th class="group-col-name" title="click column to sort ascending, click again for descending">Name</th>
      <th class="group-col-alternative" title="click column to sort ascending, click again for descending">Alternative</th>
      <th class="group-col-email" title="click column to sort ascending, click again for descending">EMail</th>
      <th class="group-col-date" title="click column to sort ascending, click again for descending">Date</th>
      <th class="group-col-description" title="click column to sort ascending, click again for descending">Description</th>
      <th class="group-col-start" title="click column to sort ascending, click again for descending">Start</th>
      <th class="group-col-start_approx" title="click column to sort ascending, click again for descending">Start Approx.</th>
      <th class="group-col-activity" title="click column to sort ascending, click again for descending">Activity</th>
      <th class="group-col-end" title="click column to sort ascending, click again for descending">End</th>
      <th class="group-col-end-approx" title="click column to sort ascending, click again for descending">End Approx.</th>
      <th class="group-col-website" title="click column to sort ascending, click again for descending">Website</th>
      <th class="group-col-pi" title="click column to sort ascending, click again for descending">Primary Investigator</th>
      <th class="group-col-parent" title="click column to sort ascending, click again for descending">Parent</th>
      <th class="group-col-prefix" title="click column to sort ascending, click again for descending">Prefix</th>
      <th class="group-col-grid" title="click column to sort ascending, click again for descending">GRID</th>
      <th class="group-col-isni" title="click column to sort ascending, click again for descending">ISNI</th>
      <th class="group-col-ringgold" title="click column to sort ascending, click again for descending">Ringgold</th>
      <th class="group-col-viaf" title="click column to sort ascending, click again for descending">VIAF</th>
      <th class="group-col-ror" title="click column to sort ascending, click again for descending">ROR</th>
      <th class="group-col-updated" title="click column to sort ascending, click again for descending">Updated</th>
  </thead>
  <tbody>
  </tbody>
</table>
`;


/*
 * Utility functions
 */
function yyyymmdd(date) {
    let day = `${date.getDate()}`.padStart(2, '0'),
        month = `${date.getMonth() + 1}`.padStart(2, '0'),
        year = `${date.getFullYear()}`;
    return `${year}-${month}-${day}`
}

/******************************
 * Web worker classes
 ******************************/

 let group_field_names = [ 'cl_group_id',
    'name', 'alternative', 'email', 'date', 
    'description', 'start', 'approx_start', 
    'activity', 'end', 'approx_end', 'website', 
    'pi', 'parent', 'prefix', 'grid', 'isni', 
    'ringgold', 'viaf', 'ror', 'updated' ];

/**
 * Group is a minimalist implementation of a Group object
 * without any component elements.
 */
class Group {
    constructor() {
        for (const key of group_field_names) {
            Object.defineProperty(this, key, { 'value': '', 'writable': true });
        }
    }

    get value() {
        let self = this,
            updated = this.updated,
            now = new Date(),
            obj = {};
        for (const key of Object.getOwnPropertyNames(this)) {
            obj[key] = self[key];
        }
        if (obj.updated == '') {
           obj.updated = yyyymmdd(now);
        }
        return obj;
    }

    set value(obj) {
        let self = this,
            now = new Date();
        if (obj == undefined) {
            obj = new Group();
        }
        self = Object.assign(self, obj);
        if (obj.updated !== undefined) {
            this.updated = yyyymmdd(now);
        }
        // FIXME: does the worker need to know if the group has changed? If so need to handle event.
    }

    get as_json() {
        let self = this,
            obj = {};
        for (const key of Object.getOwnPropertyNames(this)) {
            obj[key] = self[key];
        }
        return JSON.stringify(obj);
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
        this.managed_attributes = group_field_names;
        for (const key of group_field_names) {
            Object.defineProperty(this, key, { 'value': '', 'writable': true });
        }

        this.attachShadow({mode: 'open'});
        this.shadowRoot.appendChild(display_template.content.cloneNode(true));
        let self = this;
        for (const key of this.managed_attributes) {
            let elem_name = `${key}_field`,
                fnNameOnChange = `onchange_${key}`;
            self[elem_name] = this.shadowRoot.getElementById(key);
            self[fnNameOnChange] = function() {
                let evt = new Event("change", {"bubbles": true, "cancelable": true});
                self[key] = self[elem_name].value;
                self.setAttribute(key, self[elem_name].value);
                this.shadowRoot.host.dispatchEvent(evt);
            };
            self[fnNameOnChange] = self[fnNameOnChange].bind(this);
        }
    }

    get value() {
        let obj = {};
        for (const key of this.managed_attributes) {
            // Copy the values from in element's attributes
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
            let elem_name = `${key}_field`;
            if (obj.hasOwnProperty(key)) {
                this.setAttribute(key, obj[key]);
                self[elem_name].innerHTML = obj[key];
            }
        }
    }

    setAttribute(key, val) {
        if (this.managed_attributes.indexOf(key) >= 0) {
            let self = this,
                elem_name =  `${key}_field`;
            self[elem_name].innerHTML = val;
            let evt = new Event("change", {"bubbles": true, "cancelable": true});
            this.shadowRoot.host.dispatchEvent(evt);
        }
        super.setAttribute(key, val);
    }

    connectedCallback() {
        this.innerHTML = '';
        let self = this;
        for (const key of this.managed_attributes) {
            let val = this.getAttribute(key),
                elem_name = `${key}_field`,
                fnNameOnChange = `onchange_${key}`,
                wrapper = this.shadowRoot.querySelector(`.group-${key}`);
            if (val == null) {
                val = '';
            }
            console.log("DEBUG group-key -> ", key, "val ->", val);
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
        this.managed_attributes = group_field_names
        for (const key of group_field_names) {
            Object.defineProperty(this, key, { 'value': '', 'writable': true });
        }

        this.attachShadow({mode: 'open'});
        this.shadowRoot.appendChild(input_template.content.cloneNode(true));
        let self = this;
        for (const key of this.managed_attributes) {
            let elem_name = `${key}_input`,
                fnNameOnChange = `onchange_${key}`;
            self[elem_name] = this.shadowRoot.getElementById(key);
            self[fnNameOnChange] = function() {
                let evt = new Event("change", {"bubbles": true, "cancelable": true});
                self[key] = self[elem_name].value;
                self.setAttribute(key, self[elem_name].value);
                this.shadowRoot.host.dispatchEvent(evt);
            };
            self[fnNameOnChange] = self[fnNameOnChange].bind(this);
        }
    }

    get value() {
        let obj = {};
        for (const key of this.managed_attributes) {
            obj[key] = this.getAttribute(key);
            if (obj[key] === null) {
                obj[key] = '';
            }
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
            if (obj.hasOwnProperty(key)) {
                if ((obj[key] === null) || (obj[key] === null)) {
                    obj[key] = '';
                }
                this.setAttribute(key, obj[key]);
                if (key === "description") {
                    self[elem_name].innerText = obj[key];
                } else {
                    self[elem_name].value = obj[key];
                }
            }
        }
    }

    setAttribute(key, val) {
        if (this.managed_attributes.indexOf(key) >= 0) {
            let self = this,
                elem_name =  `${key}_input`;
            if (self.hasOwnProperty(elem_name)) {
                self[elem_name].value = val;
            } else {
                console.log(`ERROR: can't fund ${elem_name} <-- ${val}`);
            }
            let evt = new Event("change", {"bubbles": true, "cancelable": true});
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
                val = '';
                if ((key === 'created') || (key === 'updated')) {
                    val = yyyymmdd(today);
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

/**
 * GroupTable is a web component for displaying all the group metadata as a table.
 */
 class GroupTable extends HTMLElement {
    constructor () {
        super();
        this.row_attributes = group_field_names;
        this.managed_objects = [];

        this.attachShadow({mode: 'open'});
        this.shadowRoot.appendChild(table_template.content.cloneNode(true));
        this.tbody = this.shadowRoot.querySelector('tbody');
    }

    get value() {
        return this.managed_objects;
    }

    get as_json() {
        return JSON.stringify(this.managed_objects); 
    }

    set value(obj_list) {
        this.managed_objects = [];
        for (const obj of obj_list) {
            this.managed_objects.push(obj);
        }
    }

    indexOf(cl_group_id) {
        let i = 0,
            res = -1;
        for (const obj of this.managed_objects) {
            if (obj.cl_group_id == cl_group_id) {
                res = i;
                break;
            }
            i++;
        }
        return res;
    }

    get_group(cl_group_id) {
        let pos = this.indexOf(cl_group_id);
        if (pos > -1) {
            return this.managed_objects[pos];
        }
        return null
    }

    /**
     * set_group updates the object matching "cl_group_id" to the value of object. If
     *  "cl_group_id" is not in the managed object list the default action is to append it to
     * the managed object list. If "insert_update" parameter is true, then it'll insert it at
     * start of the list.  
     */
    set_group(cl_group_id, obj, insert_update = false) {
        let pos = this.indexOf(cl_group_id);
        if (pos < 0) {
            if (insert_update === true) {
                this.managed_objects.shift(obj);
                pos = 0;
            } else {
                this.managed_objects.push(obj);
                pos = this.managed_objects.length - 1;
            }
        } else {
            this.managed_objects[pos] = obj;
        }
        this.refresh_table();
    }

    insert(obj) {
        this.managed_obejcts.shift(obj);
        this.refresh_table();
    }

    append(obj) {
        this.managed_objects.push(obj);
        this.refresh_table();
    }

    remove(cl_group_id) {
        let pos = this.indexOf(cl_group_id);
        if (pos > -1) {
            this.managed_objects.splice(pos, 1);
        }
        this.refresh_table();
    }

    setAttribute(key, val) {
        if (this.managed_attributes.indexOf(key) >= 0) {
            let self = this,
                elem_name =  `${key}_input`;
            self[elem_name].value = val;
            let evt = new Event("change",{"bubbles": true, "cancelable": true});
            this.shadowRoot.host.dispatchEvent(evt);
        }
        super.setAttribute(key, val);
    }

    refresh_table() {
        this.tbody.innerHTML = '';
        if (this.managed_objects.length > 0) {
            for (const obj of this.managed_objects) {
                let rowElem = document.createElement('tr'),
                    cl_group_id = obj.cl_group_id;
                if (cl_group_id === '') {
                    cl_group_id = 'unknown_group_id';
                }
                rowElem.setAttribute('id', `group-{cl_group_id}`);
                for (const col of this.row_attributes) {
                    let colElem = document.createElement('td');
                    colElem.classList.add(`group-col-${col}`);
                    if (obj.hasOwnProperty(col)) {
                        if (col == 'cl_group_id') {
                            colElem.innerHTML = `<a href="group.html?cl_group_id=${cl_group_id}">${obj[col]}</a>`;
                        } else {
                            colElem.innerHTML = obj[col];
                        }
                    }
                    rowElem.appendChild(colElem);
                }
                this.tbody.appendChild(rowElem);
            }
        }
    }

    /* Table sorter is based on MDN example at https://developer.mozilla.org/en-US/docs/Web/HTML/Element/table */
    tableSorter() {
        let sort_ascending = true;
        for (let table of this.shadowRoot.querySelectorAll('table')) {
            for (let th of table.tHead.rows[0].cells) {
                th.onclick = function(){
                    const tBody = table.tBodies[0];
                    const rows = tBody.rows;
                    for (let tr of rows) {
                        Array.prototype.slice.call(rows)
                        .sort(function(tr1, tr2) {
                            const cellIndex = th.cellIndex;
                            if (sort_ascending) {
                                return tr1.cells[cellIndex].textContent.localeCompare(tr2.cells[cellIndex].textContent);
                            } else {
                                return tr2.cells[cellIndex].textContent.localeCompare(tr1.cells[cellIndex].textContent);
                            }
                        })
                        .forEach(function(tr){
                            this.appendChild(this.removeChild(tr));
                        }, tBody);
                    }
                    /* Sort direction switch on click of heading */
                    if (sort_ascending) {
                        sort_ascending = false;
                    } else {
                        sort_ascending = true;
                    }
                }
            }
        }
    }

    connectedCallback() {
        this.refresh_table();
        this.tableSorter()
    }

    disconnectCallback() {
    }
}


export { Group, GroupDisplay, GroupInput, GroupTable };
window.customElements.define('group-display', GroupDisplay);
window.customElements.define('group-input', GroupInput);
window.customElements.define('group-table', GroupTable);
