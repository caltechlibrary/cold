
Person
======

<div>back to <a href="people.html">People List</a></div><p>

<div id="person-viewer"></div>

<div id="person-controls"></div>

<script type="module" src="/widgets/people.js"></script>

<script type="module">
"use strict";
import { Person } from "/widgets/people.js";

let person_viewer = document.getElementById('person-viewer'),
    person_control = document.getElementById('person-controls'),
    person_display = document.createElement('person-display'),
    person_input = document.createElement('person-input'),
    /* Edit controls */
    edit_button = document.createElement('button'),
    remove_button = document.createElement('button'),
    return_button = document.createElement('button'),
    /* Save controls */
    save_button = document.createElement('button'),
    cancel_button = document.createElement('button'),
    params = new URLSearchParams(window.location.search),
    cl_people_id = params.get('cl_people_id');


function savePerson() {
    let obj = person_input.value;
    person_display.value = obj;
    //FIXME: Need to seen this back to service.
    person_viewer.innerHTML = '';
    person_viewer.appendChild(person_display);
    show_edit_buttons();
    console.log("DEBUG savePerson() not fully implemented.");
}

function cancelPerson() {
    person_viewer.innerHTML = '';
    person_viewer.appendChild(person_display);
    show_edit_buttons();
    console.log("DEBUG cancelPerson()");
}

function createPerson() {
    let obj = new Person();
    person_input.value = obj;
    person_viewer.innerHTML = '';
    person_viewer.appendChild(person_input);
    show_save_buttons();
    console.log("DEBUG createPerson() ");
}

function editPerson() {
    let obj = person_display.value;
    person_input.value = obj;
    person_viewer.innerHTML = '';
    person_viewer.appendChild(person_input);
    show_save_buttons();
    console.log("DEBUG editPerson() ");
}

function returnToPersonList() {
    window.location.href = "people.html";
}

function removePerson() {
    let obj = person_display.value,
        cl_people_id = obj.cl_people_id;
    //FIXME: Need to send delete request to service
    console.log("DEBUG removePerson() not fully implemented.");
    returnToPersonList();
}


function show_edit_buttons() {
    person_control.innerHTML = '';
    person_control.appendChild(edit_button);
    person_control.appendChild(remove_button);
    person_control.appendChild(return_button);
}

function show_save_buttons() {
    person_control.innerHTML = '';
    person_control.appendChild(save_button);
    person_control.appendChild(cancel_button);
}

function updateDisplayPerson() {
    let src = this.responseText,
        obj = JSON.parse(src);
    person_display.value = obj;
    person_viewer.innerHTML = '';
    person_viewer.appendChild(person_display);
    show_edit_buttons();
    console.log("DEBUG updatePerson() not fully implemented.");
}

function retrievePerson(cl_people_id) {
    let oReq = new XMLHttpRequest();
    oReq.addEventListener('load', updateDisplayPerson);
    oReq.open('GET', `/api/people/${cl_people_id}`);
    oReq.send();
}

save_button.innerHTML = 'Save';
save_button.addEventListener('click', savePerson);
cancel_button.innerHTML = 'Cancel';
cancel_button.addEventListener('click', cancelPerson);
edit_button.innerHTML = 'Edit';
edit_button.addEventListener('click', editPerson);
remove_button.innerHTML = 'Remove';
remove_button.addEventListener('click', removePerson);
return_button.innerHTML = "Return to list";
return_button.addEventListener('click', returnToPersonList);
if (! cl_people_id) {
    createPerson();
} else {
    retrievePerson(cl_people_id);
}
</script>
