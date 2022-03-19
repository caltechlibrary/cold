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

- [R. S. Doiel](https://orcid.org/0000-0003-0900-6903 "link to ORCID record")
- [Thomas E. Morrell](https://orcid.org/0000-0001-9266-5146 "link to ORCID record")


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
    oReq.open('GET', `${Cfg.prefix_path}/api/version`);
    oReq.send();
}
retrieveVersionInfo();
</script>
