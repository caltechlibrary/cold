/**
 * people.js implements a common display and editing widgets for person objects.
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
  <div class="person-thesis_id"><label for="thesis_id">Thesis ID:</label> <span id="thesis_id" /></div>
  <div class="person-advisor_id"><label for="advisor_id">Advisor ID:</label> <span id="advisor_id" /></div>
  <div class="person-authors_id"><label for="authors_id">Author ID:</label> <span id="author_id" /></div>
  <div class="person-archivesspace_id"><label for="archivesspace_id">ArchivesSpace ID:</label> <span id="archivesspace_id" /></div>
  <div class="person-directory_id"><label for="directory_id">Directory ID:</label> <span id="directory_id" /></div>
  <div class="person-viaf"><label for="viaf">VIAF:</label> <span id="viaf" /></div>
  <div class="person-lcnaf"><label for="lcnaf">LCNAF:</label> <span id="lcnaf" /></div>
  <div class="person-isni"><label for="isni">ISNI:</label> <span id="isni" /></div>
  <div class="person-wikidata"><label for="wikidata">Wikidata:</label> <span id="wikidata" /></div>
  <div class="person-snac"><label for="snac">SNAC:</label> <span id="snac" /></div>
  <div class="person-image"><label for="image">Image:</label> <span id="image" /></div>
  <div class="person-educated_at"><label for="educated_at">Educated At:</label> <span id="educated_at" /></div>
  <div class="person-caltech"><label for="caltech">Caltech:</label> <span id="caltech" /></div>
  <div class="person-jpl"><label for="caltech">JPL:</label> <span id="jpl" /></div>
  <div class="person-faculty"><label for="faculty">Faculty:</label> <span id="faculty" /></div>
  <div class="person-alumn"><label for="alumn">Alumn:</label> <span id="alumn" /></div>
  <div class="person-status"><label for="status">Status:</label> <span id="status" /></div>
  <div class="person-directory_person_type"><label for="directory_person_type">Directory Person Type:</label> <span id="directory_person_type" /></div>
  <div class="person-title"><label for="title">Title:</label> <span id="title" /></div>
  <div class="person-title"><label for="title">Title:</label> <span id="title" /></div>
  <div class="person-bio"><label for="bio">BIO:</label> <span id="bio" /></div>
  <div class="person-division"><label for="division">Division:</label> <span id="division" /></div>
  <div class="person-authors_count"><label for="authors_count">Authors Count:</label> <span id="authors_count" /></div>
  <div class="person-thesis_count"><label for="thesis_count">Thesis Count:</label> <span id="thesis_count" /></div>
  <div class="person-data_count"><label for="data_count">Data Count:</label> <span id="data_count" /></div>
  <div class="person-advisor_count"><label for="advisor_count">Advisor Count:</label> <span id="advisor_count" /></div>
  <div class="person-editor_count"><label for="editor_count">Editor Count:</label> <span id="editor_count" /></div>
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
  <div class="person-thesis_id"><label for="thesis_id">Thesis ID:</label> <input id="thesis_id" name="ror" type="text" size="18" /></div>
  <div class="person-advisor_id"><label for="advisor_id">Adivsor ID:</label> <input id="advisor_id" name="ror" type="text" size="18" /></div>
  <div class="person-authors_id"><label for="authors_id">Authors ID:</label> <input id="authors_id" name="authors_id" type="text" size="18" /></div>
  <div class="person-archivesspace_id"><label for="archivesspace_id">ArchivesSpace ID:</label> <input id="archivesspace_id" name="authors_id" type="text" size="18" /></div>
  <div class="person-directory_id"><label for="directory_id">Directory ID:</label> <input id="directory_id" name="directory_id" type="text" size="18" /></div>
  <div class="person-viaf"><label for="viaf">VIAF:</label> <input id="viaf" name="viaf" type="text" size="18" /></div>
  <div class="person-lcnaf"><label for="lcnaf">LCNAF:</label> <input id="lcnaf" name="lcnaf" type="text" size="18" /></div>
  <div class="person-isni"><label for="isni">ISNI:</label> <input id="isni" name="isni" type="text" size="18" /></div>
  <div class="person-wikidata"><label for="wikidata">Wikidata:</label> <input id="wikidata" name="wikidata" type="text" size="18" /></div>
  <div class="person-image"><label for="image">Image:</label> <input id="image" name="image" type="text" size="18" /></div>
  <div class="person-educated_at"><label for="educated_at">Educated At:</label> <input id="educated_at" name="educated_at" type="text" size="18" /></div>
  <div class="person-caltech"><label for="caltech">Caltech:</label> <input id="caltech" name="caltech" type="text" size="18" /></div>
  <div class="person-jpl"><label for="jpl">JPL:</label> <input id="jpl" name="jpl" type="text" size="18" /></div>
  <div class="person-faculty"><label for="faculty">Faculty:</label> <input id="faculty" name="faculty" type="text" size="18" /></div>
  <div class="person-alumn"><label for="alumn">Alumn:</label> <input id="alumn" name="alumn" type="text" size="18" /></div>
  <div class="person-status"><label for="status">Status:</label> <input id="status" name="status" type="text" size="18" /></div>
  <div class="person-directory_person_type"><label for="directory_person_type">Directory Person Type:</label> <input id="directory_person_type" name="directory_person_type" type="text" size="18" /></div>
  <div class="person-title"><label for="title">Title:</label> <input id="title" name="title" type="text" size="18" /></div>
  <div class="person-bio"><label for="bio">Bio:</label> <textarea id="bio" name="bio" type="text" cols="18" rows="10"></textarea></div>
  <div class="person-division"><label for="division">Division:</label> <input id="division" name="division" type="text" size="18" /></div>
  <div class="person-authors_count"><label for="authors_count">Authors Count:</label> <input id="authors_count" name="authors_count" type="text" size="18" /></div>
  <div class="person-thesis_count"><label for="thesis_count">Thesis Count:</label> <input id="thesis_count" name="thesis_count" type="text" size="18" /></div>
  <div class="person-data_count"><label for="data_count">Data Count:</label> <input id="data_count" name="data_count" type="text" size="18" /></div>
  <div class="person-advisor_count"><label for="advisor_count">Advisor Count:</label> <input id="advisor_count" name="advisor_count" type="text" size="18" /></div>
  <div class="person-editor_count"><label for="editor_count">Editor Count:</label> <input id="editor_count" name="editor_count" type="text" size="18" /></div>
  <div class="person-updated"><label for="updated">Updated:</label> <input id="updated" name="updated" type="date" /></div>
</div>`;

table_template.innerHTML = `<style>
/* Default CSS */
@import "/app/widgets/people.css";
/* Site overrides */
@import "/css/people.css";
</style>
<table id="people-list">
  <thead>
    <tr>
      <th class="people-col-cl_people_id" title="click column to sort ascending, click again for descending">People ID</th>
      <th class="people-col-family-name" title="click column to sort ascending, click again for descending">Family Name</th>
      <th class="people-col-given-name" title="click column to sort ascending, click again for descending">Given Name</th>
      <th class="people-col-thesis_id" title="click column to sort ascending, click again for descending">Thesis ID</th>
      <th class="people-col-advisor_id" title="click column to sort ascending, click again for descending">Advisor ID</th>
      <th class="people-col-authors_id" title="click column to sort ascending, click again for descending">Authors ID</th>
      <th class="people-col-archivesspace_id" title="click column to sort ascending, click again for descending">ArchivesSpace ID</th>
      <th class="people-col-directory_id" title="click column to sort ascending, click again for descending">Directory ID</th>
      <th class="people-col-viaf_id" title="click column to sort ascending, click again for descending">VIAF</th>
      <th class="people-col-lacnaf" title="click column to sort ascending, click again for descending">LCNAF</th>
      <th class="people-col-isni" title="click column to sort ascending, click again for descending">ISNI</th>
      <th class="people-col-wikidata" title="click column to sort ascending, click again for descending">Wikidata</th>
      <th class="people-col-snac" title="click column to sort ascending, click again for descending">SNAC</th>
      <th class="people-col-orcid" title="click column to sort ascending, click again for descending">orcid</th>
      <th class="people-col-image" title="click column to sort ascending, click again for descending">image</th>
      <th class="people-col-educated_at" title="click column to sort ascending, click again for descending">Educated At</th>
      <th class="people-col-caltech" title="click column to sort ascending, click again for descending">Caltech</th>
      <th class="people-col-jpl" title="click column to sort ascending, click again for descending">JPL</th>
      <th class="people-col-faculty" title="click column to sort ascending, click again for descending">faculty</th>
      <th class="people-col-alumn" title="click column to sort ascending, click again for descending">alumn</th>
      <th class="people-col-status" title="click column to sort ascending, click again for descending">status</th>
      <th class="people-col-directory_person_type" title="click column to sort ascending, click again for descending">Directory Person Type</th>
      <th class="people-col-title" title="click column to sort ascending, click again for descending">Title</th>
      <th class="people-col-bio" title="click column to sort ascending, click again for descending">Bio</th>
      <th class="people-col-division" title="click column to sort ascending, click again for descending">Division</th>
      <th class="people-col-authors_count" title="click column to sort ascending, click again for descending">Authors Count</th>
      <th class="people-col-thesis_count" title="click column to sort ascending, click again for descending">Thesis Count</th>
      <th class="people-col-data_count" title="click column to sort ascending, click again for descending">Data Count</th>
      <th class="people-col-advisor_count" title="click column to sort ascending, click again for descending">Advisor Count</th>
      <th class="people-col-editor_count" title="click column to sort ascending, click again for descending">Editor Count</th>
      <th class="people-col-updated" title="click column to sort ascending, click again for descending">Updated</th>
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

