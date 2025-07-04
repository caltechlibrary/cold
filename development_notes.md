---
page_title: Development Notes
---

Development Notes
=================

NOTE: this document describes my thinking during the development process. It is not necessarily a description of how things actually wound up being implemented.

Application layout and structure
--------------------------------

The primary task of the COLD UI is to provide a means of curating our list of objects and vocabularies. Each list is held in a dataset collection. Datasetd is used to provide a JSON API to curate the collections. TypeScript compiled via Deno is providing the middleware to tie our JSON API with our static content. The front end web server (i.e. Apache 2) provides single sign on and access control (e.g. via Shibboleth).

I am relying on feeds.library.caltech.edu to provide the public facing API.  Data is transferred to feeds via scripts run on a schedule or "on demand" in the reports module.

The Go dataset collections
--------------------------

The `datasetd` program provides localhost static file and JSON API access for managing multiple dataset collection. These use the `https://caltechlibrary.github.io/ts_dataset/mod.ts` module for working with the datasetd JSON API.  The middleware provides pass through proxy services to the localhost instance of the datasetd API for selected queries (e.g. people, groups and ror lookups).

The public API isn't part of COLD. The reports system can replicate COLD public data to feeds if that is appropriate.

Data enhancement
----------------

The content curated in cold can be enhanced from external sources. This is done via scheduled tasks. Initially these tasks are going to be run from cron. An example is importing biographical information published in the Caltech Directory. For a subset of CaltechPEOPLE we know their IMSS userid. Using that we can contact the public directory website and return the biographical details such as their faculty role and title, division, and educational background. We only harvest those records that have both a directory user id and are marked for inclusion in feeds.

External data sources:

- Caltech Directory
- orcid.org
- ror.org

Reports
-------

Reports are often needed for managing library data and systems. COLD's focus is on managing lists and data but can also serve as a reports request hub.

Many of the reports require aggregation across data sources and often these will take too long or require too many resources to be run directly on our application server. That
suggests what should run on the applications server is a simple reports request management interface. The suggestions the following requirements.

- A way to make a request for a report
- A means of indicating a report status (e.g. requested or scheduled, processing, available or problem indicator)
- A means of notifying the requester(s) when report is available
- A means of purging old reports for the reports status list

These features can be implemented as a simple queue. The metadata needed to manage
a report requests and their life cycle are as follows.

- name of report
- any additional options needed by the report program
- an email address(es) to contact when the report is ready
- current status of the report (e.g. requested, processing, available, problem)
- a link to where the report can be "picked up"
- the report's content type, (e.g. application/json, application/yaml, application/x-sqlite3, text/csv, text/plain, text/x-markdown)
- the date the report was requested
- the updated (when the status last changed)

The user interface would consist of a simple web form to request a predefined set up reports and a list of reports available, processing, requested or scheduled.

The reports themselves can be implemented as command line programs in a language of your choice. The report runner will be responsible for checking the queue and updating the queue. The report would be responsible for notification (e.g. is there is an email list then send out an email with the report link). In principle since our GitHub actions are accessible via the GitHub APIs a report could be implemented as a GitHub action.

The advantage of this approach is that it avoids the problems of slow running or resource intensive reports running directly on the application server. COLD just manages the report queue.

Advantage of narrowing the COLD's report to managing a report queue is that it separates the concerns (e.g. resource management, security, report access).

For the report management interface to be useful you do need a report runner. The report runner would be responsible for checking the report queue, updating status of the report queue and making the report request.

NOTE: the runner doesn't need to run on your apps server. It just needs access to the queue.

A report would need to implement a few things.

- accept the metadata held in the report queue
- storing the report result
- return a result needed by the runner to update the report queue (success, failure and the link to the result)

QUESTION: Should the report be responsible for notification or the runner?

The individual reports can be implemented as a script (e.g. Bash), a program (e.g. something in Python) or even externally (e.g. GitHub action).  The interface for the report system takes advantage of standard input and standard output. This simplifies writing the report programs. An example would be to process a JSON expression from standard input and return a JSON expression via standard output to the runner along with an error code (i.e. zero no problem, non-zero there was a problem). The report script or program
would use a link to indicate where the report could be picked up and be responsible to placing content in a storage location accessible via the link.

Report status:

requested
: An entry that a request has been made and is waiting to be serviced

processing
: The report request is being serviced but is not yet available

available
: A report result is available and the link indicates where you can pick it up

