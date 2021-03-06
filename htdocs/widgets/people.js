/**
 * people.js implements a common display and editing widgets for people objects.
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

import { Cfg } from './config.js';

const prefix_path = Cfg.prefix_path;

const display_template = document.createElement('template'),
      input_template = document.createElement('template'),
      table_template = document.createElement('template'),
      pager_template = document.createElement('template');

/*
 * Template definitions
 */
display_template.innerHTML = `<style>
/* Default CSS */
@import "${prefix_path}/app/widgets/people.css";
</style>
<div class="people-display">
  <div class="people-cl_people_id"><label for="cl_people_id">People ID:</label> <span id="cl_people_id" /></div>
  <div class="people-family_name"><label for="family_name">Family:</label> <span id="family_name" /></div>
  <div class="people-given_name"><label for="given_name">Given:</label> <span id="given_name" /></div>
  <div class="people-honorific"><label for="honorific">Honorific:</label> <span id="honorific" /></div>
  <div class="people-lineage"><label for="lineage">Lineage:</labe> <span id="lineage" /></div>
  <div class="people-orcid"><label for="orcid">ORCID:</label> <span id="orcid" /></div>
  <div class="people-thesis_id"><label for="thesis_id">Thesis ID:</label> <span id="thesis_id" /></div>
  <div class="people-advisor_id"><label for="advisor_id">Advisor ID:</label> <span id="advisor_id" /></div>
  <div class="people-authors_id"><label for="authors_id">Author ID:</label> <span id="authors_id" /></div>
  <div class="people-archivesspace_id"><label for="archivesspace_id">ArchivesSpace ID:</label> <span id="archivesspace_id" /></div>
  <div class="people-directory_id"><label for="directory_id">Directory ID:</label> <span id="directory_id" /></div>
  <div class="people-viaf"><label for="viaf">VIAF:</label> <span id="viaf" /></div>
  <div class="people-lcnaf"><label for="lcnaf">LCNAF:</label> <span id="lcnaf" /></div>
  <div class="people-isni"><label for="isni">ISNI:</label> <span id="isni" /></div>
  <div class="people-wikidata"><label for="wikidata">Wikidata:</label> <span id="wikidata" /></div>
  <div class="people-snac"><label for="snac">SNAC:</label> <span id="snac" /></div>
  <div class="people-image"><label for="image">Image:</label> <span id="image" /></div>
  <div class="people-educated_at"><label for="educated_at">Educated At:</label> <span id="educated_at" /></div>
  <div class="people-caltech"><label for="caltech">Caltech:</label> <span id="caltech" /></div>
  <div class="people-jpl"><label for="caltech">JPL:</label> <span id="jpl" /></div>
  <div class="people-faculty"><label for="faculty">Faculty:</label> <span id="faculty" /></div>
  <div class="people-alumn"><label for="alumn">Alumn:</label> <span id="alumn" /></div>
  <div class="people-status"><label for="status">Status:</label> <span id="status" /></div>
  <div class="people-directory_person_type"><label for="directory_person_type">Directory Person Type:</label> <span id="directory_person_type" /></div>
  <div class="people-title"><label for="title">Title:</label> <span id="title" /></div>
  <div class="people-bio"><label for="bio">BIO:</label> <span id="bio" /></div>
  <div class="people-division"><label for="division">Division:</label> <span id="division" /></div>
  <div class="people-updated"><label for="updated">Updated:</label> <span id="updated" /></div>
</div>
`;

