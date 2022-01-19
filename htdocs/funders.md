Funders
=======

This page provides a widget demonstrating display and editing options for funder web components.

Display
-------

<div id="funder-list">Fetch funder data and display here</div>

Input
-----

<div id="funder-manage">Funder management UI is displayed here.</div>

<script type="module" src="/widgets/funder.js"></script>

<script>
let funder_list = document.getElementById('funder-list'),
    funder_manage = document.getElementById('funder-manage'),
    oReq = new XMLHttpRequest(),
    u = window.location;

funder_list.innerHTML = ``;
funder_manage.innerHTML = ``;

function updateFunders() {
    /* Iterate through the fetched data, generate a funder-display element
       and link to form for editing funder data */
    let src = this.responseText,
            data = JSON.parse(src),
            keys = Object.keys(data);

    keys.sort();
    for (let i = 0; i < keys.length; i++) {
        let funder_display = document.createElement('funder-display'),
            funder_input = document.createElement('funder-input'),
            key = keys[i],
            val = data[key];
        funder_display.value = [];
        funder_list.appendChild(funder_display);
        funder_input.value = [];
        funder_manage.appendChild(funder_input);
    }
}

oReq.addEventListener('load', updateFunders);
oReq.open('GET', '/api/funder');
oReq.send();
</script>
