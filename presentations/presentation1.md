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
updateDate: 2024-11-15
draft: true
pubDate: 2024-11-15
place: Caltech
date: November 15, 2024
section-titles: false
toc: true
keywords: [ "code4lib", "microservice", "SQLite3", "Deno", "TypeScript", "Dataset" ]
url: "https://caltechlibrary.github.io/cold/presentation"
---

# How do manage metadata about People, Groups and controlled vocabularies?

- Do we build or do we use something off the shelf?

# Spreadsheets!

- Advantages
  - Library staff understand spreadsheets
  - Spreadsheets are easy to process and version control
  - widely support (e.g. LibreOffice, Googlesheets, Excel)
  - zero code to write
- Disadvantages
  - individual trees in a forest of data

# A spreadsheet sprouted a problem

- Our people list grew to 32 columns and over 8900 rows
- Hard to keep all those columns consistent and aligned
- Easy for duplicates to sneak in
- Developers wound up managing the spreadsheets

# What does a solution look like?

1. A **simple way** to curate collections of metadata objects
2. A data source for <https://feeds.library.caltech.edu>
3. A means of generating RDM vocabularies

# Our answer, COLD

COLD
: Controlled Object Lists with [Dataset](https://caltechlibrary.github.io/dataset)

# What does COLD do?

COLD is an application for curating collections of metadata objects

Used for...

- crosswalking data
- aggregated reporting
- generating RDM vocabularies

# Deliverables

- A web UI for curating objects
- A reports system
- Integration with RDM and Feeds

# Project status

- Active development (WIP)
- Production pilot

# A quick tour of COLD

> Demo of Pilot deployment

# Development history

Four prototypes

1. Python and PostgreSQL via Flask/ORM (way too much code to maintain)
2. Go plus SQLite3 and browser side JavaScript (better but required JS browser side)
3. Go, PostgreSQL+PostgREST (cumbersome, too heavy weight)
4. Deno & Dataset using SQLite3 storage (final version)

# Current Pilot

Built in three parts

1. cold (TypeScript & Handlebars templates: web UI)
2. cold_reports (TypeScript: report runner service)
3. cold_api (YAML configuration: back end JSON API)

# Current Pilot (the gory details)

- Dataset provides a JSON API microservice, [88 lines of YAML](https://github.com/caltechlibrary/cold/blob/main/cold_api.yaml)
- UI and reports system
  - approx. 4400 lines TypeScript
  - approx. 1000 lines Handlebars templates

# What I used "off the shelf"

- [Deno](https://deno.org) compiled TypeScript to executables
- [Dataset](https://caltechlibrary.github.io/dataset) JSON API for managing objects
  - Using [SQLite3](https://sqlite.org) storage engine
- Apache+Shibboleth for access control via campus single sign on

# What is Deno?

- Deno is
  - a runtime for TypeScript & JavaScript
  - a toolbox for developing with TypeScript & JavaScript
  - **a compiler**

# Why Deno and not NodeJS?

- ESM modules instead of Common JS
- Native support for TypeScript
- Deno is secure by default
- Deno provides rich standard library
- Deno provides a cross compiler for macOS, Linux and Windows

# Why TypeScript? Why not Go or Python?

- I wanted to develop with a single language
- I wanted a language that would be accessible to my colleagues

# Why TypeScript? Why not JavaScript?

- Typed languages have advantages for working with structured data
- TypeScript is a superset of JavaScript
  - Less to learn, it's an extended JavaScript

# Why **compiled**?

- Self-contained executables avoid library version problems
- Self-contained executables are trivial to install 
- Simpler service configuration (systemd, init or launchd)
- Improved performance

# What is Dataset?

- Dataset is a JSON object manager
- Open Source under a BSD like license
- Runs on Linux, macOS and Windows
- <https://github.com/caltechlibrary/dataset>

# Why Dataset?

- Dataset provides a turn key JSON API for managing **collections of JSON objects**
- Dataset supports multiple storage engines (**SQLite3**, PostgreSQL and MySQL)
- Mature for our purposes (already used to build Feeds)
- Very little code to write (I fixed a couple bugs)

# Developing with Deno and Dataset

- Deno supports an interactive development
  - easy test pieces of code (like with Python), nice for iterative development
- Dataset provides a turn key service for managing collections of JSON objects
  - Writing the "back end" boiled down to configuration 

# Take away

- Deno with TypeScript shares many advantages of Go based projects
- Developing with Deno provides the fluidity of interpreted languages
- Deno avoids the challenges of NodeJS projects
- SQLite3 removes the need to run a database management system

# Plans for the future

- Add additional object collections (e.g. Funders)
- Evolve from production pilot to production system

# Reference URLs

- COLD, <https://github.com/caltechlibrary/cold>
- Deno, <https://deno.com> and <https://github.com/denoland/deno>
- Deno's standard modules, <https://jsr.io/@std>
- [Why did Ryan Dahl, creator of NodeJS, create Deno?](https://stackoverflow.blog/2024/03/19/why-the-creator-of-node-js-r-created-a-new-javascript-runtime/)
- JavaScript, <https://developer.mozilla.org/en-US/docs/Web/JavaScript>
- TypeScript, <https://www.TypeScriptlang.org/>
- Dataset, <https://caltechlibrary.github.io/dataset> and <https://github.com/caltechlibrary/dataset>
