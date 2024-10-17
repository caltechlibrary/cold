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

Reports are often needed for managing library data and systems. COLD's focus is on managing lists and data but can also serve as a reports request hub.

Many of the reports require aggrestion across data sources and often these will take too long or require too many resources to be run directly on our applicaiton server. That
suggests what should run on the applications server is a simple reports request management interface. The suggestions the following requirements.

- A way to make a request for a report
- A means of indicating a report status (e.g. requested or scheduled, processing, available or problem indicator)
- A means of notifying the requestor(s) when report is available
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

The reports themselves can be implemented as commmand line programs in a language of your choice. The report runner will be responsible for checking the queue and updating the queue. The report would be responsible for notification (e.g. is there is an email list then send out an email with the report link). In princle since our GitHub actions are accessible via the GitHub APIs a report could be implemented as a GitHub action.

The advantage of this approach is that it avoids the problems of slow running or resource intensive reports running directly on the application server. COLD just manages the report queue.

Advantage of narrowing the COLD's report to managing a report queue is that it separates the concerns (e.g. resource management, security, report access).

For the report management interface to be useful you do need a report runner. The report runner would be responsible for checking the report queue, updating status of the report queue and making the report request.

NOTE: the runner doesn't need to run on your apps server. It just needs access to the queue.

A report would need to implement a few things.

- accept the metadata held in the report queue
- storing the report result
- return a result needed by the runner to update the report queue (success, failure and the link to the result)

QUESTION: Should the report be responsible for notification or the runner?

The individual reports can be implemented as a script (e.g. Bash), a program (e.g. something in Python) or even externally (e.g. GitHub action).  The interface for the report would be to recieve
a JSON expression from standard input and return a JSON expression via standard output to the runner along with an error code (i.e. zero no problem, non-zero there was a problem). The report script or program
would use a link to indicate where the report could be picked up and be responsible to placing content in a storage location accessbile via the link.

Report status:

requested
: An entry that a request has been made and is waiting to be serviced

processing
: The report reqest is being serviced but is not yet available

available
: A report result is available and the link indicates where you can pick it up

problem
: The report request could not be completed and the link indicates where the details can be found about what when wrong.

Report identifiers:

There are two basic report types. Those which are run on a schedule (e.g. recent grant report from thesis or creators report from authors) and those which are requested then run. For the scheduled reports the identifier would be in the reports' unqiue name.  For requested reports another mechanism maybe required.  A good canidate for the identifier would be UUID v5. Since the report script or program is responsible for storing the results it would also be responsble for versioning the stored results if needed. By separating the ID from the report instance it is left to the report what the name of the stored result is while still being able to map a request to that link's instance.

Reports can be of different content types. Most reports we generate manually today are either CSV, tab demlimited or Excel files.  By allowing reports to have different content types we also allow for the report to be provided in a relavant type. E.g. a report could be generated as a PDF or even an SQLite3 database.

### Exploring implementation ideas

I'm thinking about the report runner does not need to run on our apps server. The runner needs two know what reports are available and if they are scheduled or not. It needs to be able to interact with COLD's report queue. If COLD's reports dataset collection is implemented with Postgres storage then Postgres can provide the record management of a report's state. This could simplify implementation while requiring additional initial deployment setup (e.g. setting up Postgres on the apps server to be accessible from the data processing machine).

Making the assumption that reports are run on our data processing machine then we remove the resource consumption to generate the report the apps server to the data processing server. E.g. the data processing server could be the some one we use to generate other static resources like feeds.

A runner could be implemented either as a daemon or cronjob. 

The cronjob approach is nice because it avoids implementing a scheduler in the report runner. 

If it was daemon we could poll the queue periodically by sleeping between poll requests. When a request is recieved it updates the request status then starts executing the report. A simple runner could take the requests sequentially based on requested timestamp with a status of requested. A transaction could be used to make the reading of the next request and setting it to processing atomic.  When no requested reports are available the daemon would sleep for a period of time before checking again otherwise it would fetch the next request and begin processing.

If the runner supports concurency then the queue can be managed more effectively and avoid long running reports from hogging the system.

Scheduled reports can be implemented by injecting a request into the queue via a cronjob. This would allow the daemon remain single without a scheduler.

Advantages to defering report processing to another machine is that we can include databases that we don't want to host or be available directly apps server (e.g. student data on apps server should be minimized).  The apps server doesn't have to know what reports are available, it would only manage the requests and provide a UI to make a request. Regularly scheduled reports would be listed in the available reports list but wouldn't have to be included in the UI decluttering the list of reports available to request. Report distribution wouldn't necessarily have to be on apps either. Reports could be pushed into other storage (e.g. G-Drive, Box, etc) leaving only the link information on the apps server.