problem
: The report request could not be completed and the link indicates where the details can be found about what when wrong.

Report identifiers:

There are two basic report types. Those which are run on a schedule (e.g. recent grant report from thesis or creators report from authors) and those which are requested then run. For the scheduled reports the identifier would be in the reports' unique name.  For requested reports another mechanism maybe required.  A good candidate for the identifier would be UUID v5. Since the report script or program is responsible for storing the results it would also be responsible for versioning the stored results if needed. By separating the ID from the report instance it is left to the report what the name of the stored result is while still being able to map a request to that link's instance.

Reports can be of different content types. Most reports we generate manually today are either CSV, tab delimited or Excel files.  By allowing reports to have different content types we also allow for the report to be provided in a relevant type. E.g. a report could be generated as a PDF or even an SQLite3 database.

### Exploring the report runner

COLD provides a collection called "reports.ds".  Assuming that collection is readable on your data processing machine a runner needs to be able to do several actions.

1. Retrieve the next report to initiate
2. Update the report status (e.g. request -> processing)
3. The runner needs to execute the shell command that implements the report
4. Update the report status (e.g. processing -> available or processing -> problem)

The report runner repeats these four steps until there are no more requests available. At that time it can sleep for a designated period of time then start the loop again when requests are available.

To control what is executed it is desirable to have a specific configurable task runner available. This will prevent arbitrary commends from running.

Off the shelf task runners include 

- Make, a build system dating back to the origin times of Unix
- just, a new simpler command runner that is cross platform and language agnostic

The report runner would take the report request record, set status to processing and then pass the report name and options to task runner.  When the task completed (either successfully or failing) the result would be captured and stored in a designated storage system (e.g. G-Drive) and the report request record would need to be updated with the final status and link to the report or error report.

Date Handling
-------------

The difference between date formats, languages and representation can be considerable.  The default way a the TypeScript/JavaScript Date object render a date is "MM/DD/YYYY" using the `toDateString()` instance method.  Our databases and most of our code base expects date to be formatted in "YYYY-MM-DD" so I am using two TypeScript/JavaScript methods to achieve that.  First you use `.toJSON()` to render the date in JSON format then you trim the result to 11 characters using `.substring(0,10)`.

Booleans and webforms
---------------------

When the web form is transcribed checkboxes return a "on" if checked value.  We want these to be actual JSON booleans so in the middleware is a functions that checks for "true" or "on" before setting the value to the boolean `true`.  This will help normalize for changed and saved records.

Reports Implementation
----------------------

Reports are implemented scripts or programs that are defined in a YAML file (e.g. reports.yaml). Reports can be slow to run so COLD implements a naive queue system.  The reports.ds collection holds report requests.  Those marked as "requested" are pickup by a runner that then attempts to executes the report. Since reports are running as executables on the system outside the runner reports MUST be defined in the YAML configuration file. There are zero user controlled options. This removes the attack surface of using COLD's report system to compromise the application server.  Additionally the scripts/programs implementing the reports retrieved by a data processing service on a different service. It is on this machine that the reports are defined. This machine is not directly accessible by the web and should be configured to restrict non-campus network access as an additional step to minimize the attack surface.

The report scripts/programs should return an error message or link where the reports can be picked up. This is be used by the runner to resolve the final report request status.

The individual reports can be written in your language of choice (e.g. Python, Bash, TypeScript). The primary requirements are reports are responsible for storing their results and providing a link or error message to standard out when completed. Since they are just programs that write results to standard out they are able to interact with any necessary systems they are allowed to talk to (e.g. databases, external services, etc).  

A garbage collections script should clear out old requests in a timely fashion (e.g. once a week or once a month).

### Requests and Runner

A request queue is implemented track report requests via the COLD UI. A separate process reads the queue, renders the reports and then updates the queue upon completion or error.  If email addresses are provided then they will be contact with the result of the report request. The message should include the report's request id, name, status and link or error message.

## Web UI and JavaScript behaviors

Some of the objects managed by COLD are complex in the sense they each will have nested structure. E.g. a list of groups a person is associated with. These need to be validated both server and browser side. Since COLD is being developed primarily as a Deno+TypeScript application the code that validates can be used both server and browser side too. This is accomplished by cross compiling the TypeScript to JavaScript using Deno's emit package.  There is a task called "htdocs" defined in the "deno.json" file. This in turn calls "build.ts" which uses the "emit" package to generate the JavaScript used by the browser. The generated JavaScript is written to "htdocs/modules".