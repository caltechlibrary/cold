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

Some objects may have more attributes others less. A simple table schema containing a row id, an internal identifier (e.g. cl_people_id, cl_group_id, cl_funder_id), a "field" and a "value" can be used to represent all the types of fields associated with a given object.  A separate table can be used for person, group and finder. This is well suited to a data collection that has sparse consistency (e.g. one person might have an ORCID but not a research id, the next might have a viaf or wikidata id but not a ORCID).

~~~
CREATE TABLE people (cl_people_id VARCHAR(255) PRIMARY KEY, object JSON);
CREATE TABLE local_group (cl_group_id VARCHAR(255) PRIMARY KEY, object JSON);
CREATE TABLE funder (cl_funder_id VARCHAR(255) PRIMARY KEY, object JSON);
~~~

Another advantage of this approach (rather than separate columns per pid) is it allows us to handle the edge case where someone managed to acquire more than one "unique identifier".





