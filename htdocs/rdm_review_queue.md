---
title: RDM Review Queue Tools
---

# RDM Review Queue Tools

RDM Review Queue search form goes here.

<script type="module" src="js/rdm_review_queue.js"></script>
<div id="search"></div>
<script>
 // RdmReviewQueueUI configuration variables
 const cName = 'rdm_review_queue.ds';
 const u = URL.parse(window.location.href);
 const basePath = u.pathname.replace(/rdm_review_queue.html$/g, '') + `/api/${cName}/query/search`;

 // Function to extract query parameters from the URL
 function getQueryParam(name) {
   const urlParams = new URLSearchParams(window.location.search);
   return urlParams.get(name);
 }

 // Extract the query parameter
 const searchQuery = getQueryParam('q');

 window.addEventListener('DOMContentLoaded', (event) => {
    const reviewQueueUI = new ReviewQueueUI({
            element: "#search",
            baseUrl: basePath,
            cName: cName,
    });
    if (searchQuery) {
        reviewQueueUI.triggerSearch(searchQuery);
    }
});
</script>
