/**
 * version_info.js provides a human friendly view of the Acacia
 * version info end point.
 */

import { Cfg } from "./config.js";

const version_info_template = document.createElement('template');

version_info_template.innerHTML = `<style>
/* Default CSS */
@import "/app/widgets/version-info.css";
/* Site overrides */
@import "/css/site.css";
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
