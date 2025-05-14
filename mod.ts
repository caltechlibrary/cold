/* COLD related packages */
export { makePage } from "./render.ts";
export { licenseText, releaseDate, releaseHash, version } from "./version.ts";
export { matchType, OptionsProcessor } from "./options.ts";
export { handlePeople, People } from "./people.ts";
export { Group, handleGroups } from "./groups.ts";
export { Funder, handleFunders } from "./funders.ts";
export { handleSubjects, Subject } from "./subjects.ts";
export { handleJournals, Journals } from "./journals.ts";
export { DOIPrefix, handleDOIPrefix } from "./doi_prefix.ts";
export { renderHtdocs } from "./build.ts";
export type { PeopleInterface } from "./people.ts";