input_template.innerHTML = `<style>
/* Default CSS */
@import "${prefix_path}/app/widgets/people.css";
</style>
<div class="people-input">
  <div class="people-cl_people_id"><label for="cl_people_id">People ID:</label> <input required id="cl_people_id" name="cl_people_id" type="text" /></div>
  <div class="people-family_name"><label for="family_name">Family Name:</label> <input id="family_name" name="family_name" type="text" /></div>
  <div class="people-given_name"><label for="given_name">Given Name:</label> <input id="given_name" name="given_name" type="text" /></div>
  <div class="people-honorific"><label for="honorific">Honorific:</label> <input id="honorific" honorific="honorific" type="text" /></div>
  <div class="people-lineage"><label for="lineage">Lineage:</label> <input id="lineage" name="lineage" type="text" /></div>
  <div class="people-orcid"><label for="orcid">ORCID:</label> <input id="orcid" name="orcid" type="text" size="18" /></div>
  <div class="people-thesis_id"><label for="thesis_id">Thesis ID:</label> <input id="thesis_id" name="ror" type="text" size="18" /></div>
  <div class="people-advisor_id"><label for="advisor_id">Adivsor ID:</label> <input id="advisor_id" name="ror" type="text" size="18" /></div>
  <div class="people-authors_id"><label for="authors_id">Authors ID:</label> <input id="authors_id" name="authors_id" type="text" size="18" /></div>
  <div class="people-archivesspace_id"><label for="archivesspace_id">ArchivesSpace ID:</label> <input id="archivesspace_id" name="authors_id" type="text" size="18" /></div>
  <div class="people-directory_id"><label for="directory_id">Directory ID:</label> <input id="directory_id" name="directory_id" type="text" size="18" /></div>
  <div class="people-viaf"><label for="viaf">VIAF:</label> <input id="viaf" name="viaf" type="text" size="18" /></div>
  <div class="people-lcnaf"><label for="lcnaf">LCNAF:</label> <input id="lcnaf" name="lcnaf" type="text" size="18" /></div>
  <div class="people-isni"><label for="isni">ISNI:</label> <input id="isni" name="isni" type="text" size="18" /></div>
  <div class="people-wikidata"><label for="wikidata">Wikidata:</label> <input id="wikidata" name="wikidata" type="text" size="18" /></div>
  <div class="people-snac"><label for="scac">SNAC:</label> <input id="snac" name="snac" type="text" size="18" /></div>
  <div class="people-image"><label for="image">Image:</label> <input id="image" name="image" type="text" size="18" /></div>
  <div class="people-educated_at"><label for="educated_at">Educated At:</label> <input id="educated_at" name="educated_at" type="text" size="18" /></div>
  <div class="people-caltech"><label for="caltech">Caltech:</label>
    <select id="caltech" name="caltech">
        <option value="false">False</option>
        <option value="true">True</option>
    </select>
  </div>
  <div class="people-jpl"><label for="jpl">JPL:</label>
    <select id="jpl" name="jpl">
        <option value="false">False</option>
        <option value="true">True</option>
    </select>
  </div>
  <div class="people-faculty"><label for="faculty">Faculty:</label>
    <select id="faculty" name="faculty">
        <option value="false">False</option>
        <option value="true">True</option>
    </select>
  </div>
  <div class="people-alumn"><label for="alumn">Alumn:</label>
   <select id="alumn" name="alumn">
        <option value="false">False</option>
        <option value="true">True</option>
   </select>
  </div>
  <div class="people-status"><label for="status">Status:</label> <input id="status" name="status" type="text" size="18" /></div>
  <div class="people-directory_person_type"><label for="directory_person_type">Directory Person Type:</label> <input id="directory_person_type" name="directory_person_type" type="text" size="18" /></div>
  <div class="people-title"><label for="title">Title:</label> <input id="title" name="title" type="text" size="18" /></div>
  <div class="people-bio"><label for="bio">Bio:</label> <textarea id="bio" name="bio" type="text" cols="18" rows="10"></textarea></div>
  <div class="people-division"><label for="division">Division:</label> <input id="division" name="division" type="text" size="18" /></div>
  <div class="people-updated"><label for="updated">Updated:</label> <input id="updated" name="updated" type="date" readonly /></div>
</div>`;

