cold - (c)ontrolled (o)bject (l)ists and (d)atum
================================================

This repository implements the public facing web service of managed controlled object lists and datum (e.g. vocabularies). It is built using TypeScript and Deno.  The management user interface is in a separate GitHub repository, [github.com/caltechlibrary/cold_ui](https://github.com/caltechlibrary/cold_ui).

**cold** has it's own datasetd YAML file creating a read only JSON API in addition to providing a static content web service.

To combine the public and management repositories into a common directory structure tou can use Git's recursive clone to get both the public API and the management API implemented in the **cold_ui** repository as a submodule of **cold**.

You will need to configure (control access) via your front end web server software (e.g. Apache2, NginX , Lighttpd) using a single sign-on implementation like Shibboleth.

Overview
--------

Caltech Library maintains a list of people, groups and funders and their related pids. For many years this was managed using a spreadsheet, then Google Sheets, and more recently in CSV files. Over time the number of objects involved has increased. It makes sense to provide a more robust implementation allowing for easier curation of objects. The objects currently are relatively flat.  Here's an example JSON object representing R. S. Doiel showing the internal identifier named "cl_people_id", name object, email, orcid and Caltech affiliation is shown both via a boolean field and a ROR.

~~~json
{
    "cl_people_id": "Doiel-R-S",
    "family_name": "Doiel",
    "given_name": "Robert",
    "orcid": "0000-0003-0900-6903",
    "authors_id": "Doiel-R-S",
    "directory_id": "rsdoiel",
    "caltech": true,
    "status": "Active",
    "directory_person_type": "Staff",
    "division": "Libraries Group",
    "updated": "2022-03-09"
    "ror": "https://ror.org/05dxps055"
}
~~~

A group object for Caltech Library is relatively flat.

~~~json
{
    "cl_group_id": "Caltech-Library",
    "name": "Caltech Library",
    "alternative": [ "Caltech Library System", "Library System Papers and Publications" ],
    "updated": "2023-07-21 00:08:00",
    "created": "2023-07-21",
    "email": "library@caltech.edu",
    "description": "Caltech Library serves teaching, research, and academic needs of its students, faculty, and staff of Caltech.",
    "start": "1965",
    "start_is_approx": true,
    "activity": "active",
    "end": "",
    "end_is_approx": false,
    "website": "https://library.caltech.edu",
    "pi": "",
    "parent": "",
    "prefix": "",
    "grid": "",
    "isni": "",
    "ringold": "",
    "viaf": "",
    "ror": "https://ror.org/05dxps055"
}
~~~

Approach Details
----------------

- **cold** is built on datasetd providing static file hosting as well as a readonly JSON API to a selection of dataset collections (e.g. Caltech People and Groups).
- **cold_ui** (a submodule repository) provides a management interface. It uses a different instance of datasetd providing a read/write JSON API and a typescript web service for the managing the data.
- **cold** and **cold_ui** use [handlerbars](https://handlerbarsjs.com) templates, each with their own "view" template heirarchies.

__An important point is access control is deferred to the front end web server (e.g. Apache2+Shibboleth).__

**cold**'s Read-Only End Points
-------------------------------

JSON API is provided by datasetd. The following end point descriptions support the GET method.

The public endpoints are (using the HTTP GET method)

`/api/version`
: Returns the version number of the datasetd service

`/api/people.ds`
: Returns Caltech People "clpid" managed by **cold**

`/api/people.ds/{CLPID}`
: Returns sanitized people object (e.g. email is redacted)

`/api/people.ds/query/people_names`
: Returns sanitized list of minimal people objects (clpid and name)

`/api/groups.ds`
: Returns a list of "clgid" managed by *cold*

`/api/groups.ds/{CLGID}`
: Returns a santized group object (e.g. email is redacted)

`/api/groups.ds/query/group_names`
: Returns sanitized list of minimal group objects (clgid and name)

`/api/funders.ds`
: Returns Caltech Funders "clfid" managed by **cold**

`/api/funders.ds/{CLFID}`
: Returns a santized funder object (e.g. email is redacted)

`/api/funders.ds/query/funder_names`
: Returns sanitized list of minimal funder objects (clfid and name)

Crosswalks (planned)
--------------------

A cross walk lets you put in a collection name (e.g. people.ds, group.ds), a field name and a value and it returns a list of matching
records. These are available from the public API.

`/api/people.ds/query/crosswalk/{IDENTIFIER_NAME}/{IDENTIFIER_VALUE}`
: Returns a list of "clpid" assocated with that identifier

`/api/groups.ds/query/crosswalk/{IDENTIFIER_NAME}/{IDENTIFIER_VALUE}`
: Returns a list of "clgid" assocated with that identifier

`/api/funders.ds/query/crosswalk/{IDENTIFIER_NAME}/{IDENTIFIER_VALUE}`
: Returns a list of "clgid" assocated with that identifier

*cold* takes a REST approach to updates for managed objects.  PUT will create a new object, POST will update it, GET will retrieve it and DELETE will remove it.

Vocabularies
------------

**cold** and **cold_ui** also support end points for stable vocabularies mapping an indentifier to a normalized name. These are set at compile time because they are so slow changing.

`/api/subject.ds`
: Returns a list of all the subject ids (codes)

`/api/subject.ds/{SUBJECT_ID}`
: Returns the normalized text string for that subject id

`/api/issn.ds`
: Returns a list of issn that are mapped to a publisher name

`/api/issn.ds/{ISSN}`
: Returns the normalized publisher name for that ISSN

`/api/doi_prefix.ds`
: Returns a list of DOI prefixes that map to a normalize name

`/api/doi_prefix.ds/{DOI_PREFIX}`
: Returns the normalized publisher name for that DOI prefix

Management interface
--------------------

The management inteface is avialable at `/cold/cold_ui/` path. This provides a dashboard which then interacts with the JSON side of the service to update content. The manage interface is built includes Web Components and requires JavaScript to be enabled in the browser.

Requirements
------------

- Dataset >= 2.2.15 (using SQL JSON storage) and PostgreSQL >= 16
- To build the UI and compile the assets needed by **cold**
  - GNU Make
  - [Pandoc](https://pandoc.org) >= 3 (to build documentation and man page)
  - A text editor (e.g. Zed, VSCode, micro, nano, vi, emacs ...)
- A front end web server with SSO or Basic Auth (e.g. during development) support
- A web browser with JavaScript support enabled

Recommended
-----------

Most package managers running on various flavors of Unix (e.g. macOS, Linux) do not provide Pandoc 3 or PostgREST at this time (2023-12).  There is a good chance you will need to build this from source.

Pandoc and PostgREST are Haskell programs (i.e. they are written in Haskell programming langauge and use it's tool chain).  I recomment installing GHCup first then download and build Pandoc and PostgREST.  GHCup provides a reliable Haskell development environment.

1. Install Haskell via [ghcup](https://www.haskell.org/ghcup/)
2. See [Pandoc](https://pandoc.org/installing.html#quick-cabal-method) and follow instructions to compile Pandoc 3
3. See [https://postgrest.org/en/stable/install.html#building-from-source]) and following instructions to compile PostgREST 11
