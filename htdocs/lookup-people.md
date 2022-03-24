
Lookup People
=============

This page provides a lookup by field. Select the field to do the lookup from the pulldown and then enter a value
and press go. Press "reset" button to clear the results.


<div><label for="lookup-field"> Lookup person by</label> <select id="lookup-field" name="field"><option value="family_name">Family Name</option><option value="given_name">Given Name</option><option value="orcid">ORCID</option><option value="thesis_id">Thesis ID</option><option value="advisor_id">Advisor ID</option><option value="authors_id">Author ID</option><option value="archivesspace_id">ArchivesSpace ID</option><option value="directory_id">Directory ID</option><option value="viaf">VIAF</option><option value="lcnaf">LCNAF</option><option value="isni">ISNI</option><option value="wikidata">Wikidata</option><option value="snac">SNAC</option><option value="caltech">Caltech</option><option value="jpl">JPL</option><option value="faculty">Faculty</option><option value="alumn">Alumni</option><option value="status">Status</option><option value="directory_person_type">Directory Person Type</option><option value="title">Title</option><option value="division">Division</option><option value="updated">Updated</option></select> <label for="lookup-value">using value</label> <input id="lookup-value" name="value" type="text"> <button id="lookup-go" name="lookup-go" title="Run a lookup and show results">Go</button> <button id="lookup-reset" name="lookup-reset" title="Clear prior lookup results">Reset</button></div><p>

<div><a href="people.html"><button>Return to People Manager</button></a></div><p>

<div id="lookup-message"></div>

<div id="list-results"></div>

<script type="module" src="./widgets/config.js"></script>

<script type="module" src="./widgets/people.js"></script>

<script type="module">
"use strict";
import { Cfg } from './widgets/config.js';
let prefix_path = Cfg.prefix_path,
    collection = 'people',
    field_elem = document.getElementById('lookup-field'),
    value_elem = document.getElementById('lookup-value'),
    go_button = document.getElementById('lookup-go'),
    reset_button = document.getElementById('lookup-reset'),
    lookup_message = document.getElementById('lookup-message'),
    list_results = document.getElementById('list-results'),
    keys = [];

go_button.addEventListener('click', lookupPeople, false);
reset_button.addEventListener('click', function () {
    lookup_message.textContent = `Lookup results cleared`;
    list_results.innerHTML = ``;
}, false);

function updateRow(key, people_table) {
    let oReq = new XMLHttpRequest(),
        api_path = `${prefix_path}/api/people/${key}`;
    oReq.addEventListener('load', function () {
        let src = this.responseText,
            obj = JSON.parse(src),
            cl_people_id = obj.cl_people_id;
        people_table.set_people(cl_people_id, obj, false);
        people_table.refresh_table();
    });
    oReq.open('GET', api_path);
    oReq.send();
}

function updatePeopleTable() {
    /* Iterate through the fetched data, generate a people-display element
       and link to form for editing people data */
    let src = this.responseText,
        pager = document.getElementById('people-pager'),
        params = (new URL(document.location)).searchParams,
        pos = new Number(params.get('pos')),
        step = new Number(params.get('step')),
        people_table = document.createElement('people-table');
    people_table.setAttribute('id', 'people-table');
    list_results.appendChild(people_table);
    console.log(`DEBUG people src ${src}`);
    /* Update the list of keys from what we retrieved. */
    keys = JSON.parse(src);
    lookup_message.textContent = `${keys.length} people found`;
    if (keys.length === 1) {
        window.location.href = `person.html?cl_people_id=${keys[0]}`;
        return;
    }
    for (const key of keys) {
        updateRow(key, people_table);
    }
}

function lookupPeople() {
    let oReq = new XMLHttpRequest(),
        field = field_elem.value,
        value = value_elem.value;
    list_results.innerHTML = '';
    oReq.addEventListener('load', updatePeopleTable);
    oReq.open('GET', `${prefix_path}/api/crosswalk/people/${field}/${value}`);
    oReq.send();
}
</script>
