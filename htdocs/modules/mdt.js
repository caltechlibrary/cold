const appInfo = {
    appName: "metadatatools",
    version: "0.0.1",
    releaseDate: "2024-12-09",
    releaseHash: "b3365df",
    licenseText: `
Copyright (c) 2024, Caltech All rights not granted herein are expressly
reserved by Caltech.

Redistribution and use in source and binary forms, with or without
modification, are permitted provided that the following conditions are
met:

1. Redistributions of source code must retain the above copyright
notice, this list of conditions and the following disclaimer.

2. Redistributions in binary form must reproduce the above copyright
notice, this list of conditions and the following disclaimer in the
documentation and/or other materials provided with the distribution.

3. Neither the name of the copyright holder nor the names of its
contributors may be used to endorse or promote products derived from
this software without specific prior written permission.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS
IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED
TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A
PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT
HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED
TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR
PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF
LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING
NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.

`
};
const newFormatPattern = /^arxiv:\d{4}\.\d{4,5}(v\d+)?$/i;
const oldFormatPattern = /^arxiv:[a-z\-]+\/\d{7}(v\d+)?$/i;
function normalizeArXivID(arxivID) {
    return arxivID.trim().toLowerCase();
}
function validateArXivID(arxivID) {
    const normalizedID = normalizeArXivID(arxivID);
    return newFormatPattern.test(normalizedID) || oldFormatPattern.test(normalizedID);
}
async function verifyIdentifier(identifier, u, validate) {
    if (validate(identifier)) {
        const response = await fetch(u);
        if (response !== undefined && response !== null) {
            return response.ok;
        }
    }
    return false;
}
async function verifyArXivID(arxiv) {
    const normalizedID = normalizeArXivID(arxiv);
    return await verifyIdentifier(arxiv, `https://export.arxiv.org/api/query?id_list=${normalizedID.replace(/^arxiv:/i, "").trim()}`, validateArXivID);
}
function normalizeDOI(doi) {
    const lowercaseDOI = doi.toLowerCase().trim();
    if (URL.canParse(lowercaseDOI)) {
        const u = URL.parse(lowercaseDOI);
        if (u !== undefined && u !== null && u.pathname !== null && u.pathname !== "") {
            return u.pathname.replace(/^\//, "");
        }
    }
    return lowercaseDOI;
}
function validateDOI(doi) {
    const normalizedDOI = normalizeDOI(doi);
    const doiRegex = /^10\.\d{4,9}\/[^\s]+$/;
    return doiRegex.test(normalizedDOI);
}
async function verifyDOI(doi) {
    const normalizedDOI = normalizeDOI(doi);
    const verified = await verifyIdentifier(doi, `https://doi.org/api/handles/${encodeURIComponent(normalizedDOI)}`, validateDOI);
    return verified;
}
function validateISBN10(isbn) {
    const cleanISBN = isbn.replace(/[^0-9X]/gi, "");
    if (cleanISBN.length !== 10) return false;
    const checksum = cleanISBN.split("").slice(0, 9).reduce((sum, __char, index)=>sum + parseInt(__char) * (10 - index), 0);
    const checkDigit = cleanISBN[9].toUpperCase() === "X" ? 10 : parseInt(cleanISBN[9]);
    return (checksum + checkDigit) % 11 === 0;
}
function validateISBN13(isbn) {
    const cleanISBN = isbn.replace(/[^0-9]/g, "");
    if (cleanISBN.length !== 13) return false;
    const checksum = cleanISBN.split("").reduce((sum, __char, index)=>sum + parseInt(__char) * (index % 2 === 0 ? 1 : 3), 0);
    return checksum % 10 === 0;
}
function validateISBN(isbn) {
    const cleanISBN = isbn.replace(/[^0-9X]/gi, "");
    if (cleanISBN.length === 10) return validateISBN10(cleanISBN);
    if (cleanISBN.length === 13) return validateISBN13(cleanISBN);
    return false;
}
function normalizeISBN(isbn) {
    return isbn.replace(/[-\s]/g, "").trim();
}
async function verifyISBN(isbn) {
    const normalizedISBN = normalizeISBN(isbn);
    return verifyIdentifier(isbn, `https://openlibrary.org/isbn/${encodeURIComponent(normalizedISBN)}.json`, validateISBN);
}
function normalizeISNI(isni) {
    return isni.replace(/\D/g, "");
}
function validateISNIChecksum(normalizedISNI) {
    const digits = normalizedISNI.split("").map(Number);
    let sum = 0;
    for(let i = 0; i < 15; i++){
        sum = (sum + digits[i]) * 2 % 11;
    }
    const calculatedChecksum = (12 - sum % 11) % 11;
    if (calculatedChecksum === 10) {
        return normalizedISNI[15] === "X";
    }
    return digits[15] === calculatedChecksum;
}
function validateISNI(isni) {
    const normalizedISNI = normalizeISNI(isni);
    if (!/^\d{16}$/.test(normalizedISNI)) return false;
    return validateISNIChecksum(normalizedISNI);
}
async function verifyISNI(isni) {
    const normalizedISNI = normalizeISNI(isni);
    return await verifyIdentifier(isni, `https://isni.org/isni/${encodeURIComponent(normalizedISNI)}`, validateISNI);
}
function validateISSNChecksum(issn) {
    if (issn.length !== 8) return false;
    const digits = issn.slice(0, 7);
    const checkDigit = issn[7].toUpperCase();
    const checksum = digits.split("").reduce((sum, __char, index)=>sum + parseInt(__char) * (8 - index), 0) % 11;
    const expectedCheckDigit = checksum === 0 ? "0" : checksum === 1 ? "X" : `${11 - checksum}`;
    return checkDigit === expectedCheckDigit;
}
function validateISSN(issn) {
    const normalizedISSN = normalizeISSN(issn);
    if (!/^\d{7}[0-9X]$/.test(normalizedISSN)) return false;
    return validateISSNChecksum(normalizedISSN);
}
function normalizeISSN(issn) {
    return issn.replace(/[^0-9X]/gi, "").toUpperCase();
}
async function verifyISSN(issn) {
    const normalizedISSN = normalizeISSN(issn);
    return await verifyIdentifier(issn, `https://portal.issn.org/resource/ISSN/${encodeURIComponent(normalizedISSN)}`, validateISSN);
}
const LCNAFPattern = /^[a-zA-Z0-9]+$/;
function normalizeLCNAF(id) {
    return id.trim();
}
function validateLCNAF(id) {
    const normalizedId = normalizeLCNAF(id);
    return LCNAFPattern.test(normalizedId);
}
async function verifyLCNAF(id) {
    const normalizedID = normalizeLCNAF(id);
    return await verifyIdentifier(id, `https://id.loc.gov/authorities/names/${normalizedID}.json`, validateLCNAF);
}
function normalizeORCID(orcid) {
    let cleanedOrcid = orcid.toUpperCase().replace(/\s+/g, "").replace(/-/g, "").trim();
    if (URL.canParse(cleanedOrcid)) {
        const u = URL.parse(cleanedOrcid);
        if (u !== undefined && u !== null && u.pathname !== null && u.pathname !== "") {
            cleanedOrcid = u.pathname.replace(/^\//, "");
        }
    }
    return `${cleanedOrcid.slice(0, 4)}-${cleanedOrcid.slice(4, 8)}-${cleanedOrcid.slice(8, 12)}-${cleanedOrcid.slice(12)}`;
}
function validateORCID(orcid) {
    const normalizedORCID = normalizeORCID(orcid);
    const orcidRegex = /^(\d{4}-\d{4}-\d{4}-\d{3}[\dX])$/;
    return orcidRegex.test(normalizedORCID);
}
async function verifyORCID(orcid) {
    const normalizedORCID = normalizeORCID(orcid);
    return await verifyIdentifier(orcid, `https://orcid.org/${encodeURIComponent(normalizedORCID)}`, validateORCID);
}
const pmcidPattern = /^PMC\d+$/;
function normalizePMCID(pmcid) {
    let cleanedID = pmcid.trim().toUpperCase();
    if (pmcid.startsWith("PMC")) {
        return cleanedID;
    }
    return `PMC${cleanedID}`;
}
function validatePMCID(pmcid) {
    const normalizedID = normalizePMCID(pmcid);
    return pmcidPattern.test(normalizedID);
}
async function verifyPMCID(pmcid) {
    const normalizedID = normalizePMCID(pmcid);
    return await verifyIdentifier(pmcid, `https://www.ncbi.nlm.nih.gov/pmc/articles/${normalizedID}/`, validatePMCID);
}
const pubMedIDPattern = /^[0-9]+$/;
function normalizePMID(pubMedID) {
    return pubMedID.replace(/pmid:\s+|pmid:/i, "").trim();
}
function validatePMID(pubMedID) {
    const normalizedID = normalizePMID(pubMedID);
    return pubMedIDPattern.test(normalizedID);
}
async function verifyPMID(pmid) {
    const normalizedID = normalizePMID(pmid);
    return await verifyIdentifier(pmid, `https://pubmed.ncbi.nlm.nih.gov/${normalizedID}/`, validatePMID);
}
const rorPrefix = "https://ror.org/";
const rorPattern = /^https:\/\/ror\.org\/0[a-hj-km-np-tv-z|0-9]{6}[0-9]{2}$|^0[a-hj-km-np-tv-z|0-9]{6}[0-9]{2}$/;
function normalizeROR(ror) {
    let cleanedROR = ror.trim().toLowerCase();
    if (cleanedROR.startsWith(rorPrefix)) {
        return cleanedROR;
    }
    return `${rorPrefix}${cleanedROR}`;
}
function validateROR(ror) {
    const normalizedROR = normalizeROR(ror);
    return rorPattern.test(normalizedROR);
}
async function verifyROR(ror) {
    const normalizedROR = normalizeROR(ror);
    return await verifyIdentifier(ror, normalizedROR, validateROR);
}
const SNACPattern = /^\d+$/;
function normalizeSNAC(id) {
    return id.trim();
}
function validateSNAC(id) {
    const normalizedId = normalizeSNAC(id);
    return SNACPattern.test(normalizedId);
}
async function verifySNAC(id) {
    const normalizedID = normalizeSNAC(id);
    return await verifyIdentifier(id, `https://snaccooperative.org/view/${normalizedID}`, validateSNAC);
}
const VIAFPattern = /^\d+$/;
function normalizeVIAF(id) {
    return id.trim();
}
function validateVIAF(id) {
    const normalizedID = normalizeVIAF(id);
    return VIAFPattern.test(normalizedID);
}
async function verifyVIAF(id) {
    const normalizedID = normalizeVIAF(id);
    return await verifyIdentifier(id, `https://viaf.org/viaf/${normalizedID}`, validateVIAF);
}
export { appInfo as appInfo };
export { normalizeArXivID as normalizeArXivID, validateArXivID as validateArXivID };
export { verifyArXivID as verifyArXivID };
export { normalizeDOI as normalizeDOI, validateDOI as validateDOI };
export { verifyDOI as verifyDOI };
export { validateISBN as validateISBN, normalizeISBN as normalizeISBN };
export { verifyISBN as verifyISBN };
export { normalizeISNI as normalizeISNI, validateISNI as validateISNI };
export { verifyISNI as verifyISNI };
export { validateISSN as validateISSN, normalizeISSN as normalizeISSN };
export { verifyISSN as verifyISSN };
export { normalizeLCNAF as normalizeLCNAF, validateLCNAF as validateLCNAF };
export { verifyLCNAF as verifyLCNAF };
export { normalizeORCID as normalizeORCID, validateORCID as validateORCID };
export { verifyORCID as verifyORCID };
export { normalizePMCID as normalizePMCID, validatePMCID as validatePMCID };
export { verifyPMCID as verifyPMCID };
export { normalizePMID as normalizePMID, validatePMID as validatePMID };
export { verifyPMID as verifyPMID };
export { normalizeROR as normalizeROR, validateROR as validateROR };
export { verifyROR as verifyROR };
export { normalizeSNAC as normalizeSNAC, validateSNAC as validateSNAC };
export { verifySNAC as verifySNAC };
export { normalizeVIAF as normalizeVIAF, validateVIAF as validateVIAF };
export { verifyVIAF as verifyVIAF };

