
People
======

<div>back to <a href="people.html">People List</a></div><p>

<div id="people-viewer"></div>

<div id="people-controls"></div>

<script type="module" src="/widgets/people.js"></script>

<script type="module">
"use strict";
import { People } from "/widgets/people.js";

let people_viewer = document.getElementById('people-viewer'),
    people_control = document.getElementById('people-controls'),
    people_display = document.createElement('people-display'),
    people_input = document.createElement('people-input'),
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
    let obj = new People();
    people_input.value = obj;
    people_viewer.innerHTML = '';
    people_viewer.appendChild(people_input);
    show_save_buttons();
    console.log("DEBUG createPeople() ");
}

function editPeople() {
    let obj = people_display.value;
    people_input.value = obj;
    people_viewer.innerHTML = '';
    people_viewer.appendChild(people_input);
    show_save_buttons();
    console.log("DEBUG editPeople() ");
}

function returnToPeopleList() {
    window.location.href = "people.html";
}

function removePeople() {
    let obj = people_display.value,
        cl_people_id = obj.cl_people_id;
    //FIXME: Need to send delete request to service
    console.log("DEBUG removePeople() not fully implemented.");
    returnToPeopleList();
}


function show_edit_buttons() {
    people_control.innerHTML = '';
    people_control.appendChild(edit_button);
    people_control.appendChild(remove_button);
    people_control.appendChild(return_button);
}

function show_save_buttons() {
    people_control.innerHTML = '';
    people_control.appendChild(save_button);
    people_control.appendChild(cancel_button);
}

function updateDisplayPeople() {
    let src = this.responseText,
        obj = JSON.parse(src);
    people_display.value = obj;
    people_viewer.innerHTML = '';
    people_viewer.appendChild(people_display);
    show_edit_buttons();
    console.log("DEBUG updatePeople() not fully implemented.");
}

function retrievePeople(cl_people_id) {
    let oReq = new XMLHttpRequest();
    oReq.addEventListener('load', updateDisplayPeople);
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
