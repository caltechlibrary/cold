cold - (c)ontrolled (o)bject (l)ist (d)aemon
============================================

This repository implements a service to maintain a controlled list of
objects and vocabularies used at Caltech Library for people, organizations
and funders. It is built from data modeled in PostgreSQL and managed via
a series of microservices that combine to form a human user interface
implemented in the web browser.

Requirements
============

- PostgreSQL 14
- PostgREST 11
- Pandoc 3
- To build the UI and compile the **cold** daemon
    - GNU Make
    - [Pandoc](https://pandoc.org) (to build UI)
    - A text editor (e.g. Zed, VSCode, micro, nano, vi, emacs ...)
- A front end web server with SSO or Basic Auth support
- A web browser with JavaScript support 

Recommended
-----------

Most package managers running on various flavors of Unix (e.g. macOS,
Linux) do not provide Pandoc 3 or PostgREST. There is a good chance
you will need to build this from source if they are not already available
on the system where **cold** will run.

- Install Haskell via [ghcup](https://www.haskell.org/ghcup/)
    - See [Pandoc](https://pandoc.org/installing.html#quick-cabal-method) to for instructions to compile Pandoc 3
    - See [https://postgrest.org/en/stable/install.html#building-from-source]) for instructions to compile PostgREST 10

Overview
--------

Caltech Library maintains a list of people, groups and funders and their related pids. This started being managed in Google Sheets, then in CSV files but the number of objects in envoled has increased and it make sense to provide a more robust implementation allowing for easier curation of the list. The objects are relatively flat.  Here's an example JSON object representing R. S. Doiel showing the internal identifier named "cl_people_id", name object, email, orcid and Caltech affiliation is shown both via a boolean field and a ROR.

~~~
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

A group object for Caltech Library is also flat.

~~~
{
    "cl_group_id": "Caltech-Library",
    "name": "Caltech Library",
    "alternative": "Caltech Library System; Library System Papers and Publications",
    "updated": "2020-03-26 00:00:00"
}
~~~

Some objects may have more attributes others less. A simple table schema containing a row id, an internal identifier (e.g. cl_people_id, cl_group_id), a "field" and a "value" can be used to represent all the types of fields associated with a given object.  A separate table can be used for person, group and finder with the individual objects stored as a JSON type. This is well suited to a data collection that has sparse consistency (e.g. one person might have an ORCID but not a research id, the next might have a viaf or wikidata id but not a ORCID).

~~~
CREATE TABLE people (cl_people_id VARCHAR(255) PRIMARY KEY, object JSON);
CREATE TABLE local_group (cl_group_id VARCHAR(255) PRIMARY KEY, object JSON);
<!-- CREATE TABLE funder (cl_funder_id VARCHAR(255) PRIMARY KEY, object JSON); -->
~~~

Approach
--------

**cold** models it data in PostgreSQL which is responsible for defining
views and procedures to implement end points in a JSON API provide by 
PostgREST. The UI for **cold** is implemented in the web browser via
static HTML, CSS and JavaScript. Since displaying data structures can
be burdensome directly with JavaScript interacting with the DOM Pandoc
running in server mode is available to compose the framents from
the JSON API service. JavaScript running in the browser is then resposible
for fetching the JSON represention, passing the results along with template
info too the Pandoc server before injecting them into the browser DOM.

End Points
----------

JSON API is provided by PostgREST. The following end point descriptions support the GET method.

`/`
: A description of PostgREST information

`/cold/version`
: Returns the version number of the service

`/cold/people`
: Returns a list of "cl_people_id" managed by *cold* 

`/cold/people/{CL_PEOPLE_ID}`
: For a GET returns a people object, a PUT will create the people object, POST will replace the people object and DELETE will remove the people object

`/cold/group`
: Returns a list of "cl_group_id" managed by *cold*

`/cold/group/{CL_GROUP_ID}`
: For a GET returns a group object, a PUT will create the group object, POST will replace the group object and DELETE will remove the group object

Crosswalks
----------

A cross walk lets you put in a collection name (e.g. people, group), a field name and a value and it returns a list of matching
records.

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
================

The management inteface is avialable at `/app/dashboard.html` path. This provides a dashboard which then interacts with the JSON side of the service to update content. The manage interface is built from Web Components and requires JavaScript to be enabled in the browser.

Widgets
-------

Widgets provide the user interface for humans to manage and view the objects. While **cold** can directly host these it is equally possible to integrate the static components into another system, web service or web site. They are only static web assets.  The public facing web service needs to control access to **cold** and the static content does not contain anything that is priviliged. The Widgets can be loaded indepentently in the page using the following end points.

`/widgets/person.js`
: This JavaScript file provides a display and input set of web components for our Person Object. Markup example `<person-display honorific="Mr." given="R. S." family="Doiel" lineage="" orcid="0000-0003-0900-6903"></person-display>` and `<person-input honorific="Mr." given="R. S." family="Doiel" lineage="" orcid="0000-0003-0900-6903"></person-input>`

`/widgets/group.js`
: This JavaScript file provides a display and input set of web components for our Markup example `<group-display name="GALCIT" ror=""></group-display>` and `<group-input  name="GALCIT" ror="" label=""></group-input>`

`/widgets/vocabulary.js`
: This JavaScript file provides a identifier/name web component suitable for displaying subjects, issn/publisher info and doi-prefix/publisher info.
