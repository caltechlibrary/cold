cold - (c)ontrolled (o)bject (l)ists and (d)atum
================================================

This repository implements the public read only web service and admin web service for controlled object lists and datum (e.g. vocabularies). It is built using TypeScript and Deno.  It depends on the JSON API provided by [datasetd](https://github.com/caltechlibrary/dataset).

You front end web server (e.g. Apache 2 + Shibboleth) needs to be configure to reverse proxy the cold **public** interface as well as the **admin** interface with control access enfoced. Ideally your front end web server software (e.g. Apache2, NginX , Lighttpd) is configured with a a single sign-on implementation like Shibboleth.

The public facing services are defined in the root of the cold repository, the admin services are contained in the admin directory.  Each have their own htdocs directory for static content (e.g. CSS and browser side JavaScript). Each have TypeScript services that are run via Deno or as compiled applications.



Overview
--------

Caltech Library maintains a list of people, groups and funders and their related identifiers. For many years these were managed using a spreadsheet. That has become combersome over time.  **cold** manages that data as JSON objects in [dataset](https://github.com/caltechlibrary/dataset) collections. TypeScript provides a middleware for interacting with datasetd while a front end web server provides access control (e.g. via Shibboleth).

Since we are no longer limited to rows and columns the data models can evolve as needed.

Approach Details
----------------

- **cold** public and admin services are built datasetd. This provides both static file services, access to dataset collections as well as the ability to query the collections.  One service is run for the public facing content, another for the curatorial work.
- **cold** public and admin use [handlerbars](https://handlerbarsjs.com) templates, each with their own "view" template heirarchies.

__An important point for both the public and admin services is access control is deferred to the front end web server (e.g. Apache2+Shibboleth).__

Requirements
------------

- Deno >= 1.45.5
- Dataset >= 2.2.18 (using SQL JSON storage)
- To build the UI and compile the assets needed by **cold**
  - GNU Make
  - [Pandoc](https://pandoc.org) >= 3.1 (to build documentation and man page)
  - A text editor (e.g. Zed, VSCode, micro, nano, vi, emacs ...)
- A front end web server with SSO or Basic Auth (e.g. during development) support
- A web browser with JavaScript support enabled

For development purposes the required software is enough, when deployed to the public internet you **MUST** use a front end web server to enforce access controls.

See [user manual](user_manual.md) for more details.


