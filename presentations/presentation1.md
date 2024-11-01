---
title: COLD - curating objects with SQLite3, Deno and Dataset
author: "R. S. Doiel, <rsdoiel@caltech.edu>"
institute: |
  Caltech Library,
  Digital Library Development
description: SoCal Code4Lib Meet up
urlcolor: blue
linkstyle: bold
aspectratio: 169
createDate: 2024-10-31
updateDate: 2024-10-31
draft: true
pubDate: 2024-11-15
place: Caltech
date: November 15, 2024
section-titles: false
toc: true
keywords: [ "code4lib", "microservice", "SQLite3", "Deno", "TypeScript", "Dataset" ]
url: "https://caltechlibrary.github.io/cold/presentation"
---

# COLD - curating objects with SQLite3, Deno and Dataset

COLD is an application for curating collections of objects at Caltech Library

Object facilitate cross walking data between systems

# We out grew our spreadsheets

- We used to manage lists of Caltech People and Groups in CSV files
- CSV files are easy to process with scripts
- Our people list had grown to over 32 columns and 8900 rows
- It was time for an app to manage that many rows

# A quick tour of COLD

Our COLD pilot deployment, https://apps.library.caltech.edu/cold/

# An "Off the shelf" stack

- [Deno](https://deno.org) compiles TypeScript to middleware executables
- [Dataset](https://caltechlibrary.github.io/dataset) provides a JSON API to manage objects
- [SQLite3](https://sqlite.org) is our storage engine

# COLD is built from three services

1. cold (typescript, web UI)
2. cold_api (datasetd, back end JSON API)
3. cold_reports (typescript, back end report runner)

# Our app layout

- Dataset manages collections of objects via JSON API
- Middle ware, written in TypeScript, provides web UI and report runner
- A Front end web server integrates with Campus single sign on and controls access

# Tooling to build

- Text editor
- Deno as REPL, compiler and task runner
- Dataset to manage JSON documents
- SQLite3 REPL to inspectored stored objects
- Web browser for reference documentation and testing app

# What is Deno?

- Deno is a runtime for TypeScript and JavaScript
- Deno runs secure by default
- Deno supports ES6 modules
- TypeScript runs natively in Deno

# Why Deno?

- Deno provides
  - REPL
  - A rich standard library
  - task manager
  - linter 
  - formatter
  - compiler
  - package management
- ES6 Modules can be hosted anywhere

# Why compile TypeScript applications?

- Deno doesn't need to be installed on app server
- Executables are trivial to install
- Executables avoid library version problems
- Simplifies (systemd) service configuration
- Improves performance over interpreted TypeScript

# What is Dataset?

- Dataset is a JSON object manager
- Implemented at Caltech Library, available via GitHub
  - <https://github.com/caltechlibrary/dataset>
- Runs on Linux, macOS and Windows 
- Supports ARM64 and x86_64 architectures
- Open Source under a BSD like license

# Why Dataset?

- Dataset supports managing JSON documents as collections
- Supports multiple storage engines (SQLite3, MySQL and Postgres)
- Provides a localhost JSON API managing collections

# Developing with Deno and Dataset

- Deno supports an interactive development approach
- Deno tasks can "watch" and restart
- Deno tasks can "build" your executables
- Dataset provides a turn key micro service for managing JSON objects

# Developing workflow

- tmux to split the terminal window four ways
- in three windows launch deno tasks to start the service
- in fourth window interact and edit code
- Use SQLite3 to get a low level SQL view of your storaged objects

# Producing an release workflow

- Compile cold_admin and cold_reports
- Copy binaries to remote system
- Make sure dataset is available, if not install appropriate versison
- Configure and launch cold, cold_api and cold_reports via systemd

# Configuration files

- YAML, configuration datasetd
- YAML, configuration cold_reports
- TOML, systemd service files

# Take away

- Deno with TypeScript has many of the advantages Go based projects
- Developing with Deno provides the fluidity of interpreted languages
- TypeScript to JavaScript story faciliates code reuse on server and in browser
- Deno avoids many of the problems of developing with NodeJS
- SQLite3 may remove the need to run a database management system
- Having a common microservice API 

# Plans for the future

- Support managing RDM vocabularies
- Support reporting beyond COLD collections
- Integrate with GitHub actions

# Reference URLs

- COLD, <https://github.com/caltechlibrary/cold>
- Deno, <https://deno.com> and <https://github.com/denoland/deno>
- Deno's standard modules, <https://jsr.io/@std>
- JavaScript, <https://developer.mozilla.org/en-US/docs/Web/JavaScript>
- TypeScript, <https://www.typescriptlang.org/>
- Dataset, <https://caltechlibrary.github.io/dataset> and <https://github.com/caltechlibrary/dataset>
