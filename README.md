cold - (c)ontrolled (o)bject (l)ists and (d)atum
================================================

This repository implements a service to maintain a controlled list of
objects and vocabularies used at Caltech Library for people, organizations
and funders. It is built from data modeled in PostgreSQL and managed via
a series of microservices that combine to form a human user interface
implemented in the web browser.

Requirements
------------

- PostgreSQL >= 15
- PostgREST >= 11
- Pandoc >= 3
- Newt >= 0.0.3
- To build the UI and compile the assets needed by **cold**
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
on the system where **cold** will run.  I recomment installing GHCup first
then download and build Pandoc and PostgREST. GHCup provides a reliable
Haskell development environment.

1. Install Haskell via [ghcup](https://www.haskell.org/ghcup/)
2. See [Pandoc](https://pandoc.org/installing.html#quick-cabal-method) and follow instructions to compile Pandoc 3
3. See [https://postgrest.org/en/stable/install.html#building-from-source]) and following instructions to compile PostgREST 11

Overview
--------

Caltech Library maintains a list of people, groups and funders and their related pids. This started being managed in Google Sheets, then in CSV files but the number of objects in envoled has increased and it make sense to provide a more robust implementation allowing for easier curation of the list. The objects are relatively flat.  Here's an example JSON object representing R. S. Doiel showing the internal identifier named "cl_people_id", name object, email, orcid and Caltech affiliation is shown both via a boolean field and a ROR.

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

Newt can read a simple YAML based model description and generated the SQL too bootstrap Cold's models.  The management of the models can be defined through Newt's routing capabilities as well as Postgres database procedures, functions, triggers and events.

A Newt description of the person model would like the following. The SQL bootstrap is generated automatically by Newt using the option `-pg-models`.

~~~yaml
models:
- model: cl_people
- var:
  cl_people_id: String
  family_name: String
  given_name: String
  orcid: ORCID
  author_id: String
  directory_id: String
  caltech: Boolean
  status: Boolean
  direcotry_person_type: String
  division: String
  updated: Date 2006-01-02
  ror: ROR
- model: cl_group
- var:
  cl_group_id: String Primary Key
  name: String
  alternative: Array String
  updated: Timestamp
  # Date group was added to Group List
  date: Date 2006-01-02
  email: EMail
  description: Text
  start: String
  # approx_starts indicates if the "start" is an approximate (true) or exact (false)
  approx_start: Boolean
  # activity is a string value holding either "active" or "inactive"  
  activity: String
  end: String
  # approx_end indicates if the "start" is an approximate (true) or exact (false)
  approx_end: Boolean
  website: Url
  pi: String
  parent: String
  # prefix holds the DOI prefix associated with the group
  prefix: String
  grid: String
  isni: ISNI
  ringold: String
  viaf: String
  ror: ROR
~~~

Approach
--------

**cold** is built using Newt. Newt is used to generate the basic SQL models deployed in Postgres. PostgREST is used to
provide a JSON API for managing objects and controlled vocabularies. Pandoc server is used to render JSON 
into a human friendly UI with Newt running as a service orchestrating the conversation between PostgREST, Pandoc
and the requestioning web browser. Access control is left to the front-end web server via SSO and user lists (e.g. Shibboleth and .htaccess files if using Apache 2).


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
----------------

The management inteface is avialable at `/app/dashboard.html` path. This provides a dashboard which then interacts with the JSON side of the service to update content. The manage interface is built from Web Components and requires JavaScript to be enabled in the browser.

Widgets
-------

Widgets provide the user interface for humans to manage and view the objects. While **cold** can directly host these it is equally possible to integrate the static components into another system, web service or web site. The public facing web service needs to control access to **cold** and the static content does not contain anything that is priviliged. The Widgets can be loaded indepentently in the page using the following end points.

`/widgets/person.js`
: This JavaScript file provides a display and input set of web components for our Person Object. Markup example `<person-display honorific="Mr." given="R. S." family="Doiel" lineage="" orcid="0000-0003-0900-6903"></person-display>` and `<person-input honorific="Mr." given="R. S." family="Doiel" lineage="" orcid="0000-0003-0900-6903"></person-input>`

`/widgets/group.js`
: This JavaScript file provides a display and input set of web components for our Markup example `<group-display name="GALCIT" ror=""></group-display>` and `<group-input  name="GALCIT" ror="" label=""></group-input>`

`/widgets/vocabulary.js`
: This JavaScript file provides a identifier/name web component suitable for displaying subjects, issn/publisher info and doi-prefix/publisher info.
