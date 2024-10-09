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

