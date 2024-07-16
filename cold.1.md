% cold(1) cold user manual | Version 0.0.5
% R. S. Doiel and Tom Morrell
% 2024-07-16

# NAME

cold

# SYNOPSIS

cold [OPTIONS] [SETTINGS_FILENAME]

# DESCRIPTION

Run the controlled object list and datum.

**cold** implements a web service to maintain a controlled list of objects such as Caltech Library uses for crosswalking data using pid associated with a person, group or funding source. It is also used to maintain system independant vocabularies.

# Requirements

- Dataset >= 2.1.15
- Deno >= 1.44
- Pandoc > 3.1 (for building repository documentation)

# Overview

Caltech Library maintains a list of people, groups and funders and their related pids. This started being managed in Google Sheets, then in CSV files but the number of objects in envoled has increased and it make sense to provide a more robust implementation allowing for easier curation of the list. The objects are relatively flat with the exception of the name attribute.  Here's an example JSON object representing R. S. Doiel showing the internal identifier named "cl_people_id", name object, email, orcid and '@affiliation' which contains a ROR.

~~~json
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

Data like this can easily be manage in Postgres and then made available as a JSON data source via PostgREST. The prototype Newt let's us easily integrate PostgREST results with Pandoc server. As a result **cold** is now a Newt based web application.  It supports not just Caltech related People, Groups and Funders but also additional vocabularies which we need to cordinate between systems (e.g. RDM instances or publication systems like feeds.library.caltech.edu).

# Build on dataset collections

This iteration of **cold** is implemented using dataset collections and the datasetd web service.  The `cold_public.yaml` configures datasetd to provide a read only JSON API as well as static file service.

In the release we support two collections collections, groups.ds and people.ds. Additional collections will be added to support addition types of object lists (e.g. funders, isni mappings, doi prefix mappings).

Each type of list is has its own model. Each model is implemented as a TypeScript interface. A collection of functions are also provided to work with the various TypeScript interfaces.  These are rendered as JavaScript to support browser side widgets where appropriate.

Deno provides the middle layer (middleware) between datasetd and your front end web server.  You can start the middleware using a Deno task. There is also one supplied to start datasetd.  In development you would execute these from a shell session(s).  In production you should wrap these services in a systemd script (examples included in this repository).

## End Points

The following end point descriptions support the GET method. They could be prefixed with additional path elements in a production setting (e.g. `/apps/cold/...`).

```/```
: Description of the service (provided by htdocs/index.html)

```/api/version```
: Returns the version number of the service based on the value set in the codemeta.json when the make command has been run to (re) version.sql

```/api/people.ds```
: Returns a list of "cl_people_id" managed by *cold* as an HTML content.

```/api/people.ds/{CL_PEOPLE_ID}```
: For a GET returns a people object, a POST will create the people object, PUT will replace the people object, PATCH will replace part of an object and DELETE will remove the people object

```/api/groups.ds```
: Returns a list of "cl_group_id" managed by *cold*

```/api/groups.ds/{CL_GROUP_ID}```
: For a GET returns a group object, a POST will create the group object, PUT will replace the group object, PATCH will replace part of an object and DELETE will remove the group object

```/api/funder.ds```
: Returns a list of "cl_funder" managed by *cold*

```/api/funder.ds/{CL_funder_ID}```
: For a GET returns a funder object, a PUT will create the funder object, POST will replace the funder object and DELETE will remove the funder object


```/api/crosswalk```
: Returns help on how to crosswalk from one identifier to the internal identifier

```/api/crosswalk/people.ds```
: Returns a list of identifiers available for "people" objects

```/api/crosswalk/people.ds/{IDENTIFIER_NAME}/{IDENTIFIER}```
: Returns a list of "cl_people_id" assocated with that identifier

```/api/crosswalk/groups.ds```
: Returns a list of identifiers available for "group" objects

```/api/crosswalk/groups.ds/{IDENTIFIER_NAME}/{IDENTIFIER}```
: Returns a list of "cl_group__id" assocated with that identifier

```/api/crosswalk/funders.ds```
: Returns a list of identifiers available for "funder" objects

```/api/crosswalk/funders.ds/{IDENTIFIER_NAME}/{IDENTIFIER}```
: Returns a list of "cl_funder_id" assocated with that identifier


*cold* takes a REST approach to updates for managed objects.  POST will create a new object, PATH will update a part of it and PUT will update the whole object. GET will retrieve it and DELETE Will replace it.

## Vocabularies

*cold* also supports end points for stable vocabularies mapping an indentifier to a normalized name. These are set at compile time because they are so slow changing.

```/api/subject.ds```
: Returns a list of all the subject ids (codes)

```/api/subjects.ds/{SUBJECT_ID}```
: Returns the normalized text string for that subject id

```/api/issn.ds```
: Returns a list of issn that are mapped to a publisher name

```/api/issn.ds/{ISSN}```
: Returns the normalized publisher name for that ISSN


```/api/doi_prefix.ds```
: Returns a list of DOI prefixes that map to a normalize name

```/api/doi_prefix.ds/{DOI_PREFIX}```
: Returns the normalized publisher name for that DOI prefix
