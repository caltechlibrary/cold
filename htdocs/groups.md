
Groups
=======

This page provides a widget demonstrating display and editing options for group web components.

Display
-------

<div><button id="group-refresh-button">Refresh Group List</button> <button id="group-add-button">Add Group</button></div><p>

<div id="group-manager"><!-- this is where a form appears to work with our group data --></div>

<div id="group-list">Fetch group data and display here</div>

<script type="module" src="/widgets/groups.js"></script>

<script type="module">
"use strict";
import { Group } from '/widgets/groups.js';

let group_add_button = document.getElementById('group-add-button'),
    group_refresh_button = document.getElementById('group-refresh-button'),
    group_manager = document.getElementById('group-manager'),
    group_list = document.getElementById('group-list'),
    u = window.location;

function updateGroupElement(key, elem) {
    let oReq = new XMLHttpRequest(),
        api_path = `/api/group/${key}`;
    oReq.addEventListener('load', function () {
        let src = this.responseText,
            obj = JSON.parse(src);
        elem.value = obj;
        elem.showElement();
    });
    oReq.open('GET', api_path);
    oReq.send();
}

function updateGroupsList() {
    /* Iterate through the fetched data, generate a group-display element
       and link to form for editing group data */
    let src = this.responseText,
            keys = JSON.parse(src);

    keys.sort();
    let i = 0;
    for (const key of keys) {
        let group_display = document.createElement('group-display');
        updateGroupElement(key, group_display);
        group_list.appendChild(group_display);
    }
}

function refreshGroups() {
    group_manager.innerHTML = ``;
    group_list.innerHTML = ``;
    let oReq = new XMLHttpRequest();
    oReq.addEventListener('load', updateGroupsList);
    oReq.open('GET', '/api/group');
    oReq.send();
}

function addGroup() {
    //FIXME: Need to generate a form that can submit a new
    // group via the JSON API.
    let group_input = document.createElement('group-input');
    group_manager.innerHTML = ``;
    group_list.innerHTML = ``;
    group_manager.appendChild(group_input);
    group_list.innerHTML = ``;
    console.log("addGroup() called");
}

function editGroup() {
    //FIXME: Need to generate a form that can submit a new
    // group via the JSON API.
    let group_input = document.createElement('group-input');
    group_manager.appendChild(group_input);
    group_list.innerHTML = ``;
    console.log("editGroup() called");
}

group_add_button.addEventListener('click', addGroup);
group_refresh_button.addEventListener('click', refreshGroups);

refreshGroups();
</script>
