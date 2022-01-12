cold - (C)ontrolled (o)bject (l)ist (d)aemon
============================================

This repository implements a service to maintain a controlled list of objects such as Caltech Library uses for crosswalking data using pid associated with a person, group or funding source.

Requirements
============

- MySQL 8
- Golang (for compiling the service)

Overview
--------

Caltech Library maintains a list of people, groups and funders and their related pids. This started being managed in Google Sheets, then in CSV files but the number of objects in envoled has increased and it make sense to provide a more robust implementation allowing for easier curation of the list. The objects are relatively flat with the exception of the name attribute.  Here's an example JSON object representing R. S. Doiel showing the internal identifier named "cl_people_id", name object, email, orcid and '@affiliation' which contains a ROR.

~~~
{
    "cl_people_id": "Doiel-R-S",
    "name": {
        "family": "Doiel",
        "given": "Robert",
        "display_name": "R. S. Doiel"
    },
    "email": "rsdoiel@caltech.edu",
    "orcid: "0000-0003-0900-6903",
    "ror": "https://ror.org/05dxps055"
} 
~~~

Some objects may have more attributes others less. A simple table schema containing a row id, an internal identifier (e.g. cl_people_id, cl_group_id, cl_funder_id), a "field" and a "value" can be used to represent all the types of fields associated with a given object.  A separate table can be used for person, group and finder with the individual objects stored as a JSON type. This is well suited to a data collection that has sparse consistency (e.g. one person might have an ORCID but not a research id, the next might have a viaf or wikidata id but not a ORCID).

~~~
CREATE TABLE people (cl_people_id VARCHAR(255) PRIMARY KEY, object JSON);
CREATE TABLE local_group (cl_group_id VARCHAR(255) PRIMARY KEY, object JSON);
CREATE TABLE funder (cl_funder_id VARCHAR(255) PRIMARY KEY, object JSON);
~~~

Approach
--------

This service, like ep3apid and datasetd is intended to run on localhost on a known port (e.g. localhost:8486). It is a mininal service relying on access control from the operating system or front-end web service (e.g. a Bottle application, Apache 2 with Shibboleth).  The goal of the service is to provide a light weight layer between the database storing the objects and the applications that need to work with them.  Also like ep3apid and datasetd *cold* is configured using a simple JSON "settings.json" file. Typically this would be stored in a sub-folder of "etc" on the system (e.g. /usr/local/etc/cold/settings.json).

The service is made up of two parts, a set of "End Points" for managing and retrieving controlled object lists and vocabularies as JSON expressions and a set of static files providing the user interface to manage and display the vocabularies and controlled object lists.  The static website is build from HTML, CSS, JavaScript leveraging Web Components for providing a sufficient interface.

End Points
----------

Plain text help is built in by adding a `/help` to the URL path. The defined end points are formed as the following. The following end point descriptions support the GET method.

`/`
: Plain text description of the service

`/version`
: Returns the version number of the service

`/people`
: Returns a list of "cl_people_id" managed by *cold*

`/people/{CL_PEOPLE_ID}`
: For a GET returns a people object, a PUT will create the people object, POST will replace the people object and DELETE will remove the people object

`/group`
: Returns a list of "cl_group_id" managed by *cold*

`/group/{CL_GROUP_ID}`
: For a GET returns a group object, a PUT will create the group object, POST will replace the group object and DELETE will remove the group object

`/funder`
: Returns a list of "cl_funder" managed by *cold*

`/funder/{CL_funder_ID}`
: For a GET returns a funder object, a PUT will create the funder object, POST will replace the funder object and DELETE will remove the funder object


`/crosswalk`
: Returns help on how to crosswalk from one identifier to the internal identifier

`/crosswalk/people`
: Returns a list of identifiers available for "people" objects

`/crosswalk/people/{IDENTIFIER_NAME}/{IDENTIFIER}`
: Returns a list of "cl_people_id" assocated with that identifier

`/crosswalk/group`
: Returns a list of identifiers available for "group" objects

`/crosswalk/group/{IDENTIFIER_NAME}/{IDENTIFIER}`
: Returns a list of "cl_group__id" assocated with that identifier

`/crosswalk/funder`
: Returns a list of identifiers available for "funder" objects

`/crosswalk/funder/{IDENTIFIER_NAME}/{IDENTIFIER}`
: Returns a list of "cl_funder_id" assocated with that identifier


*cold* takes a REST approach to updates for managed objects.  PUT will create a new object, POST will update it, GET will retrieve it and DELETE Will replace it.

Vocabularies
------------

*cold* also supports end points for stable vocabularies mapping an indentifier to a normalized name. These are set at compile time because they are so slow changing. 

`/subject`
: Returns a list of all the subject ids (codes)

`/subject/{SUBJECT_ID}`
: Returns the normalized text string for that subject id

`/issn`
: Returns a list of issn that are mapped to a publisher name

`/issn/{ISSN}`
: Returns the normalized publisher name for that ISSN


`/doi-prefix`
: Returns a list of DOI prefixes that map to a normalize name

`/doi-prefix/{DOI_PREFIX}`
: Returns the normalized publisher name for that DOI prefix

Widgets
-------

Widgets provide the user interface for humans to manage and view the objects. While **cold** can directly host these it is equally possible to integrate the static components into another system, web service or web site. They are only static web assets.  The public facing web service needs to control access to **cold** and the static content does not contain anything that is priviliged. The Widgets can be loaded indepentently in the page using the following end points.

`/widgets/display-person.js`
: This widget provides a consistent display for our Person Object. Markup example `<display-person honorific="Mr." given="R. S." family="Doiel" lineage="" orcid="0000-0003-0900-6903"></display-person>`

`/widgets/input-person.js`
: This widget provides a consistent input interface for our Person Object. Markup example `<input-person honorific="Mr." given="R. S." family="Doiel" lineage="" orcid="0000-0003-0900-6903"></input-person>`

`/widgets/display-group.js`
: This widget provides a consistent display for our Group Object. Markup example `<display-group name="GALCIT" ror=""></display-person>`

`/widgets/input-group.js`
: This widget provides a consistent input interface for our Group Object. Markup example `<input-group  name="GALCIT" ror="" label=""></input-person>`

`/widgets/display-subject.js`
: This widget provides a consistent display of a Subject Object, example `<display-subject name="biology" label="Biology"></display-subject>`

`/widgets/input-subject.js`
: This widget provides a consistent input interface for our Subject Object, example `<input-subject name="biology"></input-subject>`

`/widget/display-issn-publisher.js`
: This widget provides a consistent display of ISSN and publisher, example `<display-issn-publisher issn="XXXXXXXXXX"></display-issn-publisher>`

`/widget/input-issn-publisher.js`
: This widget provides a consistent input interface for our ISSN/Publisher Object, example `<input-issn-publisher issn="XXXXXXXXXX" publisher="Publisher Name"></input-issn-publisher>`

`/widget/display-doi-prefix.js`
: This widget lists a DOI-prefix and publisher, example `<display-doi-prefix doi="XXXXXX/XXXXXX.X"></display-doi-prefix>`

`/widget/input-doi-prefix.js`
: This widget provides a consistent input interface for our DOI Prefix/Publisher Object, example `<input-doi-prefix doi="XXXXXX/XXXXX.X" publisher="Publisher Name Here"></input-doi-prefix>`

