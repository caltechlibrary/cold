cold - (c)ontrolled (o)bject (l)ists with (D)ataset
===================================================


Overview
--------

Caltech Library maintains a list of people, groups and funders and their related identifiers. For many years these were managed using a spreadsheets. That has become cumbersome.  **COLD** manages data as JSON objects in [dataset](https://github.com/caltechlibrary/dataset) collections. TypeScript provides a middleware for the user interface with datasetd providing object management. The front end web server provides access control (e.g. via Shibboleth).

COLD is no longer limited to rows and columns so data models can evolve as needed.

Implementation
--------------

This repository implements COLD, a web application for curating object lists. It is built using TypeScript and Deno.  It requires the JSON API provided by [datasetd](https://github.com/caltechlibrary/dataset).

Your front end web server (e.g. Apache 2 + Shibboleth) must to be configure to reverse proxy the cold services. **The front end web server is responsible for access control.** Ideally your front end web server software (e.g. Apache2, NginX , Lighttpd) is configured with a a single sign-on implementation like Shibboleth. For development services you can just use basic auth for access control testing.

In development TypeScript based services can be run via Deno tasks. In a [deployed setting](deployment.md) you should compile `cold_admin` and run it along with `datasetd` under systemd or other daemon manage system (e.g. macOS launchd). 

Details
-------

- **cold_admin** is built as TypeScript middleware interacting with Dataset collections via `datasetd`. `datasetd` provides both static file services, access to dataset collections as well as the ability to query the collections. Dynamic pages use [handlerbars](https://handlerbarsjs.com) templates, each with their own "view" template hierarchies.

- **datasetd** is part of the [Dataset](https://github.com/caltechlibrary/dataset) project. It provides the JSON API needed to curate the objects in a dataset collection.

- **directory_sync** is build as TypeScript command line program suitable to be run from a cronjob. It is responsible for updating Caltech People data from the Caltech directory.

Public content access is through files exported to our [Feeds](https://feeds.library.caltech.edu) system. Deno is used to managed tasks that export content to it.

__An important point COLD's access control is deferred to the front end web server (e.g. Apache2+Shibboleth).__

Requirements
------------

- Deno >= 2.0.6
- Dataset >= 2.1.23 (using SQL JSON storage)
- The following are required to build the UI and compile the assets needed by **COLD**
  - GNU Make
  - [Pandoc](https://pandoc.org) >= 3.1 (to build documentation and man page)
  - A text editor (e.g. Zed, VSCode, micro, nano, vi, emacs ...)
- A front end web server with SSO or Basic Auth (e.g. during development) support
- A web browser with JavaScript support enabled

For development purposes the required software is enough, when deployed to the public internet you **MUST** use a front end web server to enforce access controls.

See [user manual](user_manual.md) for more details.
