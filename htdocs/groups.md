
Groups
=======

This page provides group management. Click on the group ID to view, editor or remove a group. You can click on the column headings to sort the table. Clicking again switch directions, e.g. from ascending to descending or descending to ascending. Searching the table can be done with your browser's search in page function (e.g. command + f on macOS, control + f on Windows).


<div><button id="add-group">Add Group</button></div><p>

Manage Groups
-------------

<div><group-table id="group-table"></group-table></div>

<script type="module" src="widgets/config.js"></script>

<script type="module" src="widgets/groups.js"></script>

<script type="module">
"use strict";

import { Cfg } from "widgets/config.js";

let group_table = document.getElementById('group-table'),
    add_group = document.getElementById('add-group');

add_group.addEventListener('click', function () {
    window.location.href = 'group.html';
})

function updateRow(key) {
    let oReq = new XMLHttpRequest(),
        api_path = `${Cfg.prefix_path}/api/group/${key}`;
    oReq.addEventListener('load', function () {
        let src = this.responseText,
            obj = JSON.parse(src),
            cl_group_id = obj.cl_group_id;
        group_table.set_group(cl_group_id, obj);
    });
    oReq.open('GET', api_path);
    oReq.send();
}

function updateGroupsTable() {
    /* Iterate through the fetched data, generate a group-display element
       and link to form for editing group data */
    let src = this.responseText,
            keys = JSON.parse(src);
    keys.sort();
    let i = 0;
    for (const key of keys) {
        updateRow(key);
    }
}

function refreshGroups() {
    let oReq = new XMLHttpRequest();
    oReq.addEventListener('load', updateGroupsTable);
    oReq.open('GET', `${Cfg.prefix_path}/api/group`);
    oReq.send();
}

refreshGroups();
</script>
