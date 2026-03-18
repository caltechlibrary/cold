---
title: Extending COLD
dateCreated: "2026-03-18"
---

# Extending COLD

COLD is designed to be extended and adapted to on going library (and archives needs). It can be extended in several ways depending on the needs. COLD is built on short "stack". At the lowest level is the dataset web service. This provides two types of functionality, a static web service (content hosted in the htdocs directory of COLD) and a JSON API (browser path prefix "/api/") used for interacting with with dataset collections. This includes basic CRUD (create, read, update, delete) operations as well as listing collection object identifiers (aka keys) and SQL based queries defined in the dataset web service configuration file (example cold_api.yaml). 

COLD also includes a two thin middleware layer written in TypeScript compiled to an executable via Deno. The first is called "cold", it provides the basic middleware for implementing Caltech People, Groups and Funders. The reason for its existance to provide object validation of submit actions from the browser.  The second middleware runs the reports system, it has the unsurprising name of "cold_reports". 

The static content shipped with COLD is equally important to the server side processing. It is provides the JavaScript modules needed to implement the Web UI browser side. It is co-equal to the to the web services. Combined they implement the COLD web application.

Extending COLD can be done at any of these layers. Which layer you choose should be guided by the end goal.

## Browser side extensions

In production COLD run behind a standard web server (Apache 2) and Shibboleth. If you also have another web services behind Shibboleth and it allows JavaScript script interactions with it's API you maybe able to host your custom JavaScript modules in COLD to provide a UI for actions executed against that API. The biggest challenge is that many services have restrictive CORS settings and this may prevent the JavaScript under COLD from interacting with the third system. If that is the case then a proxy layer may be needed.

A variation of this approach can also be taken by talking directly to the dataset web service API end points. The primary concern is server side object validation. The dataset web service doesn't yet support object schema enforcement so you risk a garbage in, garbage out sencario. The "cold" service provides a proxy of the dataset web service API for direct access to the dataset web service. A future version of dataset web service will provide object schema validation.

COLD's existing browser side UI elements are written in TypeScript then compile to JavaScript in the htdocs/js or htdocs/modules directory as appropriate. If you are extending COLD using a large langauge model (example claude code, mistral or public.ai) I recommend implementing your extensions in TypeScript. The LLM produce better code for typed languages.

## middleware

The COLD middle ware is split between two services. The "cold" service is responsible for curation duties. If you enhancement involves envolves CRUD operations then modifying the cold web service is a good place to start. You can add additional end points as TypeScript modules then import them into cold.ts as request handlers.  The request handles' resposibility is to validate and if necessary sanitize the inputs before passing them on to the dataset web service API.  Caltech Library has a growing TypeScript module called [metadatatools](https://github.com/caltechlibrary/metadatatools) that provides identifier validation. It was inspired by the Python IdUtils package. This can simplify the data validation process considerably. If you are validating a new type of identifier I would suggest adding the validation to metadatatools first then using them with in the cold module for your handler.  The cold module also includes Handlebars template support with views defined in the "views" directory of the cold repository.

The cold_reports middle layer provides a report running. These are configured in the cold_reports.yaml file.  The report running will execute the command defined in the configuration file via a work queue managed by the cold_report service. When the requested report is completed it writes the results to htdocs/rpt and updates the queue to reflect that it is available. For security reasons the report systems does not allow parameter passing (this might change in the future). The limitations means that reports currently need to be implemented as a simple request mechanism. The report implementation can be written in any programming language which you can call from the command line and run via the web service's user identifier. 

If production we have two flavors of reports currently. The first is reports that execute against the COLD curated dataset collections. This run quickly and are usually available in a few seconds. It is also possible to run reports remotely by polling the queue on the report system, generating content and writing back to the cold htdocs/rpt directory then pushing an updated status into the COLD reports work queue.  We use the remote system's for processing reports which many utilised privilaged information without exposing that data on our application server.

A variation to modifying cold web service or implementing a report to be run by cold_reports is to make another middleware. Care needs to be taken to make sure you are running your service on an available port on localhost. You'll also need to manage the systemd configuration such that it can restart when requirements are met.

## Hybrid dataset web service and browser side processing

Working directly against the dataset middleware can provide a quick way to prototype and implement a human friendly user interface.  COLD's cold service uses the cold_api.yaml for defining the collections made available directly in the cold application. Extending COLD using this approach brakes down into several parts.

- Decide what the objects your storing show look like and if they require server side validation
  a. server side validation will require middleware to be extended or written
  b. skipping validation will allow you to use dataset web service directly but at the risk of garbage in/garbage out problems
- CRUD operations are provided dataset web service which can be proxied via middleware validators or directly access via the web service's localhost port number
- The Web UI will be implemented in the htdocs directory via JavaScript modules and HTML
  - Web Components make complex structures like likes easier to manage, see [CL-web-components](https://github.com/caltechlibrary/CL-web-components)

## Use Case Example

In this example COLD is extended to provide a search interface to an Invenio RDM review queue and search API. There are two requests, provide a simple search form for RDM search that makes it easy to use OpenSearch query DSL for fielded search (example people, groups, funders) by appropriate identifiers (clpid, clgid, orcid, ror, names and partial names).  The second is to provide a review queue content search directly against the joined requests and drafts tables.

### General parameterized search

For general RDM search the UI will only need to form the search query URL then redirect the browser using that URL to RDM's search pages. This allows for quick search by people and groups by using OpenSearch fielded search DSL. The general search boils down to creating a UI widget to express the DSL as desired. From the point of view of RDM a search request is submitted just as a browser using the search page would have made the request. From the COLD point of view we avoid the heavy list of formatting search results from the JSON API search view directly.

### Review Queue search

In Invenio v12 and v13 the review queue related tables are not directly indexed in OpenSearch. This makes it challenging when curation review queue items by a person or group. What appears in the review queue involves two tables, request_metadata holds the request status and a pointer to the metadata record. The requests we're interested in are those with a "submitted" status. These requests' metadata are held in the rdm_drafts_metadata table. Joining the two allows us to create an object that can be snapped shotted into a dataset collection easily.

Our production RDM deployments run on their own servers and their databases aren't visible on our application server. By scripting the psql on the remote system a JSONL file can be created and read on our application server running cold. This can be used to populate a dataset collection quickly (overwriting existing records as needed). The this makes the objects searchable via the query API defined in the YAML for the dataset web service.

The search, aside from parameter passing and validation is a read operation. We can develop directly against the dataset web service query API end points.

The research results need to presented in a friendly way in the web browser and be able to be downloaded as CSV files. The latter can be done browser side using the same JSON query API response to format the HTML results page.

### Review queue reports

In discussion with the client there are some canned reports for spreads. These can be implemented using the full review queue collection and tabulating results. These include things like submission per day, per week, per month, per quarter. These CSV files should include the RDM id, RDM link, created date, publication date, current status, title, publisher, journal title. Authors lists should be skipped as they blow up for Astronomy and Physics papers.
