---
title: Collaborator Reports
---

# Collaborator Report

FIXME: The collabor report needs a auto complete for the clpid. This can be done with an input element typed to a data list element avoiding allot of JavaScript. Need to update this via the form builder. That means to display the form I will see how long it takes to get a list of people.ds keys from the API. Hopefully it is fast enough.

<div id="collaborator_report"></div>

<noscript>JavaScript required for the collaborator report</noscript>

<script type="module">
  import { CollaboratorReportUI } from "./modules/collaborator_report.js";
  const baseUrl = URL.parse(window.location.href);
  baseUrl.pathname = baseUrl.pathname.replace(/collaborator_report.html$/g, '');
  baseUrl.search = "";
  const reportElement = document.getElementById("collaborator_report");
  window.addEventListener('DOMContentLoaded', (event) => {
    const CollaboratorReprotUI = new CollaboratorReportUI({
        baseUrl: baseUrl,
        reportElement: reportElement
    });
  });
</script>

[Back to reports page](reports)
