
Groups
=======

This page provides a widget demonstrating display of a group's table.

Group Table
-----------

<div><group-table id="group-table"></group-table></div>

<script type="module" src="/widgets/groups.js"></script>

<script type="module">
"use strict";

let group_table = document.getElementById('group-table'),
    u = window.location;
console.log("DEBUG group_table ->", group_table);
function updateRow(key) {
    console.log(`DEBUG updateRow(${key})`);
    let oReq = new XMLHttpRequest(),
        api_path = `/api/group/${key}`;
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
    console.log("DEBUG updateGroupsTable()");
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
    oReq.open('GET', '/api/group');
    oReq.send();
}

refreshGroups();
</script>
