
People
======

<div id="people-viewer"></div>

<div id="people-controls"></div>

<script type="module" src="/widgets/people.js"></script>

<script type="module">
"use strict";
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
    cl_people_id = params.get('cl_people_id');


function savePeople() {
    let obj = people_input.value;
    people_display.value = obj;
    //FIXME: Need to seen this back to service.
    people_viewer.innerHTML = '';
    people_viewer.appendChild(people_display);
    show_edit_buttons();
    console.log("DEBUG savePeople() not fully implemented.");
}

function cancelPeople() {
    people_viewer.innerHTML = '';
    people_viewer.appendChild(people_display);
    show_edit_buttons();
    console.log("DEBUG cancelPeople()");
}

function createPeople() {
    console.log("DEBUG createPeople() ");
    let obj = new People(),
        /* Editor for people */
        people_input = document.createElement('people-input');
    people_input.value = obj;
    people_viewer.innerHTML = '';
    people_viewer.appendChild(people_input);
    show_save_buttons();
}

function editPeople() {
    console.log("DEBUG editPeople() ");
    let obj = people_display.value,
        /* Editor for people */
        people_input = document.createElement('people-input');
    people_input.value = obj;
    people_viewer.innerHTML = '';
    people_viewer.appendChild(people_input);
    show_save_buttons();
}

function returnToPeopleList() {
    window.location.href = "people.html";
}

function removePeople() {
    let obj = people_display.value,
        cl_people_id = obj.cl_people_id;
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

function displayPeople() {
    console.log("DEBUG updatePeople() not fully implemented.");
    let src = this.responseText,
        obj = JSON.parse(src),
        /* Display or Editor for people */
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
save_button.addEventListener('click', savePeople);
cancel_button.innerHTML = 'Cancel';
cancel_button.addEventListener('click', cancelPeople);
edit_button.innerHTML = 'Edit';
edit_button.addEventListener('click', editPeople);
remove_button.innerHTML = 'Remove';
remove_button.addEventListener('click', removePeople);
return_button.innerHTML = "Return to list";
return_button.addEventListener('click', returnToPeopleList);
if (! cl_people_id) {
    createPeople();
} else {
    retrievePeople(cl_people_id);
}
</script>
