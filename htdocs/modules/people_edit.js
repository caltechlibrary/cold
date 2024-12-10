import * as mdt from './mdt.js';

let orcidElem = document.getElementById("orcid"),
    rorElem = document.getElementById("ror"),
    isniElem = document.getElementById("isni"),
    lcnafElem = document.getElementById('lcnaf'),
    viafElem = document.getElementById('viaf'),
    snacElem = document.getElementById('snac');

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
