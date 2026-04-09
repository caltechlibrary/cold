---
title: Collaborator Reports
---

# Collaborator Report

FIXME: The collabor report needs a be integrated into the main reports list. This page will be removed when that is completed.

<div id="collaborator_report"></div>

<noscript>JavaScript required for the collaborator report</noscript>

<script type="module">
  import { ClientAPI } from "./modules/client_api.js";
  import { CollaboratorReportUI } from "./modules/collaborator_report.js";
  const baseUrl = URL.parse(window.location.href);
  baseUrl.pathname = baseUrl.pathname.replace(/collaborator_report.html$/g, '');
  baseUrl.search = "";
  const reportElement = document.getElementById("collaborator_report");
  window.addEventListener('DOMContentLoaded', (event) => {
    const CollaboratorReprotUI = new CollaboratorReportUI({
        baseUrl: baseUrl,
        reportElement: reportElement,
        clientAPI: new ClientAPI(baseUrl)
    });
  });
</script>

[Back to reports page](reports)
