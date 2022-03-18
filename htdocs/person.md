
People
======

<div id="people-viewer"></div>

<div id="people-controls"></div>

<script type="module" src="./widgets/config.js"></script>

<script type="module" src="/widgets/people.js"></script>

<script type="module">
"use strict";
import { Cfg } from "/widgets/config.js";
import { People } from "/widgets/people.js";

let people_viewer = document.getElementById('people-viewer'),
    people_controls = document.getElementById('people-controls'),
    /* Edit controls */
    edit_button = document.createElement('button'),
    remove_button = document.createElement('button'),
    return_button = document.createElement('button'),
    /* Save controls */
    save_button = document.createElement('button'),
    cancel_button = document.createElement('button'),
    params = new URLSearchParams(window.location.search),
    cl_people_id = params.get('cl_people_id'),
    prefix_path = Cfg.prefix_path;

function as_bool(s) {
    if (s.startsWith('t') || s.startsWith('T') || s.startsWith('1')) {
        return true;
    }
    return false;
}

function normalize_person(data) {
    let m = new Map();
    for (const key of Object.keys(data)) {
        switch(key) {
            case "caltech":
                m[key] = as_bool(data[key]);
                break;
            case "faculty":
                m[key] = as_bool(data[key]);
                break;
            case "jpl":
                m[key] = as_bool(data[key]);
                break;
            case "alumn":
                m[key] = as_bool(data[key]);
                break;
            default:
                m[key] = data[key];
        }
    }
    return m
}


function savePeople() {
    let elem = document.querySelector('#people-viewer > people-input');
    if (elem !== null) {
        let data = elem.value,
            src = JSON.stringify(normalize_person(data)),
            method = 'POST';
        /* FIXME: Validate form */
        /* FIXME: turn form into people object, send to API */
        /* FIXME: if successful return to list otherwise show error and remain on form */
        if (cl_people_id == null) {
            cl_people_id = data['cl_people_id'];
            method = 'PUT';
        }
        let oReq = new XMLHttpRequest(),
            api_path = `${prefix_path}/api/people/${cl_people_id}`;
        oReq.addEventListener('load', function () {
            window.history.go(-1);
        });
        oReq.open(method, api_path);
        oReq.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
        oReq.send(src);
    }
}

function cancelPeople() {
    if (cl_people_id == null) {
        returnToPeopleList();
        return;
    }
    /* Reload the current page in display mode */
    window.history.go();
}

function createPeople() {
    let people_viewer = document.getElementById('people-viewer'),
        /* Editor for people */
        people_input = document.createElement('people-input');
    people_viewer.innerHTML = '';
    people_viewer.appendChild(people_input);
    show_save_buttons();
}


function returnToPeopleList() {
    let numberOfEntries = window.history.length;
    if (numberOfEntries > 1) {
        window.history.back();
    } else {
        window.location.href = `${prefix_path}/app/people.html`;
    }
}

function removePeople() {
    let oReq = new XMLHttpRequest(),
        api_path = `${prefix_path}/api/people/${cl_people_id}`;
    oReq.addEventListener('load', function () {
        returnToPeopleList();
    });
    oReq.open('DELETE', api_path);
    oReq.send();
}


function show_edit_buttons() {
    people_controls.innerHTML = '';
    people_controls.appendChild(edit_button);
    people_controls.appendChild(remove_button);
    people_controls.appendChild(return_button);
    /* FIXME: Need to wire up actions of each button */
}

function show_save_buttons() {
    people_controls.innerHTML = '';
    people_controls.appendChild(save_button);
    people_controls.appendChild(cancel_button);
    /* FIXME: Need to wire up actions of each button */
}

function editPeople() {
    console.log("DEBUG editPeople() cl_people_id ->", cl_people_id);
    let src = this.responseText,
        obj = JSON.parse(src),
        /* Display Editor for people */
        people_editor = document.createElement('people-input'),
        people_viewer = document.getElementById('people-viewer');
    people_editor.value = obj;
    people_viewer.innerHTML = '';
    people_viewer.appendChild(people_editor);
    show_save_buttons();
}

function updatePeople() {
    let elem = document.querySelector('div#people-viewer people-display'),
        people_id = elem.getAttribute('cl_people_id'),
        oReq = new XMLHttpRequest();

    oReq.addEventListener('load', editPeople);
    oReq.open('GET', `${prefix_path}/api/people/${people_id}`);
    oReq.send();
}

function displayPeople() {
    let src = this.responseText,
        obj = JSON.parse(src),
        /* Display people */
        people_display = document.createElement('people-display');
    people_display.value = obj;
    people_viewer.innerHTML = '';
    people_viewer.appendChild(people_display);
    show_edit_buttons();
}

function retrievePeople(cl_people_id) {
    let oReq = new XMLHttpRequest();
    oReq.addEventListener('load', displayPeople);
    oReq.open('GET', `${prefix_path}/api/people/${cl_people_id}`);
    oReq.send();
}

save_button.innerHTML = 'Save';
save_button.addEventListener('click', savePeople, false);
cancel_button.innerHTML = 'Cancel';
cancel_button.addEventListener('click', cancelPeople, false);
edit_button.innerHTML = 'Edit';
edit_button.addEventListener('click', updatePeople, false);
remove_button.innerHTML = 'Remove';
remove_button.addEventListener('click', removePeople, false);
return_button.innerHTML = "Return to list";
return_button.addEventListener('click', returnToPeopleList, false);
if (! cl_people_id) {
    createPeople();
} else {
    retrievePeople(cl_people_id);
}
</script>
