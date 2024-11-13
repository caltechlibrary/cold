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
updateDate: 2024-11-04
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

# Requirements

- Provide a **simple way** to curate metadata object collections
- Provide a data source for <https://feeds.library.caltech.edu>
- Provide a means of generating RDM vocabularies
- Integrate with campus Single Sign On for access control

# Deliverables

- A web UI for curating objects
- A reports system
- Integration points for RDM and Feeds

# Project status

- production pilot
- active development (WIP)

# A quick tour of COLD

Our COLD pilot deployment, <https://apps.library.caltech.edu/cold/>

# Development history

- Multiple prototypes with differing implementation choices
  - Python and PostgreSQL via Flask/ORM (abandoned)
  - Go plus SQLite3 and browser side JavaScript
  - Go, PostgreSQL+PostgREST and browser side JavaScript (abandoned)
  - Dataset, SQLite3 and TypeScript middleware (three microservices)
- Currently running a pilot version based on Dataset, SQLite3 and TypeScript and middleware

# Role of prototyping

- I used the prototypes as a sounding board for requirements and features
- I incrementally worked towards a "production pilot" (current stage)

# My "Off the shelf" stack

- [Deno](https://deno.org) compiles TypeScript to middleware executables
- [Dataset](https://caltechlibrary.github.io/dataset) JSON API for managing objects
- [SQLite3](https://sqlite.org) used as Dataset's storage engine
- Shibboleth for campus single sign on

# COLD is built as three services

1. cold_api (datasetd, back end JSON API)
2. cold (TypeScript middleware, web UI)
3. cold_reports (TypeScript report runner service)

# Roles for the services

- Dataset provides a turnkey JSON API for managing objects
- COLD middleware provides web UI
- COLD reports provides the report runner
- Our front end web server integrates with Campus single sign on and controls access

<!--
# Tools for development

- Text editor
- Deno  (REPL, compiler and task runner)
- Dataset to manage JSON documents
- SQLite3 REPL to inspect stored objects
- Web browser for reference documentation and testing app
-->

# What is Deno?

- Deno is
  - a runtime for TypeScript and JavaScript
  - a toolbox for developing TypeScript applications
  - a compiler

# Why Deno? (Why not NodeJS?)

- Deno supports ES6 modules (same as web browser)
- Deno has native support for TypeScript
- Deno provides a rich standard library
- Deno can cross compile TypeScript and JavaScript for macOS, Linux and Windows


# Why TypeScript?

- TypeScript is a superset of JavaScript
  - Less to learn, essentially an "up skill" of your JavaScript knowledge
- Typed languages have advantages when developing more complex applications
- Typed languages tend to do better when compiled

# Why compiled TypeScript?

- Deno doesn't need to be installed on app server
- Executables are trivial to install
- Executables avoid library version problems
- Simplifies (systemd) service configuration
- Improves performance over interpreted code

# Deno's toolbox highlights

- task manager
- linter and formatter
- package management
- compiler

# What is Dataset?

- Dataset is a JSON object manager
- Implemented at Caltech Library, available via GitHub
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
- Deno tasks can "watch" and restart
- Deno tasks can "build" your executables
- Dataset provides a turn key micro service for managing JSON objects

# Development environment & workflow

- tmux to split the terminal window four ways
- in three windows launch deno tasks to start the services
- I use the fourth window edit code and inspect data

# Release workflow

- Compile cold, cold_api and cold_reports
- Copy binaries to remote system
- Make sure dataset is installed and correct version
- Configure and launch cold, cold_api and cold_reports via systemd

# Configuration files

- YAML, configuration datasetd (cold_api.yaml)
- YAML, configuration cold_reports (cold_reports.yaml)
- TOML, systemd service files (cold.service, cold_api.service, cold_reports.service)

# Take away

- Deno with TypeScript shares many advantages of my Go based projects
- Developing with Deno provides the fluidity of interpreted languages
- TypeScript to JavaScript story facilitates code reuse on server and in browser
- Deno avoids most of the problems I've had with NodeJS projects
- SQLite3 removes the need to run a database management system
- A common microservice JSON API is nice for knowledge reuse

# Plans for the future

- Managing RDM vocabularies
- Managing various normalization maps
- Improve reports, improve report runner

# Reference URLs

- COLD, <https://github.com/caltechlibrary/cold>
- Deno, <https://deno.com> and <https://github.com/denoland/deno>
- Deno's standard modules, <https://jsr.io/@std>
- [Why did Ryan Dahl, creator of NodeJS, create Deno?](https://stackoverflow.blog/2024/03/19/why-the-creator-of-node-js-r-created-a-new-javascript-runtime/)
- JavaScript, <https://developer.mozilla.org/en-US/docs/Web/JavaScript>
- TypeScript, <https://www.TypeScriptlang.org/>
- Dataset, <https://caltechlibrary.github.io/dataset> and <https://github.com/caltechlibrary/dataset>
