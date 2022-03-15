
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
    base_url = Cfg.base_url;



function savePeople() {
    console.log("DEBUG savePeople() not implemented.");
    /* FIXME: Validate form */
    /* FIXME: turn form into people object, send to API */
    /* FIXME: if successful return to list otherwise show error and remain on form */
    setTimeout(function () {
        /* Reload the current page in display mode after a save */
        window.history.go();
    }, 3000);
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
    console.log("DEBUG createPeople() ");
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
        window.location.href = `${base_url}/app/people.html`;
    }
}

function removePeople() {
    console.log("DEBUG removePeople is not implemented");
    //FIXME: Need to send delete request to service
    returnToPeopleList();
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
    oReq.open('GET', `/api/people/${people_id}`);
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
    oReq.open('GET', `/api/people/${cl_people_id}`);
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
