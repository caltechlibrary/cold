---
title: Welcome to COLD
created: 2024-07-01
modified: 2024-05-07
pubDate: 2024-05-07
---

# Welcome to Controlled Object Lists and Datum

<div id="alerts" role="status" aria-live="polite"></div>

<noscript>JavaScript required to show active alerts</noscript>

<script type="module">
  import { ColdAlertsUI } from "./modules/cold_alerts.js";
  window.addEventListener('DOMContentLoaded', (event) => {
    new ColdAlertsUI({ mountElement: document.getElementById("alerts") });
  });
</script>

COLD lets you manage Caltech People, Groups and Funders used in Caltech Library's repositories and feeds systems.

- [People](./people/ "Curate CaltechPEOPLE")
- [Groups](./groups/ "Curate CaltechGROUPS")
- [Funders](./funders/ "Curate CaltechFUNDERS")

It also lets you manage lists of subjects, issn mappings to cannonical names and doi prefixes.

- [Journals](./journals/ "Journals mapping")
- [Thesis Options](./thesis_options/ "Thesis options mapping")
- [Subjects](./subjects/)
- [DOI Prefix](./doi_prefix/)

## Tools

- [Search RDM Queue](./rdm_review_queue.html)
- [Search RDM Records](./rdm_records.html)
- [Search CaltechTHESIS](./thesis_search.html)

* [Reports](./reports)
* [Re-assign clpid in CaltechPEOPLE](./rename/people)
