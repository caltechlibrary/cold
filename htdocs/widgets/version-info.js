/**
 * version_info.js provides a human friendly view of the Acacia
 * version info end point.
 *
 * @author R. S. Doiel, <rsdoiel@caltech.edu>
 *
 * Copyright (c) 2022, Caltech
 * All rights not granted herein are expressly reserved by Caltech.
 *
 * Redistribution and use in source and binary forms, with or without modification, are permitted provided that the following conditions are met:
 *
 * 1. Redistributions of source code must retain the above copyright notice, this list of conditions and the following disclaimer.
 *
 * 2. Redistributions in binary form must reproduce the above copyright notice, this list of conditions and the following disclaimer in the documentation and/or other materials provided with the distribution.
 *
 * 3. Neither the name of the copyright holder nor the names of its contributors may be used to endorse or promote products derived from this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 *
 */

import { Cfg } from "./config.js";

const prefix_path = Cfg.prefix_path;

const version_info_template = document.createElement('template');

version_info_template.innerHTML = `<style>
/* Default CSS */
@import "${prefix_path}/app/widgets/version-info.css";
</style>
<div id="version-info" class="version-info">
</div>
`;


/*
 * Utility functions
 */
function yyyymmdd(date) {
    let day = `${date.getDate()}`.padStart(2, '0'),
        month = `${date.getMonth() + 1}`.padStart(2, '0'),
        year = `${date.getFullYear()}`;
    return `${year}-${month}-${day}`
}

/*
 * Webworker friendly classes
 */

/* version_info_structure describes the version info schema for Acacia. */
let version_info_structure = {
};


class Version {
    constructor() {
        this.application_name = '';
        this.version = '';
        let self = this;
        self = Object.assign(self, version_info_structure);
    }

    get value() {
        let obj = {};
        obj = Object.assign(obj, this);
        return obj;
    }

    get as_json() {
        return JSON.stringify(this.value);
    }

    set value(obj) {
        let self = this;
        self = Object.assign(self, obj);
    }
}

/*
 * Viewer classes
 */

class VersionInfo extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({mode: 'open'});
        this.shadowRoot.appendChild(version_info_template.content.cloneNode(true));
        this.version = new Version();
    }

    get value() {
        return this.version.value;
    }

    get as_json() {
        return this.version.as_json;
    }

    set value(obj) {
        this.version.value = obj;
        this.refresh_view();    
    }

    refresh_view() {
        let elem = this.shadowRoot.getElementById('version-info'),
            field_names = Object.getOwnPropertyNames(this.version),
            obj = Object.assign({}, this.version);
        if (this.version.version && this.version.application_name) {
            elem.textContent = `${this.version.application_name} ${this.version.version}`;
        } else if (this.version.application_name) {
            elem.textContent = `${this.version.version}`;
        }
    }

    connectedCallback() {
        this.refresh_view();
    }

    disconnectedCallback() {
        /* FIXME: Not implemented */
    }

}

export { Version, VersionInfo };
window.customElements.define('version-info', VersionInfo);
