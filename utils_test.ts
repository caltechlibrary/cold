import {
  assertStrictEquals,
  formDataToObject,
  pathIdentifier,
  apiPathParse,
} from "./deps.ts";

Deno.test("testApiPathParse", () => {
  let uri = "http://localhost:8111/api/groups?q=" + encodeURIComponent("This is a bit thing/widget");
  let o = apiPathParse(uri);
  assertStrictEquals(o.c_name, "groups", `expected "groups", got "${o.c_name}"`);
  assertStrictEquals(o.q, "This is a bit thing/widget", `expected "This is a bit thing/widget", got "${o.q}"`)
  assertStrictEquals(o.query_name, undefined, `expected the query name to be undefined, got "${o.query_name}"`);
  uri = "http://localhost:8111/api/people/lookup_people?clpid=Doiel-R-S";
  o = apiPathParse(uri);
  assertStrictEquals(o.c_name, "people");
  assertStrictEquals(o.query_name, "lookup_people");
  assertStrictEquals(o.q, undefined, `expected q to be undefined, got "${o.q}"`);
  assertStrictEquals(o.clpid, "Doiel-R-S", `expected clpid to be "Doiel-R-S", got "${o.clpid}"`);
});

Deno.test("testPathIdentifier", () => {
  let uri = "http://localhost:8111/groups/LIGO";
  const expected = "LIGO";
  const got = pathIdentifier(uri);
  assertStrictEquals(got, expected, `expected ${expected}, got ${got}`);
});

Deno.test("testDataToObject", () => {
  const expectedObject: Object = {
    Scope: "",
    activity: "inactive",
    alternative: [],
    clgid: "COSMOS",
    date: "",
    description:
      "The Cosmic Evolution Survey (COSMOS) is an astronomical survey designed to probe the formation and evolution of galaxies as a function of both cosmic time (redshift) and the local galaxy environment.",
    email: "",
    end_date: "",
    grid: "",
    include_in_feeds: true,
    is_approx_end: false,
    is_approx_start: false,
    isni: "",
    name: "COSMOS",
    parent: "",
    pi: "",
    prefix: "",
    ringold: "",
    ror: "",
    start_date: "",
    updated: "3/26/20",
    viaf: "",
    website: "https://cosmos.astro.caltech.edu/",
  };
  const form = new FormData();
  form.set("Scope", "");
  form.set("activity", "inactive");
  form.set("alternative", "");
  form.set("clgid", "COSMOS");
  form.set("date", "");
  form.set(
    "description",
    "The Cosmic Evolution Survey (COSMOS) is an astronomical survey designed to probe the formation and evolution of galaxies as a function of both cosmic time (redshift) and the local galaxy environment.",
  );
  form.set("email", "");
  form.set("end_date", "");
  form.set("grid", "");
  form.set("include_in_feeds", "true");
  form.set("is_approx_end", "false");
  form.set("is_approx_start", "false");
  form.set("isni", "");
  form.set("name", "COSMOS");
  form.set("parent", "");
  form.set("pi", "");
  form.set("prefix", "");
  form.set("ringold", "");
  form.set("ror", "");
  form.set("start_date", "");
  form.set("updated", "3/26/20");
  form.set("viaf", "");
  form.set("website", "https://cosmos.astro.caltech.edu/");
  form.set("submit", "submit");

  const obj = formDataToObject(form);
  const hasSubmit = "submit" in obj;

  assertStrictEquals(hasSubmit, false, "expected submit to be removed");
});
