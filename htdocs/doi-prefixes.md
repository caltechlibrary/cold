
DOI Prefix
==========

<div id="doi-prefix-list">Fetching doi-prefix list</div>

<script type="module" src="./widgets/config.js"></script>

<script type="module" src="./widgets/vocabulary.js"></script>

<script type="module">
"use strict";
import { Cfg } from "./widgets/config.js";

let doi_prefix_list = document.getElementById('doi-prefix-list'),
    oReq = new XMLHttpRequest(),
    u = window.location;

doi_prefix_list.innerHTML = ``;

function updatePage() {
    let src = this.responseText,
        data = JSON.parse(src),
        keys = Object.keys(data);

    keys.sort();
    for (let i = 0; i < keys.length; i++) {
        let div = document.createElement('div'),
            elem = document.createElement('vocabulary-pair'),
            key = keys[i],
            val = data[key];
        elem.value = { 'identifier': key, 'name': val };
        div.appendChild(elem);
        doi_prefix_list.appendChild(div);
    }
}

oReq.addEventListener('load', updatePage);
oReq.open('GET', `${Cfg.prefix_path}/api/doi-prefix`);
oReq.send();
</script>