table_template.innerHTML = `<style>
/* Default CSS */
@import "${prefix_path}/app/widgets/people.css";
</style>
<table id="people-list" class="people-list">
  <thead>
    <tr>
      <th class="people-col-cl_people_id" title="click column to sort ascending, click again for descending">People ID</th>
      <th class="people-col-family_name" title="click column to sort ascending, click again for descending">Family Name</th>
      <th class="people-col-given_name" title="click column to sort ascending, click again for descending">Given Name</th>
      <th class="people-col-honorific" title="click column to sort ascending, click again for descending">Honorific</th>
      <th class="people-col-lineage" title="click column to sort ascending, click again for descending">Lineage</th>
      <th class="people-col-orcid" title="click column to sort ascending, click again for descending">orcid</th>
      <th class="people-col-thesis_id no-display" title="click column to sort ascending, click again for descending">Thesis ID</th>
      <th class="people-col-advisor_id no-display" title="click column to sort ascending, click again for descending">Advisor ID</th>
      <th class="people-col-authors_id" title="click column to sort ascending, click again for descending">Authors ID</th>
      <th class="people-col-archivesspace_id no-display" title="click column to sort ascending, click again for descending">ArchivesSpace ID</th>
      <th class="people-col-directory_id no-display" title="click column to sort ascending, click again for descending">Directory ID</th>
      <th class="people-col-viaf no-display" title="click column to sort ascending, click again for descending">VIAF</th>
      <th class="people-col-lcnaf no-display" title="click column to sort ascending, click again for descending">LCNAF</th>
      <th class="people-col-isni no-display" title="click column to sort ascending, click again for descending">ISNI</th>
      <th class="people-col-wikidata no-display" title="click column to sort ascending, click again for descending">Wikidata</th>
      <th class="people-col-snac no-display" title="click column to sort ascending, click again for descending">SNAC</th>
      <th class="people-col-image no-display" title="click column to sort ascending, click again for descending">image</th>
      <th class="people-col-educated_at no-display" title="click column to sort ascending, click again for descending">Educated At</th>
      <th class="people-col-caltech no-display" title="click column to sort ascending, click again for descending">Caltech</th>
      <th class="people-col-jpl no-display" title="click column to sort ascending, click again for descending">JPL</th>
      <th class="people-col-faculty" title="click column to sort ascending, click again for descending">faculty</th>
      <th class="people-col-alumn" title="click column to sort ascending, click again for descending">alumn</th>
      <th class="people-col-status no-display" title="click column to sort ascending, click again for descending">status</th>
      <th class="people-col-directory_person_type no-display" title="click column to sort ascending, click again for descending">Directory Person Type</th>
      <th class="people-col-title no-display" title="click column to sort ascending, click again for descending">Title</th>
      <th class="people-col-bio no-display" title="click column to sort ascending, click again for descending">Bio</th>
      <th class="people-col-division" title="click column to sort ascending, click again for descending">Division</th>
      <th class="people-col-updated" title="click column to sort ascending, click again for descending">Updated</th>
  </thead>
  <tbody>
  </tbody>
</table>
`;

pager_template.innerHTML = `<style>
/* Default CSS */
@import "${prefix_path}/app/widgets/people.css";
</style>
<div class="people-pager">
  <a href="" id="people-pager-previous" class="people-pager-previous">Previous</a> 
  <input id="people-pager-pos" type="range" min="0" max="-1" step="1" value="0" />
  <a href="" id="people-pager-next" class="people-pager-next">Next</a>
</div>
`;

/*
 * Utility functions
 */
function as_integer(val) {
    if ((val === null) || (val === undefined) || (val == 'null')) {
        return 0;
    }
    return parseInt(val, 10);
}

let today = new Date();

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

let people_field_names =  [ 'cl_people_id', 'family_name', 'given_name', 'honorific', 'lineage', 
                            'orcid', 'thesis_id', 'advisor_id', 'authors_id', 'archivesspace_id',
                            'directory_id', 'viaf', 'lcnaf', 'isni', 'wikidata', 'snac', 'image',
                            'educated_at', 'caltech', 'jpl', 'faculty', 'alumn', 'status',
                            'directory_person_type', 'title', 'bio', 'division', 'updated' ];

