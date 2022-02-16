
People
=======

This page provides people object management. Click on the people ID to view, editor or remove a people object. You can click on the column headings to sort the table. Clicking again switch directions, e.g. from ascending to descending or descending to ascending. Searching the table can be done with your browser's search in page function (e.g. command + f on macOS, control + f on Windows).


<div><button id="add-people">Add Person</button></div><p>

Manage People
-------------

<div><people-pager id="people-pager" size="10" page="0" total="0" next="0" previous="0"></people-pager> <people-table id="people-table"></people-table></div>

<script type="module" src="/widgets/people.js"></script>

<script type="module">
"use strict";

let people_table = document.getElementById('people-table'),
    add_people = document.getElementById('add-people'),
    people_pager = document.getElementById('people-pager');

add_people.addEventListener('click', function () {
    window.location.href = 'person.html';
})

function updateRow(key) {
    let oReq = new XMLHttpRequest(),
        api_path = `/api/people/${key}`;
    oReq.addEventListener('load', function () {
        let src = this.responseText,
            obj = JSON.parse(src),
            cl_people_id = obj.cl_people_id;
        people_table.set_people(cl_people_id, obj);
    });
    oReq.open('GET', api_path);
    oReq.send();
}

function updatePeopleTable() {
    /* Iterate through the fetched data, generate a people-display element
       and link to form for editing people data */
    let src = this.responseText,
        keys = JSON.parse(src),
        pager = document.getElementById('people-pager'),
        params = new URLSearchParams(document.location.search);

    pager.value = params;
    pager.setAttribute('total', len(keys));
    keys.sort();

    /* FIXME: Need to fetch a list bit filter it through either a pager or a A-Z list filter */
    let i = 0;
        page_no = pager.page;
    for (const key of keys) {
        if (pager.in_page(page_no, size, i)) {
            updateRow(key);
        }
        i++;
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
