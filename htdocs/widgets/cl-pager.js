/**
 * cl-pager.js - provides the CLPager class for providing a simple pager element
 * for paging lists.
 */
"use strict";

const  pager_template = document.createElement('template');

pager_template.innerHTML = `<style>
/* Default CSS */
@import "/app/widgets/cl-pager.css";
/* Site overrides */
@import "/css/cl-pager.css";
</style>
<div>
  <a href="" id="cl-pager-previous" class="cl-pager-previous">Previous</a> 
  <a href="" id="cl-pager-next" class="cl-pager-next">Next</a>
  <input type="range" id="cl-pager-slider" />
  <span id="cl-pager-status" class="cl-pager-status">
     (<span id="cl-pager-pos" class="cl-pager-pos"></span>/<span id="cl-pager-max" class="cl-pager-max"></span>, <span id="cl-pager-step" class="cl-pager-step"></span>)
  </span>
</div>
`;

function as_number(val) {
    if (val === null) {
        return 0;
    }
    return new Number(val);
}

class CLPager extends HTMLElement {
    constructor () {
        super();
        this.defaults = new Map()
        this.defaults.set('pos', 0)
        this.defaults.set('step', 25)
        this.defaults.set('min', 0);
        this.defaults.set('max', -1);
        this.defaults.set('next', 0);
        this.defaults.set('previous', 0);
        this.defaults.set('for', '');
        this.pos = this.defaults.get('pos');
        this.step = this.defaults.get('step');
        this.min = this.defaults.get('min');
        this.max = this.defaults.get('max');
        this.next = this.defaults.get('next');
        this.previous = this.defaults.get('previous');
        this.for = this.defaults.get('for');
        this.managed_attributes = new Array('pos', 'step', 'min', 'max', 'next', 'previous', 'for' );

        this.attachShadow({mode: 'open'});
        this.shadowRoot.appendChild(pager_template.content.cloneNode(true));
    }

    get value() {
        let obj = {};
        for (const key of this.managed_attributes) {
            obj[key] = this.getAttribute(key);
        }
        return obj;
    }

    get as_json() {
        return JSON.stringify(this.value);
    }

    set value(obj) {
        for (const key of this.managed_attributes) {
            let elem_name = `cl-pager-${key}`,
                elem = this.shadowRoot.getElementById(elem_name);
            if (obj.hasOwnProperty(key)) {
                this.setAttribute(key, obj[key]);
                elem.textContent = obj[key];
            }
        }
    }

    get_position() {
        let pos = this.getAttribute('pos');
        return new Numner(pos);
    }

    set_position(pos, size) {
        let next = pos + size,
            prev = pos - size,
            total = this.getAttribute('total');
        if (prev < 0) {
            prev = 0;
        }
        if ((total > -1) && (next >= total)) {
            next = total - size;
        }
        this.setAttribute('pos', pos);
        this.setAttribute('size', size);
        let elem = this.shadowRoot.getElementById('cl-pager-next');
        elem.setAttribute('href', `?size=${size}&pos=${next}`)
        elem = this.shadowRoot.getElementById('cl-pager-previous');
        elem.setAttribute('href', `?size=${size}&pos=${prev}`)
    }

    get_size() {
        let size = this.getAttribute('size');
        return new Number(size);
    }

    setAttribute(key, val) {
        super.setAttribute(key, val);
        if (this.managed_attributes.indexOf(key) >= 0) {
            let elem_name =  `cl-pager-${key}`,
                elem = this.shadowRoot.getElementById(elem_name);
            if (elem !== null) {
                if (val === null) {
                    val = '';
                }
                elem.textContent = val;
                let evt = new Event("change", {"bubbles": true, "cancelable": true});
                this.shadowRoot.host.dispatchEvent(evt);    
            }
        }
    }

    connectedCallback() {
        let pos = as_number(this.getAttribute('pos')),
            size = as_number(this.getAttribute('size')),
            total = as_number(this.getAttribute('total'));
        this.innerHTML = '';
        for (const key of this.managed_attributes) {
            let elem = this.shadowRoot.getElementById(`cl-pager-${key}`);
            if ([ 'previous', 'next'].indexOf(key) >= 0) {
                let href = elem.getAttribute('href'),
                    val = this.getAttribute(key);
                if (key == 'previous') {
                    let previous = 0;
                     if (pos > size) {
                        previous = pos - size;
                    }
                    elem.setAttribute('href', `?size=${size}&pos=${previous}`);
                }
                if (key == 'next') {
                    let next = pos + size;
                    if ((total > 0) && (next >= total)) {
                        next = total - 1;
                    }
                    elem.setAttribute('href', `?size=${size}&pos=${next}`);
                }
            } else if (elem !== null) {
                let val = this.getAttribute(key);
                if (val === null) {
                    if( this.defaults.has(key)) {
                        val = this.defaults.get(key);
                    } else {
                        val = '';
                    }
                }
                elem.textContent = val;
            }
        }
    }

    disconnectCallback() {
        let self = this;
        for (const key of this.managed_attributes) {
            let elem = this.shadowRoot.getElementById(`cl-pager-${key}`),
                fnNameOnChange = `onchange_people_pager_${key}`;
            elem.removeEventListener('change', fnNameOnChange);
        }
    }
}


export { CLPager };
window.customElements.define('cl-pager', CLPager);
