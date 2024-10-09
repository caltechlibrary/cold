import { directoryUrl, Document, DOMParser, Element } from "./deps.ts";

export interface DirectoryRecordInterface {
  display_name: string;
  given_name: string;
  family_name: string;
  title: string;
  directory_person_type: string;
  org: string;
  division: string;
  bio: string;
  office: string;
  email: string;
}

export class DirectoryRecord implements DirectoryRecordInterface {
  display_name: string = "";
  given_name: string = "";
  family_name: string = "";
  title: string = "";
  directory_person_type: string = "";
  org: string = "";
  division: string = "";
  bio: string = "";
  office: string = "";
  email: string = "";
}

function getElementValue(document: Document, selector: string): string {
  const val = document.querySelector(selector);
  if (val === null) {
    return "";
  }
  return val.innerText;
}

export async function directoryLookup(
  imss_uid: string,
): Promise<DirectoryRecord | undefined> {
  const uri = `${directoryUrl}/personnel/${imss_uid}?off_campus`;
  const resp = await fetch(uri, {
    headers: { "content-type": "text/html" },
    method: "GET",
  });
  if (resp.ok) {
    const src = await resp.text();
    const document = new DOMParser().parseFromString(src, "text/html");
    let record = new DirectoryRecord();
    record.display_name = getElementValue(document, ".fn");
    record.given_name = getElementValue(document, ".given-name");
    record.family_name = getElementValue(document, ".family-name");
    record.title = getElementValue(document, ".title");
    record.directory_person_type = getElementValue(document, ".person_type");
    record.org = getElementValue(document, ".organization-name");
    record.division = getElementValue(document, ".organization-unit");
    record.bio = getElementValue(document, ".bio");
    record.office = getElementValue(document, ".office");
    record.email = getElementValue(document, ".email");
    return record;
  }
  if (resp.body !== null) {
    resp.body.cancel();
  }
  return undefined;
}
