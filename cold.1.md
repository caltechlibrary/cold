% cold(1) cold user manual | Version 0.0.5
% R. S. Doiel and Tom Morrell
% 2023-07-24

# NAME

cold

# SYNOPSIS

cold [OPTIONS] [SETTINGS_FILENAME]

# DESCRIPTION

Run the controlled object list and datum.

This implements a service to maintain a controlled list of objects such as Caltech Library uses for crosswalking data using pid associated with a person, group or funding source. It is also used to maintain system independant vocabularies.

# Requirements

- Newt >= 0.0.5
- Postgres 15
- PostgREST 11
- Pandoc > 3

# Overview

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

Data like this can easily be manage in Postgres and then made available as a JSON data source via PostgREST. The prototype Newt let's us easily integrate PostgREST results with Pandoc server. As a result **cold** is now a Newt based web application.  It supports not just Caltech related People, Groups and Funders but also additional vocabularies which we need to cordinate between systems (e.g. RDM instances or publication systems like feeds.library.caltech.edu).

# Build on N3P

This iteration **cold** is implemented with Newt+Postgres+PostgREST+Pandoc (aka N3P). The `cold.yaml` file defines both the data models managed by cold as well as the URL routes and data flows needed to make available the people, groups, funder and vocabulary information in the desired formats (e.g. JSON, YAML, and CSV).

Each type of list is has its own model. Each model has a related set of PostgREST end points for managing the model lists and generating the formats needed for integration with other services.

In addition to the model definitions and route definitions found in `cold.yaml` there are several SQL files that define the behaviors and models managed by Postgres. These include `cold_setup.sql` which provides the initial setup and configuration for Postgres and PostgREST to talk to each other. `cold_models.sql` has the database schema, views, functions and PostgREST permissions needed to provide our data engine using Postgres+PostgREST as a microservice.  Finally additional templates found in the templates directory host the HTML rendering of data views and management related web forms.

To run the **cold** service in development you need to be running Postgres with all the models code, PostgREST configured to support those models, Pandoc running in server model and Newt.  Newt provides the primary web UI by combined the data flow between Newt, PostgREST and Pandoc. For development this is all you need to run.

In a production setting you will need a front end web server. Newt does not provide access control, that needs to be provided by a front end web server like Apache 2 or NginX. In an academic production setting this is done by integrating the front-end web server with a single sign-on system like Shibboleth.  You configure your front-end web server as a reverse proxy to Newt which only runs on localhost.

Newt can host static content related to a Newt based web application. These are found in the directory pointed in `cold.yaml` by the `htdocs` attribute. The htdocs directory holds your static HTML, CSS, JavaScript and any image assets you use in your web UI.


## End Points

Plain text help is built in by adding a ```/help``` to the URL path. The defined end points are formed as the following. The following end point descriptions support the GET method.

```/```
: Plain text description of the service (provided by htdocs/index.html)

```/api/version```
: Returns the version number of the service based on the value set in the codemeta.json when the make command has been run to (re) version.sql

```/people```
: Returns a list of "cl_people_id" managed by *cold* as an HTML content. 

```/people/{CL_PEOPLE_ID}```
: For a GET returns a people object, a POST will create the people object, PUT will replace the people object, PATCH will replace part of an object and DELETE will remove the people object

```/group```
: Returns a list of "cl_group_id" managed by *cold*

```/group/{CL_GROUP_ID}```
: For a GET returns a group object, a POST will create the group object, PUT will replace the group object, PATCH will replace part of an object and DELETE will remove the group object

```/funder```
: Returns a list of "cl_funder" managed by *cold*

```/funder/{CL_funder_ID}```
: For a GET returns a funder object, a PUT will create the funder object, POST will replace the funder object and DELETE will remove the funder object


```/api/crosswalk```
: Returns help on how to crosswalk from one identifier to the internal identifier

```/api/crosswalk/people```
: Returns a list of identifiers available for "people" objects

```/api/crosswalk/people/{IDENTIFIER_NAME}/{IDENTIFIER}```
: Returns a list of "cl_people_id" assocated with that identifier

```/api/crosswalk/group```
: Returns a list of identifiers available for "group" objects

```/api/crosswalk/group/{IDENTIFIER_NAME}/{IDENTIFIER}```
: Returns a list of "cl_group__id" assocated with that identifier

