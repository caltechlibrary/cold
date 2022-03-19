cold - (C)ontrolled (o)bject (l)ist (d)aemon
============================================

This repository implements a service to maintain a controlled list of objects at Caltech Library for people and groups.

Requirements
============

- MySQL 8
- To build the UI and compile the **cold** daemon
    - GNU Make
    - [MkPage](https://github.com/caltechlibrary/mkpage) (to build UI)
    - [Pandoc](https://pandoc.org) (to build UI)
    - Golang (for compiling the service, needed when updating static vocabularies)

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

This service is intended to run on localhost on a known port (e.g. localhost:8486). It is a mininal service relying on access control from the operating system or front-end web service (e.g. Apache 2 with Shibboleth).  The goal of the service is to provide a light weight layer between the database storing the objects and the applications that need to work with them.  Like ep3apid and datasetd *cold* is configured using a simple JSON "settings.json" file. Typically this would be stored in a sub-folder of "etc" on the system (e.g. /usr/local/etc/cold/settings.json).

The service is made up of two parts, a set of "End Points" for managing and retrieving controlled object lists and vocabularies as JSON expressions and a set of static files providing the user interface to manage and display the vocabularies and controlled object lists.  The static website is build from HTML, CSS, JavaScript relying on Web Components for providing a human friendly interface.

End Points
----------

JSON service defined end points are formed as the following. The following end point descriptions support the GET method.

`/`
: A description of the service

`/api/version`
: Returns the version number of the service

`/api/people`
: Returns a list of "cl_people_id" managed by *cold* 

`/api/people/{CL_PEOPLE_ID}`
: For a GET returns a people object, a PUT will create the people object, POST will replace the people object and DELETE will remove the people object

`/api/group`
: Returns a list of "cl_group_id" managed by *cold*

`/api/group/{CL_GROUP_ID}`
: For a GET returns a group object, a PUT will create the group object, POST will replace the group object and DELETE will remove the group object

Crosswalks
----------

A cross walk lets you put in a collection name (e.g. people, group), a field name and a value and it returns a list of matching
records.

`/api/crosswalk/people/{IDENTIFIER_NAME}/{IDENTIFIER_VALUE}`
: Returns a list of "cl_people_id" assocated with that identifier

`/api/crosswalk/group/{IDENTIFIER_NAME}/{IDENTIFIER_VALUE}`
: Returns a list of "cl_group__id" assocated with that identifier

*cold* takes a REST approach to updates for managed objects.  PUT will create a new object, POST will update it, GET will retrieve it and DELETE will remove it.

Vocabularies
------------

*cold* also supports end points for stable vocabularies mapping an indentifier to a normalized name. These are set at compile time because they are so slow changing. 

`/api/subject`
: Returns a list of all the subject ids (codes)

`/api/subject/{SUBJECT_ID}`
: Returns the normalized text string for that subject id

`/api/issn`
: Returns a list of issn that are mapped to a publisher name

`/api/issn/{ISSN}`
: Returns the normalized publisher name for that ISSN


`/api/doi-prefix`
: Returns a list of DOI prefixes that map to a normalize name

`/api/doi-prefix/{DOI_PREFIX}`
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
