
Group
=====

<div>back to <a href="groups.html">Group List</a></div><p>

<div id="group-viewer"></div>

<div id="group-controls"></div>

<script type="module" src="/widgets/groups.js"></script>

<script type="module">
"use strict";
let group_viewer = document.getElementById('group-viewer'),
    group_control = document.getElementById('group-controls'),
    group_display = document.createElement('group-display'),
    group_input = document.createElement('group-input'),
    /* Edit controls */
    edit_button = document.createElement('button'),
    remove_button = document.createElement('button'),
    /* Save controls */
    save_button = document.createElement('button'),
    cancel_button = document.createElement('button'),
    params = new URLSearchParams(window.location.search),
    cl_group_id = params.get('cl_group_id');


function saveGroup() {
    let obj = group_input.value;
    group_display.value = obj;
    //FIXME: Need to seen this back to service.
    group_viewer.innerHTML = '';
    group_viewer.appendChild(group_display);
    show_edit_buttons();
    console.log("DEBUG saveGroup() not fully implemented.");
}

function cancelGroup() {
    group_viewer.innerHTML = '';
    group_viewer.appendChild(group_display);
    show_edit_buttons();
    console.log("DEBUG cancelGroup()");
}

function editGroup() {
    let obj = group_display.value;
    group_input.value = obj;
    group_viewer.innerHTML = '';
    group_viewer.appendChild(group_input);
    show_save_buttons();
    console.log("DEBUG editGroup() ");
}

function removeGroup() {
    let obj = group_display.value,
        cl_group_id = obj.cl_group_id;
    //FIXME: Need to send delete request to service
    window.location.href = "groups.html";
    console.log("DEBUG removeGroup() not fully implemented.");
}

function show_edit_buttons() {
    group_control.innerHTML = '';
    group_control.appendChild(edit_button);
    group_control.appendChild(remove_button);
}

function show_save_buttons() {
    group_control.innerHTML = '';
    group_control.appendChild(save_button);
    group_control.appendChild(cancel_button);
}

function updateDisplayGroup() {
    let src = this.responseText,
        obj = JSON.parse(src);
    group_display.value = obj;
    group_viewer.innerHTML = '';
    group_viewer.appendChild(group_display);
    show_edit_buttons();
    console.log("DEBUG updateGroup() not fully implemented.");
}

function retrieveGroup(cl_group_id) {
    let oReq = new XMLHttpRequest();
    oReq.addEventListener('load', updateDisplayGroup);
    oReq.open('GET', `/api/group/${cl_group_id}`);
    oReq.send();
}

save_button.innerHTML = 'Save';
save_button.addEventListener('click', saveGroup);
cancel_button.innerHTML = 'Cancel';
cancel_button.addEventListener('click', cancelGroup);
edit_button.innerHTML = 'Edit';
edit_button.addEventListener('click', editGroup);
remove_button.innerHTML = 'Remove';
remove_button.addEventListener('click', removeGroup);
retrieveGroup(cl_group_id);
</script>