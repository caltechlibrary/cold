
People
=======

This page provides person management. Click on the person ID to view, editor or remove a person. You can click on the column headings to sort the table. Clicking again switch directions, e.g. from ascending to descending or descending to ascending. Searching the table can be done with your browser's search in page function (e.g. command + f on macOS, control + f on Windows).


<div><button id="add-person">Add Person</button></div><p>

Manage People
-------------

<div><people-table id="people-table"></people-table></div>

<script type="module" src="/widgets/people.js"></script>

<script type="module">
"use strict";

let people_table = document.getElementById('people-table'),
    add_person = document.getElementById('add-person');

add_person.addEventListener('click', function () {
    window.location.href = 'person.html';
})

function updateRow(key) {
    let oReq = new XMLHttpRequest(),
        api_path = `/api/people/${key}`;
    oReq.addEventListener('load', function () {
        let src = this.responseText,
            obj = JSON.parse(src),
            cl_person_id = obj.cl_person_id;
        people_table.set_person(cl_person_id, obj);
    });
    oReq.open('GET', api_path);
    oReq.send();
}

function updatePeopleTable() {
    /* Iterate through the fetched data, generate a person-display element
       and link to form for editing person data */
    let src = this.responseText,
            keys = JSON.parse(src);
    keys.sort();
    let i = 0;
    for (const key of keys) {
        updateRow(key);
    }
}

function refreshPeople() {
    let oReq = new XMLHttpRequest();
    oReq.addEventListener('load', updatePeopleTable);
    oReq.open('GET', '/api/people');
    oReq.send();
}

refreshPeople();
</script>
