cold - (C)ontrolled (o)bject (l)ist (d)aemon
============================================

End Points
----------

JSON service defined end points are formed as the following. The following end point descriptions support the GET method.

`/`
: A description of the service

`/api/version`
: Returns the version number of the service

`/api/people`
: Returns a list of "cl_people_id" managed by *cold* 

`/api/people/{CL_PEOPLE_ID}`
: For a GET returns a people object, a PUT will create the people object, POST will replace the people object and DELETE will remove the people object

`/api/group`
: Returns a list of "cl_group_id" managed by *cold*

`/api/group/{CL_GROUP_ID}`
: For a GET returns a group object, a PUT will create the group object, POST will replace the group object and DELETE will remove the group object

`/api/funder`
: Returns a list of "cl_funder" managed by *cold*

`/api/funder/{CL_funder_ID}`
: For a GET returns a funder object, a PUT will create the funder object, POST will replace the funder object and DELETE will remove the funder object

`/api/crosswalk`
: Returns help on how to crosswalk from one identifier to the internal identifier

`/api/crosswalk/people`
: Returns a list of identifiers available for "people" objects

`/api/crosswalk/people/{IDENTIFIER_NAME}/{IDENTIFIER}`
: Returns a list of "cl_people_id" assocated with that identifier

`/api/crosswalk/group`
: Returns a list of identifiers available for "group" objects

`/api/crosswalk/group/{IDENTIFIER_NAME}/{IDENTIFIER}`
: Returns a list of "cl_group__id" assocated with that identifier

`/api/crosswalk/funder`
: Returns a list of identifiers available for "funder" objects

`/api/crosswalk/funder/{IDENTIFIER_NAME}/{IDENTIFIER}`
: Returns a list of "cl_funder_id" assocated with that identifier

*cold* takes a REST approach to updates for managed objects.  PUT will create a new object, POST will update it, GET will retrieve it and DELETE will remove it.

Vocabularies
------------

*cold* also supports end points for stable vocabularies mapping an indentifier to a normalized name. These are set at compile time because they are so slow changing. 

`/api/subject`
: Returns a list of all the subject ids (codes)

`/api/subject/{SUBJECT_ID}`
: Returns the normalized text string for that subject id

`/api/issn`
: Returns a list of issn that are mapped to a publisher name

`/api/issn/{ISSN}`
: Returns the normalized publisher name for that ISSN


`/api/doi-prefix`
: Returns a list of DOI prefixes that map to a normalize name

`/api/doi-prefix/{DOI_PREFIX}`
: Returns the normalized publisher name for that DOI prefix

Manage interface
================

The management inteface is avialable at `/app/dashboard.html` path. This provides a dashboard which then interacts with the JSON side of the service to update content. The manage interface is built from Web Components and requires JavaScript to be enabled in the browser.

Widgets
-------

Widgets provide the user interface for humans to manage and view the objects. While **cold** can directly host these it is equally possible to integrate the static components into another system, web service or web site. They are only static web assets.  The public facing web service needs to control access to **cold** and the static content does not contain anything that is priviliged. The Widgets can be loaded indepentently in the page using the following end points.

`/widgets/people.js`
: This JavaScript file provides a display and input set of web components for our Person Object. Markup example `<person-display honorific="Mr." given="R. S." family="Doiel" lineage="" orcid="0000-0003-0900-6903"></person-display>` and `<person-input honorific="Mr." given="R. S." family="Doiel" lineage="" orcid="0000-0003-0900-6903"></person-input>`

`/widgets/groups.js`
: This JavaScript file provides a display and input set of web components for our Markup example `<group-display name="GALCIT" ror=""></group-display>` and `<group-input  name="GALCIT" ror="" label=""></group-input>`

`/widgets/funders.js`
: This JavaScript file provides a display and input set of web components for our Markup example `<funder-display name="NSF" grant_number="1.203221" ror="" doi=""></funder-display>` and `<funder-input  name="NSF" grant_number="1.203221" doi="" ror="" label="Grant details"></funder-input>`

`/widgets/vocabulary.js`
: This JavaScript file provides a identifier/name web component suitable for displaying subjects, issn/publisher info and doi-prefix/publisher info.


