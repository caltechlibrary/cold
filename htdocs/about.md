---
title : About to cold
---

About Cold
==========

cold is a micro service for managing controlled object lists, i.e.
people and groups used by Caltech Library's repositories
and archival systems.

Developers
----------

(alphabetically)

+ R. S. Doiel

<version-info id="version-info"></version-info>

<script type="module" src="./widgets/config.js"></script>

<script type="module" src="./widgets/version-info.js"></script>

<script type="module">
"use strict";

import { Cfg } from "./widgets/config.js";

let version_info = document.getElementById('version-info');

function updateVersionInfo() {
    let src = this.responseText,
        obj = JSON.parse(src);
    version_info.value = obj;
}

function retrieveVersionInfo() {
    let oReq = new XMLHttpRequest();
    oReq.addEventListener('load', updateVersionInfo);
    oReq.open('GET', `${Cfg.base_url}/api/version`);
    oReq.send();
}
retrieveVersionInfo();
</script>
