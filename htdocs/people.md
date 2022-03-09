
People
=======

This page provides people object management. Click on the people ID to view, editor or remove a people object. You can click on the column headings to sort the table. Clicking again switch directions, e.g. from ascending to descending or descending to ascending. Searching the table can be done with your browser's search in page function (e.g. command + f on macOS, control + f on Windows).


<div><button id="add-people">Add Person</button></div><p>

Manage People
-------------

<div><people-pager id="people-pager" pos="0" size="25"></people-pager> <people-table id="people-table"></people-table></div>

<script type="module" src="./widgets/config.js"></script>

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
        params = (new URL(document.location)).searchParams, /* new URLSearchParams(document.location.search), */
        pos = new Number(params.get('pos')),
        size = new Number(params.get('size'));

    console.log("DEBUG document.location", document.location);
    console.log("DEBUG pos, size", pos, size);
    /* We need to know size first before we can set position */
    pager.setAttribute('total', keys.length);
    if (size > 0) {
        pager.setAttribute('size', size);
    } else {
        size = pager.get_size();
    }
    if (pos >= 0) {
        pager.set_position(pos, size);
    }
    keys.sort();
    console.log("DEBUG pos/size", pos, size);

    let start = 0 + pos,
        end = start + size;
    console.log("DEBUG start/end", start, end);
    /* FIXME: debugging, manually setting start end *
    start = 3; end = 5; */
    for (const key of keys.slice(start, end)) {
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