let suppressed_columns = [ 'thesis_id', 'advisor_id', 'archivesspace_id',
                           'directory_id', 'viaf', 'lcnaf', 'isni', 'wikidata', 'snac', 'image',
                           'educated_at', 'caltech', 'jpl', 'status', 'directory_person_type', 'title', 'bio' ];


/**
 * People is a minimalist implementation of a People object
 * without any component elements.
 */
class People {
    constructor() {
        for (const key of people_field_names) {
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
            obj = new People();
        }
        self = Object.assign(self, obj);
        if (obj.updated !== undefined) {
            this.updated = yyyymmdd(now);
        }
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
 * PeopleDisplay is a web component for displaying a single person's
 * metadata.
 */
class PeopleDisplay extends HTMLElement {
    constructor () {
        super();
        this.managed_attributes = people_field_names;
        for (const key of people_field_names) {
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
                let evt = new Event("change", { "bubbles": true, "cancelable": true });
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
        }
        return obj;
    }

    get as_json() {
        return JSON.stringify(this.value);
    }

    set value(obj) {
        let self = this;
        for (const key of this.managed_attributes) {
            let elem = this.shadowRoot.getElementById(key);
            if (obj.hasOwnProperty(key) && (elem !== null)) {
                this.setAttribute(key, obj[key]);
                elem.innerHTML = obj[key];
            }
        }
    }

    setAttribute(key, val) {
        if (this.managed_attributes.indexOf(key) >= 0) {
            let self = this,
                elem = this.shadowRoot.getElementById(key);
            elem.innerHTML = val;
            let evt = new Event("change", { "bubbles": true, "cancelable": true });
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
                wrapper = this.shadowRoot.querySelector(`.people-${key}`);
            if ((val == undefined) || (val == null)) {
                val = '';
                if (key === 'updated') {
                    val == yyyymmdd(today);
                }
            }
            if (self.hasOwnProperty(elem_name)) {
                self[elem_name].textContent = val;
                self[elem_name].addEventListener('change', self[fnNameOnChange]);    
            }
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

class PeopleInput extends HTMLElement {
    constructor () {
        super();
        this.managed_attributes = people_field_names
        for (const key of people_field_names) {
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
                let evt = new Event("change", { "bubbles": true, "cancelable": true });
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
            let evt = new Event("change", { "bubbles": true, "cancelable": true });
            this.shadowRoot.host.dispatchEvent(evt);
        }
        super.setAttribute(key, val);
    }

    connectedCallback() {
        let self = this;
        this.innerHTML = '';
        for (const key of this.managed_attributes) {
            let val = this.getAttribute(key),
                elem_name = `${key}_input`,
                fnNameOnChange = `onchange_${key}`;
            if ((val == undefined) || (val == null)) {
                val = '';
                if  (key === 'updated') {
                    val == yyyymmdd(today);
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
 * PeopleTable is a web component for displaying all the people metadata as a table.
 */
 class PeopleTable extends HTMLElement {
    constructor () {
        super();
        this.is_sortable = false;
        this.managed_attributes = people_field_names;
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

    indexOf(cl_people_id) {
        let i = 0,
            res = -1;
        for (const obj of this.managed_objects) {
            if (obj.cl_people_id == cl_people_id) {
                res = i;
                break;
            }
            i++;
        }
        return res;
    }

    get_people(cl_people_id) {
        let pos = this.indexOf(cl_people_id);
        if (pos > -1) {
            return this.managed_objects[pos];
        }
        return null
    }

    /**
     * set_people updates the managed object list or appends it to list.
     */
    set_people(cl_people_id, obj) {
        /* Check to see id we have an existing managed object */
        let pos = this.indexOf(cl_people_id);
        if (pos > -1) {
            return this.managed_objects[pos];
        }
        this.managed_objects.push(obj);
    }

    insert(obj) {
        this.managed_objects.shift(obj);
    }

    append(obj) {
        this.managed_objects.push(obj);
    }

    remove(cl_people_id) {
        let pos = this.indexOf(cl_people_id);
        if (pos > -1) {
            this.managed_objects.splice(pos, 1);
        }
    }

    setAttribute(key, val) {
        if (this.managed_attributes.indexOf(key) >= 0) {
            let self = this,
                elem_name =  `${key}_input`;
            self[elem_name].value = val;
            let evt = new Event("change",{ "bubbles": true, "cancelable": true });
            this.shadowRoot.host.dispatchEvent(evt);
        }
        super.setAttribute(key, val);
    }

    reset_table() {
        this.managed_objects = [];
        this.tbody.innerHTML = '';
    }

    refresh_table() {
        this.tbody.innerHTML = '';
        if (this.managed_objects.length > 0) {
            /* Resort managed object list so it remains in order of cl_people_id */
            this.managed_objects.sort(function (a, b) {
                let id_1 = a.cl_people_id, id_2 = b.cl_people_id;
                return id_1.toLowerCase().localeCompare(id_2.toLowerCase());
                return 
            });
            for (const obj of this.managed_objects) {
                let rowElem = document.createElement('tr'),
                    cl_people_id = obj.cl_people_id;
                if (cl_people_id === '') {
                    cl_people_id = 'unknown_people_id';
                }
                rowElem.setAttribute('id', `people-{cl_people_id}`);
                for (const col of this.managed_attributes) {
                    let colElem = document.createElement('td');
                    colElem.classList.add(`people-col-${col}`);
                    if (obj.hasOwnProperty(col)) {
                        if (col == 'cl_people_id') {
                            colElem.innerHTML = `<a href="person.html?cl_people_id=${cl_people_id}" title="Edit this record">${obj[col]}</a>`;
                        } else if (col === 'orcid') {
                            if ((obj[col] !== undefined) && (obj[col] !== '')) {
                                colElem.innerHTML = `<a href="https://orcid.org/${obj[col]}" title="Go to ORCID record at orcid.org website">${obj[col]}</a>`;
                            } else {
                                colElem.innerHTML = obj[col];
                            }
                        } else {
                            colElem.textContent = obj[col];
                        }
                    }
                    if (suppressed_columns.indexOf(col) > -1) {
                        colElem.classList.add("no-display");
                    } else {
                        colElem.classList.remove('no-display');
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
                th.classList.add('is-clickable');
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
        if (this.is_sortable) {
            this.tableSorter();
        } 
    }

    disconnectCallback() {
    }
}


class PeoplePager extends HTMLElement {
    constructor () {
        super();
        this.managed_attributes = [ 'step', 'pos', 'next', 'previous', 'total' ];
        for (const key of this.managed_attributes) {
            if (this.getAttribute(key) == null) {
                switch (key) {
                    case 'step':
                        this.step = 25;
                        break;
                    case 'pos':
                        this.pos = 0;
                        break;
                    case 'next':
                        this.next = 0;
                        break;
                    case 'previous':
                        this.previous = 0;
                        break;
                    case 'total':
                        this.total = -1;
                        break;
                }
            }
        }

        this.attachShadow({ mode: 'open' });
        this.shadowRoot.appendChild(pager_template.content.cloneNode(true));
    }

    get value() {
        let obj = {};
        for (const key of this.managed_attributes) {
            obj[key] = this.getAttribute(key);
        }
        return obj;
    }

    get as_json() {
        return JSON.stringify(this.value);
    }

    set value(obj) {
        for (const key of this.managed_attributes) {
            let elem_name = `people-pager-${key}`,
                elem = this.shadowRoot.getElementById(elem_name);
            if (obj.hasOwnProperty(key)) {
                this.setAttribute(key, obj[key]);
                elem.textContent = obj[key];
            }
        }
    }

    get_position() {
        let pos = this.getAttribute('pos');
        return new Numner(pos);
    }

    set_position(pos, step) {
        let next = pos + step,
            prev = pos - step,
            total = this.getAttribute('total');
        if (prev < 0) {
            prev = 0;
        }
        if ((total > -1) && (next >= total)) {
            next = total - step;
        }
        this.setAttribute('pos', pos);
        this.setAttribute('step', step);
        let elem = this.shadowRoot.getElementById('people-pager-next');
        elem.setAttribute('href', `?step=${step}&pos=${next}`);
        elem = this.shadowRoot.getElementById('people-pager-previous');
        elem.setAttribute('href', `?step=${step}&pos=${prev}`);
        elem = this.shadowRoot.getElementById('people-pager-pos');
        elem.setAttribute('max', `${total}`);
        elem.value = pos;
    }

    get_step() {
        let step = this.getAttribute('step');
        return new Number(step);
    }

    setAttribute(key, val) {
        super.setAttribute(key, val);
        if (this.managed_attributes.indexOf(key) >= 0) {
            let elem_name =  `people-pager-${key}`,
                elem = this.shadowRoot.getElementById(elem_name);
            if (elem !== null) {
                if (val === null) {
                    val = '';
                }
                elem.textContent = val;
                let evt = new Event("change", { "bubbles": true, "cancelable": true });
                this.shadowRoot.host.dispatchEvent(evt);    
            }
        }
    }

    connectedCallback() {
        let self = this,
            pos = as_integer(this.getAttribute('pos')),
            step = as_integer(this.getAttribute('step')),
            total = as_integer(this.getAttribute('total')),
            elem = this.shadowRoot.getElementById('people-pager-pos');
        /* Allow override from URL search params */
        let params = new URL(document.location).searchParams;

        if (params.get('step')) {
            step = as_integer(params.get('step'));
        }    

        this.innerHTML = '';
        elem.setAttribute('name', 'go to record');
        elem.setAttribute('title', `Go to record`);
        elem.value = pos;
        elem.setAttribute('step', step);
        elem.setAttribute('min', 0);
        elem.setAttribute('max', total);

        for (const key of this.managed_attributes) {
            elem = this.shadowRoot.getElementById(`people-pager-${key}`);
            if ([ 'previous', 'next'].indexOf(key) >= 0) {
                let href = elem.getAttribute('href'),
                    val = this.getAttribute(key);
                if (key == 'previous') {
                    let previous = 0;
                     if (pos > step) {
                        previous = pos - step;
                    }
                    elem.setAttribute('href', `?step=${step}&pos=${previous}`);
                }
                if (key == 'next') {
                    let next = pos + step;
                    if ((total > 0) && (next >= total)) {
                        next = total - 1;
                    }
                    elem.setAttribute('href', `?step=${step}&pos=${next}`);
                }
            } else if (elem !== null) {
                let val = this.getAttribute(key);
                if (val === null) {
                    if( this.defaults.has(key)) {
                        val = this.defaults.get(key);
                    } else {
                        val = '';
                    }
                }
                elem.textContent = val;
            }
        }
        elem = this.shadowRoot.getElementById('people-pager-pos');
        elem.addEventListener('change', function (evt) {
            let slider = evt.target,
                params = (new URL(document.location)).searchParams,
                pos = as_integer(elem.value),
                step = as_integer(params.get('step'));

            if (step === 0) {
                step = self.getAttribute('step');
            }
            slider.setAttribute('title', `Go to record ${pos}`);
            self.set_position(pos, step);
        
            /* I want to maintain changes in the history and update the URL ... */
            const url = new URL(window.location);
            url.searchParams.set('pos', pos);
            url.searchParams.set('step', step);
            window.history.pushState({}, '', url);
        }, true);        
    }

    disconnectCallback() {
        let self = this;
        for (const key of this.managed_attributes) {
            let elem = this.shadowRoot.getElementById(`people-pager-${key}`),
                fnNameOnChange = `onchange_people_pager_${key}`;
            elem.removeEventListener('change', fnNameOnChange);
        }
    }
}


export { People, PeopleDisplay, PeopleInput, PeopleTable, PeoplePager };
window.customElements.define('people-display', PeopleDisplay);
window.customElements.define('people-input', PeopleInput);
window.customElements.define('people-table', PeopleTable);
window.customElements.define('people-pager', PeoplePager);
