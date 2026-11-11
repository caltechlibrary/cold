---
title: Sync People to RDM
---

# Sync People to RDM

COLD is the authority for who a person is. This page shows the latest sync of COLD's people with the CaltechAUTHORS names vocabulary and what needs a person's attention. RDM's names cannot be edited by hand: fix a person in COLD, then rerun the sync for that person.

<div id="people_sync">Loading the sync page…</div>

<noscript>JavaScript is required to show the sync status and to start a sync.</noscript>

<script type="module">
  import { PeopleSyncUI } from "./modules/people_sync_page.js";
  const baseUrl = URL.parse(window.location.href);
  baseUrl.pathname = baseUrl.pathname.replace(/rdm_people_sync.html$/g, '');
  baseUrl.search = "";
  window.addEventListener('DOMContentLoaded', () => {
    new PeopleSyncUI({
      mountElement: document.getElementById("people_sync"),
      baseUrl: baseUrl,
      peopleBase: "./people/",
    });
  });
</script>

[Back to the dashboard](./index.html)