```/api/crosswalk/funder```
: Returns a list of identifiers available for "funder" objects

```/api/crosswalk/funder/{IDENTIFIER_NAME}/{IDENTIFIER}```
: Returns a list of "cl_funder_id" assocated with that identifier


*cold* takes a REST approach to updates for managed objects.  POST will create a new object, PATH will update a part of it and PUT will update the whole object. GET will retrieve it and DELETE Will replace it.

## Vocabularies

*cold* also supports end points for stable vocabularies mapping an indentifier to a normalized name. These are set at compile time because they are so slow changing. 

```/subject```
: Returns a list of all the subject ids (codes)

```/subject/{SUBJECT_ID}```
: Returns the normalized text string for that subject id

```/issn```
: Returns a list of issn that are mapped to a publisher name

```/issn/{ISSN}```
: Returns the normalized publisher name for that ISSN


```/doi-prefix```
: Returns a list of DOI prefixes that map to a normalize name

```/doi-prefix/{DOI_PREFIX}```
: Returns the normalized publisher name for that DOI prefix

## Widgets

Widgets provide the user interface for humans to manage and view the objects. While **cold** can directly host these it is equally possible to integrate the static components into another system, web service or web site. They are only static web assets.  The public facing web service needs to control access to **cold** and the static content does not contain anything that is priviliged. The Widgets can be loaded indepentently in the page using the following end points.

```/widgets/display-person.js```
: This widget provides a consistent display for our Person Object. Markup example ```<display-person honorific="Mr." given="R. S." family="Doiel" lineage="" orcid="0000-0003-0900-6903"></display-person>```

```/widgets/input-person.js```
: This widget provides a consistent input interface for our Person Object. Markup example ```<input-person honorific="Mr." given="R. S." family="Doiel" lineage="" orcid="0000-0003-0900-6903"></input-person>```

```/widgets/display-group.js```
: This widget provides a consistent display for our Group Object. Markup example ```<display-group name="GALCIT" ror=""></display-person>```

```/widgets/input-group.js```
: This widget provides a consistent input interface for our Group Object. Markup example ```<input-group  name="GALCIT" ror="" label=""></input-person>```

```/widgets/display-subject.js```
: This widget provides a consistent display of a Subject Object, example ```<display-subject name="biology" label="Biology"></display-subject>```

```/widgets/input-subject.js```
: This widget provides a consistent input interface for our Subject Object, example ```<input-subject name="biology"></input-subject>```

```/widget/display-issn-publisher.js```
: This widget provides a consistent display of ISSN and publisher, example ```<display-issn-publisher issn="XXXXXXXXXX"></display-issn-publisher>```

```/widget/input-issn-publisher.js```
: This widget provides a consistent input interface for our ISSN/Publisher Object, example ```<input-issn-publisher issn="XXXXXXXXXX" publisher="Publisher Name"></input-issn-publisher>```

```/widget/display-doi-prefix.js```
: This widget lists a DOI-prefix and publisher, example ```<display-doi-prefix doi="XXXXXX/XXXXXX.X"></display-doi-prefix>```

```/widget/input-doi-prefix.js```
: This widget provides a consistent input interface for our DOI Prefix/Publisher Object, example ```<input-doi-prefix doi="XXXXXX/XXXXX.X" publisher="Publisher Name Here"></input-doi-prefix>```

# EXAMPLE

_cold_ can be configure from the environment or from a JSON
settings file. Assuming you are using a JSON settings file (e.g.
"settings.json") the web service can be started by passing it
on the command line.

~~~
    cold settings.json
~~~

If you are configuring via the environment (e.g. in a container
environment) just envoke the command without options.

~~~
    cold
~~~

Here is an example settings.json file.

~~~
	{
		"dsn": "DB_USER_HERE:DB_PASSWORD_HERE@/cold",
		"hostname": "localhost:8486",
		"htdocs": "/usr/local/src/cold/htdocs",
		"prefix_path": "",
		"disable_root_redirects": false
	}
~~~

To run in a container you can pass the values in settings.json as
environment variables. The environment variables are upper case.

Here is an example of setting environment variables.

~~~
    export DSN="DB_USER_HERE:DB_PASSWORD_HERE@/cold"
	export HOST="localhost:8486"
	export HTDOCS="./htdocs"
	export PREFIX_PATH=""
	export DISABLE_ROOT_REDIRECTS=0
~~~


