
People
=======

This page provides people object management. Click on the people ID to view, editor or remove a people object. You can click on the column headings to sort the table. Clicking again switch directions, e.g. from ascending to descending or descending to ascending. Searching the table can be done with your browser's search in page function (e.g. command + f on macOS, control + f on Windows).


<div><button id="add-people">Add Person</button></div><p>

Manage People
-------------

<div><people-pager id="people-pager" pos="0" step="5"></people-pager> <people-table id="people-table"></people-table></div>

<script type="module" src="./widgets/config.js"></script>

<script type="module" src="/widgets/people.js"></script>

<script type="module">
"use strict";

let people_table = document.getElementById('people-table'),
    add_people = document.getElementById('add-people'),
    people_pager = document.getElementById('people-pager'),
    keys = [];

function as_integer(val) {
    if (val === null) {
        return 0;
    }
    return parseInt(val, 10);
}


add_people.addEventListener('click', function () {
    window.location.href = 'person.html';
});

people_pager.addEventListener('change', function (evt) {
    let elem = evt.target,
        pos = as_integer(elem.getAttribute('pos')),
        step = as_integer(elem.getAttribute('step'));
    console.log(`DEBUG people_pager as elem ->`, elem);
    people_table.reset_table();
    let start = 0 + pos,
        end = start + step;
    console.log(`DEBUG start -> ${start} ${typeof(start)} end -> ${end} ${typeof(end)} step -> ${step} ${typeof(step)}`);
    console.log("DEBUG keys.slice -> ", keys.slice(start, end));
    for (const key of keys.slice(start, end)) {
        updateRow(key);
    }
}, false);

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
        pager = document.getElementById('people-pager'),
        params = (new URL(document.location)).searchParams,
        pos = new Number(params.get('pos')),
        step = new Number(params.get('step'));
    /* Update the list of keys from what we retrieved. */
    keys = JSON.parse(src);

    /* We need to know step first before we can set position */
    pager.setAttribute('total', keys.length);
    if (step > 0) {
        pager.setAttribute('step', step);
    } else {
        step = pager.get_step();
    }
    if (pos >= 0) {
        pager.set_position(pos, step);
    }
    keys.sort();

    let start = 0 + pos,
        end = start + step;
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
