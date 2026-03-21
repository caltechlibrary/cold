---
title: Search RDM review queue
---

# Search RDM Review Queue

<div id="search">Loading search form... </div>

<noscript>JavaScript required for search to be available</noscript>

<script type="module">
  import { RdmReviewQueueUI } from "./modules/rdm_review_queue.js";
  const baseUrl = URL.parse(window.location.href);
  baseUrl.pathname = baseUrl.pathname.replace(/rdm_review_queue.html$/g, '');
  baseUrl.search = "";
  const searchElement = document.getElementById("search");
  window.addEventListener('DOMContentLoaded', (event) => {
    const rdmReviewQueueUI = new RdmReviewQueueUI({
        baseUrl: baseUrl,
        searchElement: searchElement
    });
  });
</script>
