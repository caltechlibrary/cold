cold - (c)ontrolled (o)bject (l)ists and (d)atum
================================================


Overview
--------

Caltech Library maintains a list of people, groups and funders and their related identifiers. For many years these were managed using a spreadsheets. That has become combersome over time.  **COLD** manages that data as JSON objects in [dataset](https://github.com/caltechlibrary/dataset) collections. TypeScript provides a middleware for interacting with datasetd while a front end web server provides access control (e.g. via Shibboleth).

Since we are no longer limited to rows and columns the data models can evolve as beyond row and columns if needed.

Implementation
--------------

This repository implements COLD, a web application for curating object lists and other datum. It is built using TypeScript and Deno.  It depends on the JSON API provided by [datasetd](https://github.com/caltechlibrary/dataset).

Your front end web server (e.g. Apache 2 + Shibboleth) needs to be configure to reverse proxy the cold services. The front end web server is responsible for access control. Ideally your front end web server software (e.g. Apache2, NginX , Lighttpd) is configured with a a single sign-on implementation like Shibboleth. For development services you can just use basic auth.

The TypeScript based services can be run via Deno tasks or setup to run from systemd.

Details
-------

- **cold** is built on TypeScript middleware interacting with Dataset collections via `datasetd`. `datasetd` provides both static file services, access to dataset collections as well as the ability to query the collections. Dynamic pages use [handlerbars](https://handlerbarsjs.com) templates, each with their own "view" template heirarchies.

Public content access is through files exported to our [Feeds](https://feeds.library.caltech.edu) system. Deno is used to managed tasks that export content to it.

__An important point COLD's access control is deferred to the front end web server (e.g. Apache2+Shibboleth).__

Requirements
------------

- Deno >= 1.46.3
- Dataset >= 2.1.22 (using SQL JSON storage)
- The following are required to build the UI and compile the assets needed by **COLD**
  - GNU Make
  - [Pandoc](https://pandoc.org) >= 3.1 (to build documentation and man page)
  - A text editor (e.g. Zed, VSCode, micro, nano, vi, emacs ...)
- A front end web server with SSO or Basic Auth (e.g. during development) support
- A web browser with JavaScript support enabled

For development purposes the required software is enough, when deployed to the public internet you **MUST** use a front end web server to enforce access controls.

See [user manual](user_manual.md) for more details.


