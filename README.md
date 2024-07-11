cold - (c)ontrolled (o)bject (l)ists and (d)atum
================================================

This repository implements a service to manage a controlled objects and datum (e.g. vocabularies). The public facing API is in this repository. It is built using TypeScript and Deno to presnet the public facing implementaiton.  The management user interface is in a separate GitHub repository, [cold_ui](https://github.com/caltechlibrary/cold_ui). It should be restricted to staff access and since it allows creating, replacing and deleting of objects and datum.  The public facing API is here. It uses it's own datasetd YAML file restricting access to read only methods.

If you are using Git then you can do a recursive checkout to get both the public safing API and the staff cold_ui repositories together in the same tree structure (e.g. `./cold` and `./cold/cold_ui`).

The deployed app will come in two forms. It will include a read only API along with connecting JavaScript for using the cold data by application. A private read/write implementation will be included for managing the cold objects. This will have access control inforced by Shibboleth on our application web server.

Overview
--------

Caltech Library maintains a list of people, groups and funders and their related pids. This started being managed in Google Sheets, then in CSV files. The number of objects involved has increased. It makes sense to provide a more robust implementation allowing for easier curation of objects. The objects currently are relatively flat.  Here's an example JSON object representing R. S. Doiel showing the internal identifier named "cl_people_id", name object, email, orcid and Caltech affiliation is shown both via a boolean field and a ROR.

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
- **cold_ui** (a sub repositoru) provides a management interface. It uses a different instance of datasetd providing a read/write JSON API and a typescript web service for the management UI.
- **cold** and **cold_ui** uses [handlerbars](https://handlerbarsjs.com) templates, each with their own views template heirarchy.

An important point to taking this approach. The application has zero concept of users and access control.
Access control is defered to our front end web server using Shibboleth.


**cold**'s Read-Only End Points
---------------------

JSON API is provided by datasetd. The following end point descriptions support the GET method.

The public endpoints are (using the HTTP GET method)

`/api/<collection_name>`
: A description of PostgREST information

`/cold/version`
: Returns the version number of the service

`/cold/people`
: Returns a Caltech People "cl_people_id" managed by *cold*

`/cold/people/{CL_PEOPLE_ID}`
: Returns sanitized people object (e.g. email is redacted)

`/cold/group`
: Returns a list of "cl_group_id" managed by *cold*

`/cold/group/{CL_GROUP_ID}`
: Returns a santized group object (e.g. email is redacted)


Crosswalks (planned)
--------------------

A cross walk lets you put in a collection name (e.g. people, group), a field name and a value and it returns a list of matching
records. These are available from the public API.

`/cold/crosswalk/people/{IDENTIFIER_NAME}/{IDENTIFIER_VALUE}`
: Returns a list of "cl_people_id" assocated with that identifier

`/cold/crosswalk/group/{IDENTIFIER_NAME}/{IDENTIFIER_VALUE}`
: Returns a list of "cl_group__id" assocated with that identifier

*cold* takes a REST approach to updates for managed objects.  PUT will create a new object, POST will update it, GET will retrieve it and DELETE will remove it.

Vocabularies
------------

*cold* also supports end points for stable vocabularies mapping an indentifier to a normalized name. These are set at compile time because they are so slow changing.

`/cold/subject`
: Returns a list of all the subject ids (codes)

`/cold/subject/{SUBJECT_ID}`
: Returns the normalized text string for that subject id

`/cold/issn`
: Returns a list of issn that are mapped to a publisher name

`/cold/issn/{ISSN}`
: Returns the normalized publisher name for that ISSN

`/cold/doi-prefix`
: Returns a list of DOI prefixes that map to a normalize name

`/cold/doi-prefix/{DOI_PREFIX}`
: Returns the normalized publisher name for that DOI prefix

Manage interface
----------------

The management inteface is avialable at `/app/dashboard.html` path. This provides a dashboard which then interacts with the JSON side of the service to update content. The manage interface is built from Web Components and requires JavaScript to be enabled in the browser.

Widgets
-------

Widgets are implementations of one or more Web Components. They provide the user interface for humans to manage and view the objects. While **cold** can directly host these it is equally possible to integrate the static components into another system, web service or web site. The public facing web service needs to control access to **cold** and the static content does not contain anything that is priviliged. The Widgets can be loaded indepentently in the page using the following end points.

`/widgets/person.js`
: This JavaScript file provides a display and input set of web components for our Person Object. Markup example `<person-display honorific="Mr." given="R. S." family="Doiel" lineage="" orcid="0000-0003-0900-6903"></person-display>` and `<person-input honorific="Mr." given="R. S." family="Doiel" lineage="" orcid="0000-0003-0900-6903"></person-input>`

`/widgets/group.js`
: This JavaScript file provides a display and input set of web components for our Markup example `<group-display name="GALCIT" ror=""></group-display>` and `<group-input  name="GALCIT" ror="" label=""></group-input>`

`/widgets/vocabulary.js`
: This JavaScript file provides a identifier/name web component suitable for displaying subjects, issn/publisher info and doi-prefix/publisher info.


Requirements
------------

- Newt >= 0.0.8
- Dataset >= 2.2.13 (using SQL JSON storage) and PostgreSQL >= 16
- To build the UI and compile the assets needed by **cold**
  - GNU Make
  - [Pandoc](https://pandoc.org) >= 3 (to build documentation and man page)
  - A text editor (e.g. Zed, VSCode, micro, nano, vi, emacs ...)
- A front end web server with SSO or Basic Auth support
- A web browser with JavaScript support

Recommended
-----------

Most package managers running on various flavors of Unix (e.g. macOS, Linux) do not provide Pandoc 3 or PostgREST at this time (2023-12).  There is a good chance you will need to build this from source.

Pandoc and PostgREST are Haskell programs (i.e. they are written in Haskell programming langauge and use it's tool chain).  I recomment installing GHCup first then download and build Pandoc and PostgREST.  GHCup provides a reliable Haskell development environment.

1. Install Haskell via [ghcup](https://www.haskell.org/ghcup/)
2. See [Pandoc](https://pandoc.org/installing.html#quick-cabal-method) and follow instructions to compile Pandoc 3
3. See [https://postgrest.org/en/stable/install.html#building-from-source]) and following instructions to compile PostgREST 11

### A note about macOS, Postgres and PostgREST

I have found the easiest most reliable way to get Postgres and PostgREST up and running on macOS is via [Postgres APP](https://postgres.app).

If you take this route you want to install the version with the heading [Postgres.app with all currently supported versions (Universal/Intel)](https://postgresapp.com/downloads.html). This will insure you have the necessary libraries install that [PostgREST](https://postgrest.org) needs when compiling from source (i.e. `libpg`).
