// ../metadatatools/version.ts
var appInfo = {
  // appName holds the application/package name
  appName: "metadatatools",
  // Version number of release
  version: "0.0.4",
  // ReleaseDate, the date version.ts was generated
  releaseDate: "2024-12-11",
  // ReleaseHash, the Git hash when version.go was generated
  releaseHash: "d5af0f5",
  // licenseText holds a copy of the application license text.
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

// ../metadatatools/arxiv.ts
var ARXIVPattern = "^arxiv:(\\d{4}\\.\\d{4,5}(v\\d+)?|[a-z\\-]+\\/\\d{7}(v\\d+)?)$";
var reARXIV = new RegExp(ARXIVPattern, "i");
var newARXIVPattern = "^arxiv:\\d{4}\\.\\d{4,5}(v\\d+)?$";
var reNewARXIV = new RegExp(newARXIVPattern, "i");
var oldARXIVPattern = "^arxiv:[a-z\\-]+\\/\\d{7}(v\\d+)?$";
var reOldARXIV = new RegExp(oldARXIVPattern, "i");
function normalizeArXivID(arxivID) {
  return arxivID.trim().toLowerCase();
}
function validateArXivID(arxivID) {
  const normalizedID = normalizeArXivID(arxivID);
  return reARXIV.test(normalizedID);
}

// ../metadatatools/utility.ts
async function verifyIdentifier(identifier, u, validate) {
  if (validate(identifier)) {
    const response = await fetch(u);
    if (response !== void 0 && response !== null) {
      return response.ok;
    }
  }
  return false;
}

// ../metadatatools/arxiv_record.ts
async function verifyArXivID(arxiv) {
  const normalizedID = normalizeArXivID(arxiv);
  return await verifyIdentifier(arxiv, `https://export.arxiv.org/api/query?id_list=${normalizedID.replace(/^arxiv:/i, "").trim()}`, validateArXivID);
}

// ../metadatatools/doi.ts
var DOIPattern = "^10\\.\\d{4,9}\\/[^\\s]+$";
var reDOI = new RegExp(DOIPattern);
function normalizeDOI(doi) {
  const lowercaseDOI = doi.toLowerCase().trim();
  if (URL.canParse(lowercaseDOI)) {
    const u = URL.parse(lowercaseDOI);
    if (u !== void 0 && u !== null && u.pathname !== null && u.pathname !== "") {
      return u.pathname.replace(/^\//, "");
    }
  }
  return lowercaseDOI;
}
function validateDOI(doi) {
  const normalizedDOI = normalizeDOI(doi);
  return reDOI.test(normalizedDOI);
}

// ../metadatatools/doi_record.ts
async function verifyDOI(doi) {
  const normalizedDOI = normalizeDOI(doi);
  const verified = await verifyIdentifier(doi, `https://doi.org/api/handles/${encodeURIComponent(normalizedDOI)}`, validateDOI);
  return verified;
}

// ../metadatatools/isbn.ts
var ISBN10Pattern = "^(?:\\d[\\ |-]?){9}[\\d|X]$";
var reISBN10 = new RegExp(ISBN10Pattern, "i");
var ISBN13Pattern = "^(?:d[ |-]?){13}$";
var reISBN13 = new RegExp(ISBN13Pattern, "i");
var ISBNPattern = "^((?:\\d[\\ |-]?){9}[\\d|X]|(?:d[ |-]?){13})$";
var reISBN = new RegExp(ISBNPattern, "i");
function validateISBN10(isbn) {
  const cleanISBN = isbn.replace(/[^0-9X]/gi, "");
  if (cleanISBN.length !== 10) return false;
  const checksum = cleanISBN.split("").slice(0, 9).reduce((sum, char, index) => sum + parseInt(char) * (10 - index), 0);
  const checkDigit = cleanISBN[9].toUpperCase() === "X" ? 10 : parseInt(cleanISBN[9]);
  return (checksum + checkDigit) % 11 === 0;
}
function validateISBN13(isbn) {
  const cleanISBN = isbn.replace(/[^0-9]/g, "");
  if (cleanISBN.length !== 13) return false;
  const checksum = cleanISBN.split("").reduce((sum, char, index) => sum + parseInt(char) * (index % 2 === 0 ? 1 : 3), 0);
  return checksum % 10 === 0;
}
function validateISBN(isbn) {
  const cleanISBN = isbn.replace(/[^0-9X]/gi, "");
  if (cleanISBN.length === 10) return validateISBN10(cleanISBN);
  if (cleanISBN.length === 13) return validateISBN13(cleanISBN);
  return false;
}
function normalizeISBN(isbn) {
  const bareISBN = isbn.replace(/[-\s]/g, "").trim();
  if (bareISBN.length === 10) {
    return `${bareISBN.substring(0, 1)}-${bareISBN.substring(1, 4)}-${bareISBN.substring(4, 9)}-${bareISBN.substring(9)}`;
  } else if (bareISBN.length === 13) {
    return `${bareISBN.substring(0, 3)}-${bareISBN.substring(3, 4)}-${bareISBN.substring(4, 6)}-${bareISBN.substring(6, 11)}-${bareISBN.substring(11)}`;
  }
  return bareISBN;
}

// ../metadatatools/isbn_record.ts
async function verifyISBN(isbn) {
  const normalizedISBN = normalizeISBN(isbn);
  return verifyIdentifier(isbn, `https://openlibrary.org/isbn/${encodeURIComponent(normalizedISBN)}.json`, validateISBN);
}

// ../metadatatools/isni.ts
var ISNIPattern = "$[0-9]{4} [0-9]{4} [0-9]{4} [0-9]{3}[0-9X]";
var reISNI = new RegExp(ISNIPattern);
function stripISNI(isni) {
  return isni.toUpperCase().replace(/\s+/g, "").replace(/-/g, "").trim();
}
function normalizeISNI(isni) {
  const bareISNI = stripISNI(isni);
  return `${bareISNI.slice(0, 4)} ${bareISNI.slice(4, 8)} ${bareISNI.slice(8, 12)} ${bareISNI.slice(12)}`;
}
function validateISNIChecksum(isni) {
  const bareISNI = stripISNI(isni);
  const digits = bareISNI.split("").map(Number);
  let sum = 0;
  for (let i = 0; i < 15; i++) {
    sum = (sum + digits[i]) * 2 % 11;
  }
  const calculatedChecksum = (12 - sum % 11) % 11;
  if (calculatedChecksum === 10) {
    return bareISNI[15] === "X";
  }
  return digits[15] === calculatedChecksum;
}
function validateISNI(isni) {
  const bareISNI = stripISNI(isni);
  if (!/^\d{16}$/.test(bareISNI)) return false;
  return validateISNIChecksum(bareISNI);
}

// ../metadatatools/isni_record.ts
async function verifyISNI(isni) {
  const bareISNI = normalizeISNI(isni).replaceAll(" ", "");
  return await verifyIdentifier(isni, `https://isni.org/isni/${encodeURIComponent(bareISNI)}`, validateISNI);
}

// ../metadatatools/issn.ts
var ISSNPattern = "^ISSNs+?(d{4})-(d{3}[dX])$";
var reISSN = new RegExp(ISSNPattern, "i");
function validateISSNChecksum(issn) {
  if (issn.length !== 8) return false;
  const digits = issn.slice(0, 7);
  const checkDigit = issn[7].toUpperCase();
  const checksum = digits.split("").reduce((sum, char, index) => sum + parseInt(char) * (8 - index), 0) % 11;
  const expectedCheckDigit = checksum === 0 ? "0" : checksum === 1 ? "X" : `${11 - checksum}`;
  return checkDigit === expectedCheckDigit;
}
function stripISSN(issn) {
  return issn.toUpperCase().replaceAll(/\D|X/g, "");
}
function validateISSN(issn) {
  const bareISSN = stripISSN(issn);
  return validateISSNChecksum(bareISSN);
}
function normalizeISSN(issn) {
  const bareISSN = stripISSN(issn);
  console.log(`DEBUG bareISSN -> ${bareISSN}`);
  return `${bareISSN.substring(0, 4)}-${bareISSN.substring(4)}`;
}

// ../metadatatools/issn_record.ts
async function verifyISSN(issn) {
  const normalizedISSN = normalizeISSN(issn);
  return await verifyIdentifier(issn, `https://portal.issn.org/resource/ISSN/${encodeURIComponent(normalizedISSN)}`, validateISSN);
}

// ../metadatatools/lcnaf.ts
var LCNAFPattern = "^[a-zA-Z0-9]+$";
var reLCNAF = new RegExp(LCNAFPattern);
function normalizeLCNAF(id) {
  return id.trim();
}
function validateLCNAF(id) {
  const normalizedId = normalizeLCNAF(id);
  return reLCNAF.test(normalizedId);
}

// ../metadatatools/lcnaf_record.ts
async function verifyLCNAF(id) {
  const normalizedID = normalizeLCNAF(id);
  return await verifyIdentifier(id, `https://id.loc.gov/authorities/names/${normalizedID}.json`, validateLCNAF);
}

// ../metadatatools/orcid.ts
var ORCIDPattern = "^(\\d{4}-\\d{4}-\\d{4}-\\d{3}[\\dX])$";
var reORCID = new RegExp(ORCIDPattern);
function stripORCID(orcid) {
  return orcid.toUpperCase().replace(/\s+/g, "").replace(/-/g, "").trim();
}
function normalizeORCID(orcid) {
  let bareORCID = stripORCID(orcid);
  if (URL.canParse(bareORCID)) {
    const u = URL.parse(bareORCID);
    if (u !== void 0 && u !== null && u.pathname !== null && u.pathname !== "") {
      bareORCID = u.pathname.replace(/^\//, "");
    }
  }
  return `${bareORCID.slice(0, 4)}-${bareORCID.slice(4, 8)}-${bareORCID.slice(8, 12)}-${bareORCID.slice(12)}`;
}
function validateORCID(orcid) {
  const normalizedORCID = normalizeORCID(orcid);
  if (!reORCID.test(normalizedORCID)) {
    return false;
  }
  const bareORCID = stripORCID(normalizedORCID);
  if (bareORCID.length !== 16) {
    return false;
  }
  const baseDigits = bareORCID.slice(0, 15);
  const checksumChar = bareORCID[15];
  const checksum = checksumChar === "X" ? 10 : parseInt(checksumChar, 10);
  let total = 0;
  for (const digit of baseDigits) {
    total = (total + parseInt(digit, 10)) * 2;
  }
  const calculatedChecksum = (12 - total % 11) % 11;
  return calculatedChecksum === checksum;
}

// ../metadatatools/orcid_record.ts
async function verifyORCID(orcid) {
  const normalizedORCID = normalizeORCID(orcid);
  return await verifyIdentifier(orcid, `https://orcid.org/${encodeURIComponent(normalizedORCID)}`, validateORCID);
}

// ../metadatatools/pmcid.ts
var PMCIDPattern = "^PMC\\d+$";
var rePMCID = new RegExp(PMCIDPattern);
function normalizePMCID(pmcid) {
  let cleanedID = pmcid.trim().toUpperCase();
  if (pmcid.startsWith("PMC")) {
    return cleanedID;
  }
  return `PMC${cleanedID}`;
}
function validatePMCID(pmcid) {
  const normalizedID = normalizePMCID(pmcid);
  return rePMCID.test(normalizedID);
}

// ../metadatatools/pmcid_record.ts
async function verifyPMCID(pmcid) {
  const normalizedID = normalizePMCID(pmcid);
  return await verifyIdentifier(pmcid, `https://www.ncbi.nlm.nih.gov/pmc/articles/${normalizedID}/`, validatePMCID);
}

// ../metadatatools/pmid.ts
var PMIDPattern = "^[0-9]+$";
var rePMID = new RegExp(PMIDPattern);
function normalizePMID(pubMedID) {
  return pubMedID.replace(/pmid:\s+|pmid:/i, "").trim();
}
function validatePMID(pubMedID) {
  const normalizedID = normalizePMID(pubMedID);
  return rePMID.test(normalizedID);
}

// ../metadatatools/pmid_record.ts
async function verifyPMID(pmid) {
  const normalizedID = normalizePMID(pmid);
  return await verifyIdentifier(pmid, `https://pubmed.ncbi.nlm.nih.gov/${normalizedID}/`, validatePMID);
}

// ../metadatatools/ror.ts
var rorPrefix = "https://ror.org/";
var RORPattern = "^https:\\/\\/ror\\.org\\/0[a-hj-km-np-tv-z|0-9]{6}[0-9]{2}$|^0[a-hj-km-np-tv-z|0-9]{6}[0-9]{2}$";
var reROR = new RegExp(RORPattern, "i");
function normalizeROR(ror) {
  let bareROR = ror.trim().toLowerCase();
  if (bareROR.startsWith(rorPrefix)) {
    return bareROR;
  }
  return `${rorPrefix}${bareROR}`;
}
function validateROR(ror) {
  const normalizedROR = normalizeROR(ror);
  return reROR.test(normalizedROR);
}

// ../metadatatools/ror_record.ts
async function verifyROR(ror) {
  const normalizedROR = normalizeROR(ror);
  return await verifyIdentifier(ror, normalizedROR, validateROR);
}

// ../metadatatools/snac.ts
var SNACPattern = "^\\d+$";
var reSNAC = new RegExp(SNACPattern);
function normalizeSNAC(id) {
  return id.trim();
}
function validateSNAC(id) {
  const normalizedId = normalizeSNAC(id);
  return reSNAC.test(normalizedId);
}

// ../metadatatools/snac_record.ts
async function verifySNAC(id) {
  const normalizedID = normalizeSNAC(id);
  return await verifyIdentifier(id, `https://snaccooperative.org/view/${normalizedID}`, validateSNAC);
}

// ../metadatatools/viaf.ts
var VIAFPattern = "^\\d+$";
var reVIAF = new RegExp(VIAFPattern);
function normalizeVIAF(id) {
  return id.trim();
}
function validateVIAF(id) {
  const normalizedID = normalizeVIAF(id);
  return reVIAF.test(normalizedID);
}

// ../metadatatools/viaf_record.ts
async function verifyVIAF(id) {
  const normalizedID = normalizeVIAF(id);
  return await verifyIdentifier(id, `https://viaf.org/viaf/${normalizedID}`, validateVIAF);
}

// ../metadatatools/tel.ts
var TELPattern = "^\\+?(\\d{1,3})?[-.\\s]?(\\(?\\d{1,4}\\)?)?[-.\\s]?\\d{1,4}[-.\\s]?\\d{1,4}[-.\\s]?\\d{1,9}$";
var reTEL = new RegExp(TELPattern);
function stripTEL(tel) {
  return tel.trim().replaceAll(/\D/gi, "");
}
function normalizeTEL(tel) {
  const bareTel = stripTEL(tel);
  switch (bareTel.length) {
    case 7:
      return `${bareTel.substring(0, 3)}-${bareTel.substring(3)}`;
    case 10:
      return `(${bareTel.substring(0, 3)}) ${bareTel.substring(3, 6)}-${bareTel.substring(6)}`;
    case 11:
      return `+00${bareTel.substring(0, 1)} (${bareTel.substring(1, 4)}) ${bareTel.substring(4, 7)}-${bareTel.substring(7)}`;
    case 12:
      return `+0${bareTel.substring(0, 2)} (${bareTel.substring(2, 5)}) ${bareTel.substring(5, 8)}-${bareTel.substring(8)}`;
    case 13:
      return `+${bareTel.substring(0, 3)} (${bareTel.substring(3, 6)}) ${bareTel.substring(6, 9)}-${bareTel.substring(9)}`;
    default:
      return tel;
  }
}
function validateTEL(tel) {
  return reTEL.test(tel);
}

// ../metadatatools/email.ts
var EMAILPattern = '^(?:"?([^"]*)"?\\s)?(?:<?(.+@[^>]+)>?)$';
var reEMAIL = new RegExp(EMAILPattern);
function normalizeEMAIL(email) {
  return email.trim().replaceAll(/\s+/g, "").trim();
}
function validateEMAIL(email) {
  const normalized = normalizeEMAIL(email);
  return reEMAIL.test(normalized);
}
export {
  ARXIVPattern,
  DOIPattern,
  EMAILPattern,
  ISBN10Pattern,
  ISBN13Pattern,
  ISBNPattern,
  ISNIPattern,
  ISSNPattern,
  LCNAFPattern,
  ORCIDPattern,
  PMCIDPattern,
  PMIDPattern,
  RORPattern,
  SNACPattern,
  TELPattern,
  VIAFPattern,
  appInfo,
  newARXIVPattern,
  normalizeArXivID,
  normalizeDOI,
  normalizeEMAIL,
  normalizeISBN,
  normalizeISNI,
  normalizeISSN,
  normalizeLCNAF,
  normalizeORCID,
  normalizePMCID,
  normalizePMID,
  normalizeROR,
  normalizeSNAC,
  normalizeTEL,
  normalizeVIAF,
  oldARXIVPattern,
  reARXIV,
  reDOI,
  reEMAIL,
  reISBN,
  reISBN10,
  reISBN13,
  reISNI,
  reISSN,
  reLCNAF,
  reNewARXIV,
  reORCID,
  reOldARXIV,
  rePMCID,
  rePMID,
  reROR,
  reSNAC,
  reTEL,
  reVIAF,
  validateArXivID,
  validateDOI,
  validateEMAIL,
  validateISBN,
  validateISNI,
  validateISSN,
  validateLCNAF,
  validateORCID,
  validatePMCID,
  validatePMID,
  validateROR,
  validateSNAC,
  validateTEL,
  validateVIAF,
  verifyArXivID,
  verifyDOI,
  verifyISBN,
  verifyISNI,
  verifyISSN,
  verifyLCNAF,
  verifyORCID,
  verifyPMCID,
  verifyPMID,
  verifyROR,
  verifySNAC,
  verifyVIAF
};
