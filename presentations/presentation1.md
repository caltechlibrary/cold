---
title: COLD - curating objects with Deno, Dataset and SQLite3
author: "R. S. Doiel, <rsdoiel@caltech.edu>"
institute: |
  Caltech Library,
  Digital Library Development
description: SoCal Code4Lib Meet up
urlcolor: blue
linkstyle: bold
aspectratio: 169
createDate: 2024-10-31
updateDate: 2024-11-13
draft: true
pubDate: 2024-11-15
place: Caltech
date: November 15, 2024
section-titles: false
toc: true
keywords: [ "code4lib", "microservice", "SQLite3", "Deno", "TypeScript", "Dataset" ]
url: "https://caltechlibrary.github.io/cold/presentation"
---

# COLD - curating objects with Deno, Dataset and SQLite3

COLD is an application for curating collections of metadata objects at Caltech Library

These are used for...

- crosswalking data
- aggregated reporting
- generated RDM vocabularies

# COLD - curating objects with Deno, Dataset and SQLite3

COLD
: Controlled Object Lists and Datum

# Before COLD we used spreadsheets

- Advantages
  - Staff understand spreadsheets
  - CSV files are easy to process and version control
- Disadvantages
  - Our people list had grown to over 32 columns and 8900 rows
  - It required developers to manage and maintain the spreadsheet

# Project Requirements

- Provide a **simple way** to curate metadata object collections
- Provide a data source for <https://feeds.library.caltech.edu>
- Provide a means of generating RDM vocabularies
- Integrate with campus Single Sign On for access control

# Deliverables

- A web UI for curating objects
- A reports system
- Integration points for RDM and Feeds

# Project status

- Production pilot
- Active development (WIP)

# A quick tour of COLD

Our COLD pilot deployment, <https://apps.library.caltech.edu/cold/>

# Development history

Multiple prototypes with differing implementations

- Python and PostgreSQL via Flask/ORM (way too complicated)
- Go plus SQLite3 and browser side JavaScript (better but required JS browser side)
- Go, PostgreSQL+PostgREST and browser side JavaScript (seemed excessive for a "small" app)

# Current Pilot

- Pilot based on Dataset, SQLite3 and (compiled) TypeScript
  - JSON API microservice, defined by 88 lines of YAML
- COLD UI and reports system
  - approx. 4400 lines of TypeScript
  - approx. 1000 lines of HTML/Handlebars markup

# COLD is built as three services

1. cold_api (datasetd, back end JSON API, only required configuration)
2. cold (web UI)
3. cold_reports (TypeScript report runner service)

# "Off the shelf" did the heavy lifting

- [Deno](https://deno.org) compiled TypeScript to executables
- [Dataset](https://caltechlibrary.github.io/dataset) JSON API for managing objects
- [SQLite3](https://sqlite.org) used as Dataset's storage engine
- Shibboleth for campus single sign on

# What is Deno?

- Deno is
  - a runtime for TypeScript and JavaScript
  - a toolbox for developing TypeScript applications
  - a compiler

# Why Deno and not NodeJS?

- ES6 modules (same as web browser)
- Native support for TypeScript
- Deno's rich standard library
- Deno provides a cross compiler for macOS, Linux and Windows

# Why TypeScript?

- TypeScript is a superset of JavaScript
  - Less to learn, essentially an "up skill" of your JavaScript knowledge
- Typed languages have advantages when working with structured data
- Typed languages tend to do better when compiled

# Why **compiled**?

- Executables are trivial to install 
- Static executables avoid library version problems
- Improves performance over interpreted code
- Simplifies (systemd) service configuration

# What is Dataset?

- Dataset is a JSON object manager
- Implemented at Caltech Library, available on GitHub
  - <https://github.com/caltechlibrary/dataset>
- Runs on Linux, macOS and Windows
- Open Source under a BSD like license

# Why Dataset?

- Dataset provides a turn key JSON API for managing JSON object collections
- Dataset supports multiple storage engines (SQLite3, MySQL and PostgreSQL)
- It is mature for our purposes
- It was trivial to write a TypeScript package for working with Dataset's JSON API

# Developing with Deno and Dataset

- Deno supports an interactive development approach
- Dataset provides a turn key service for managing collections of JSON objects

# Take away

- Deno with TypeScript shares many advantages of my Go based projects
- Developing with Deno provides the fluidity of interpreted languages
- TypeScript to JavaScript story facilitates code reuse on server and in browser
- Deno avoids most of the problems I've had with NodeJS projects
- SQLite3 removes the need to run a database management system
- A common microservice JSON API is nice for knowledge reuse

# Plans for the future

- Add additional object collections (e.g. Funders)
- Evole into a production system

# Reference URLs

- COLD, <https://github.com/caltechlibrary/cold>
- Deno, <https://deno.com> and <https://github.com/denoland/deno>
- Deno's standard modules, <https://jsr.io/@std>
- [Why did Ryan Dahl, creator of NodeJS, create Deno?](https://stackoverflow.blog/2024/03/19/why-the-creator-of-node-js-r-created-a-new-javascript-runtime/)
- JavaScript, <https://developer.mozilla.org/en-US/docs/Web/JavaScript>
- TypeScript, <https://www.TypeScriptlang.org/>
- Dataset, <https://caltechlibrary.github.io/dataset> and <https://github.com/caltechlibrary/dataset>
