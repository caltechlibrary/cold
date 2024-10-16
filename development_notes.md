---
page_title: Development Notes
---

Development Notes
=================

Application layout and structure
--------------------------------

The primary task of the COLD UI is to provide a means of curating our list of objects and vocabularies. Each list is held in a dataset collection. Datasetd is used to provide a JSON API to curate the individual objects for each of our collections. TypeScript running via Deno is providing the middleware to tie our JSON API with our static content. The front end web server (i.e. Apache 2) provides integration with Shibboleth provides single sign on and access control.

I am relying on feeds.library.caltech.edu to provide the public facing API.  Data is transfered to feeds via scripts run on a schedule or "on demand" via a Deno task running.

The Go dataset and models package
---------------------------------

The latest evolution of dataset includes support for restricting collections to specific data models. A model is base on data types that easily map from HTML 5 form elements to SQL data types.  Additionally there are types associated with library and archives such as support for ISNI, ORCID and ROR. Dataset still supports adhoc JSON object storage if that is needed.

The data models ar enforced only via the datasetd service.  Eventually model support will be unforced for the dataset cli.

Data models are expressed in YAML and are shared between dataset and the model YAML used by Newt. Both use the same models package written in Go. The models package procides a means of define more types as well as adding renders. It is being developed in parallel with Newt, Dataset and the COLD where the latter is providing a real world use case to test the approach.

The public API isn't part of COLD directly. COLD is for curating object lists but it does export those objects to feeds.library.caltech.edu which then provides the public API.  Content is exported in JSON, YAML and CSV formats as needed by Caltech Library systems and services.

Reports
-------

Reports are implemented either as dataset SQL queries or other scripts. Since reports can be slow to run and consume reports are implemented using a task queue. Reports are requests, the results rendered and then a link is created and available on the completed reports page. A link is also emailed to the requestor.

Reports are implemented as a tasks. A task is defined in Deno's JSON file. A Deno task isn't limited to TypeScript or JavaScript. It can all out to run other programs which in turn can be written in Bash, Python or be a simple dsquery. Limitting external execution of defined tasks is important for the security of the system and host machine.  This is why the tasks are predefined. Adhoc reports are not implemented in COLD.

Data enhancement
----------------

The content curated in cold is enhanced from external source. This is done via scheduled tasks. An example is biographical and other information published in the Caltech Directory is harvested and merged into our Caltech People objects.

External data sources:

- Caltech Directory
- orcid.org
- ror.org

Reports
-------

Reports are often needed in metadata curation systems.  COLD is not exception. 

Since many of the ports needed require aggrestion across data sources the report system for COLD has the following characteristics.

- A way to make a request for a report
- A means of processing report requests
- A means of notifying the requestor when report is available
- A means of purging old reports

The management of report requests can be accomplished with a simple queue implemented as a dataset collection. The metadata needed to manage
a report request and it's life cycle are as follows.

- name of report
- any additional options needed by the report program
- an email address to contact when the report is ready
- current status of the report (e.g. requested, processing, completed)
- a link to where the report can be "picked up"
- output content type, (e.g. application/json, application/yaml, application/x-sqlite3, text/csv, text/plain, text/x-markdown)
- the date the report was requested
- the updated (when the status last changed)

A nice to have is a list of queued reports and their status. That way I report that has recently be run can be "picked up" again as needed avoiding a new request.

The reports themselves can be implemented as commmand line programs in a language of your choice. A report runner will be responsible for checking the request queue and initiating the program that runs the report and notifying the email address when it is available.

The advantage of this approach is that it avoids the problems of slow running reports (e.g. feeds build process) and allows the reports to access other data sources (e.g. CaltechAUTHORS, feeds.library.caltech.edu).

The report choices can be controlled to avoid unfettered access to the command line with any options needed vetted by the running before handing off to the report program.  The report programs themselves need to be able to write to a named filepath.  The file path can be the htdocs directory available to COLD and thus allow anyone with COLD access to view the report (reports typically need to be shared by the groups).

Notification of the requestor is done via email, the email would include a link back to where the report can be retrieved. Reports would be "cleaned" up after a fixed period of time (e.g. every few days).

This reports model would use one page for UI. It would have a web form to request a report and show a list of available reports and their status.

The report running can be implemented as a script or batch file. It needs to be able to retrieve the list of reports to run, run them and then update the report records with the new status. Each report request uses an UUID for uniquely identifying the request. 

The report runner needs to be able to allow for both short and long running reports without blocking the queue.  It should restrict how many reports can process at once so as to minimize the impact on the system.  Since the report.

A simplification in the runner would be to initaiate the report providing the report program with options, an email contact (if set) and the report's UUID.  The report program would be responsible for notifying the email address with the link based on what the runner had set.  

Completed reports would be needed after the UUID with an file extension based on the content type (e.g. CSV for text/csv, Markdown for text/markdown).

