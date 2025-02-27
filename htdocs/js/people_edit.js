import * as mdt from '../modules/mdt.js';
import { ClientAPI } from '../modules/client_api.js';
import * as path from './path.js';

/*might not need this after all
//NOTE: We need to caculate the path to the application root, not windows.location root.
//people_edit.js is called from people_edit page so we need move up two directories to
//finc the root.
const apiPath = path.join(window.location.pathname, '..', '..');
console.log(`DEBUG API path -> ${apiPath} <-- ${window.location}`)
*/

const clientAPI = new ClientAPI();

let orcidElem = document.getElementById("orcid"),
    rorElem = document.getElementById("ror"),
    isniElem = document.getElementById("isni"),
    lcnafElem = document.getElementById('lcnaf'),
    viafElem = document.getElementById('viaf'),
    snacElem = document.getElementById('snac'),
    groupsElem = document.getElementById('groups');

orcidElem.addEventListener('change', function (evt) {
    let val = orcidElem.value;
    if (mdt.validateORCID(val)) {
        orcidElem.value = mdt.normalizeORCID(val);
    }
});

rorElem.addEventListener('change', function (evt) {
    let val = rorElem.value;
    if (mdt.validateROR(val)) {
        rorElem.value = mdt.normalizeROR(val);
    }
});

isniElem.addEventListener('change', function (evt) {
    let val = isniElem.value;
    if (mdt.validateISNI(val)) {
        isniElem.value = mdt.normalizeISNI(val);
    }
});

lcnafElem.addEventListener('change', function (evt) {
    let val = lcnafElem.value;
    if (mdt.validateLCNAF(val)) {
        lcnafElem.value = mdt.normalizeLCNAF(val);
    }
});

viafElem.addEventListener('change', function (evt) {
    let val = viafElem.value;
    if (mdt.validateVIAF(val)) {
        viafElem.value = mdt.normalizeVIAF(val);
    }
});

snacElem.addEventListener('change', function (evt) {
    let val = snacElem.value;
    if (mdt.validateSNAC(val)) {
        snacElem.value = mdt.normalizeSNAC(val);
    }
});

groupsElem.addEventListener('change', async function (evt) {
    let vals = groupsElem.value;
    let resolvedVals = [];
    for (const val of vals.split(/\n/g)) {
        if (val === undefined || val === '') {
            console.log(`%cDEBUG skipping empty query value`, 'color: magenta');
        } else {
            console.log(`%cDEBUG group name -> ${val}`, 'color: green');
            const obj = await clientAPI.lookupGroupName(val);
            // If we get zero results back then just accept the value otherwise
            // we'll turn this into a CSV row with name followed by id.
            if (obj === undefined || obj.length === 0) {
                console.log(`%cfailed to find group name -> ${val}`, 'color: red');
                resolvedVals.push({'group_name': val});
            } else {
                console.log(`%cDEBUG lookup data -> ${obj} -> ${JSON.stringify(obj)}`, 'color: yellow');
                resolvedVals.push(obj[0]);
            }
        }
    }
    console.log(`%cDEBUG resolved lines -> ${JSON.stringify(resolvedVals)}`, 'color: magenta');
});