function mmddyyyy(date) {
    let day = `${date.getDate()}`.padStart(2, '0'),
        month = `${date.getMonth() + 1}`.padStart(2, '0'),
        year = `${date.getFullYear()}`;
    return `${month}/${day}/${year}`
}


/******************************
 * Web worker classes
 ******************************/

let people_field_names = [ 'family_name', 'given_name', 'cl_people_id', 'thesis_id', 'advisor_id', 'authors_id', 'archivesspace_id', 'directory_id', 'viaf_id', 'lcnaf', 'isni', 'wikidata', 'snac', 'orcid', 'image', 'educated_at', 'caltech', 'jpl', 'faculty', 'alumn', 'status', 'directory_person_type', 'title', 'bio', 'division', 'authors_count', 'thesis_count', 'data_count', 'advisor_count', 'editor_count', 'updated' ];

/**
 * Person is a minimalist implementation of a Person object
 * without any component elements.
 */
class Person {
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
            obj = new Person();
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
 * PersonDisplay is a web component for displaying a single person's
 * metadata.
 */
class PersonDisplay extends HTMLElement {
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
                wrapper = this.shadowRoot.querySelector(`.people-${key}`);
            if (val == null) {
                val = '';
            }
            console.log("DEBUG people-key -> ", key, "val ->", val);
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
 * PeopleTable is a web component for displaying all the people metadata as a table.
 */
 class PeopleTable extends HTMLElement {
    constructor () {
        super();
        this.row_attributes = people_field_names;
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

    get_person(cl_people_id) {
        let pos = this.indexOf(cl_people_id);
        if (pos > -1) {
            return this.managed_objects[pos];
        }
        return null
    }

    /**
     * set_person updates the object matching "cl_people_id" to the value of object. If
     *  "cl_people_id" is not in the managed object list the default action is to append it to
     * the managed object list. If "insert_update" parameter is true, then it'll insert it at
     * start of the list.  
     */
    set_person(cl_people_id, obj, insert_update = false) {
        let pos = this.indexOf(cl_people_id);
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

    remove(cl_people_id) {
        let pos = this.indexOf(cl_people_id);
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
                    cl_people_id = obj.cl_people_id;
                if (cl_people_id === '') {
                    cl_people_id = 'unknown_people_id';
                }
                rowElem.setAttribute('id', `people-{cl_people_id}`);
                for (const col of this.row_attributes) {
                    let colElem = document.createElement('td');
                    colElem.classList.add(`people-col-${col}`);
                    if (obj.hasOwnProperty(col)) {
                        if (col == 'cl_people_id') {
                            colElem.innerHTML = `<a href="people.html?cl_people_id=${cl_people_id}">${obj[col]}</a>`;
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



export { Person, PersonDisplay, PersonInput, PeopleTable };
window.customElements.define('person-display', PersonDisplay);
window.customElements.define('person-input', PersonInput);
window.customElements.define('people-table', PeopleTable);
