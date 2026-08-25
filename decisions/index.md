# Decision Records — index

Generated file. Do not hand-edit.

```
DR-0007  2026-08-24  proposed     decision     implementation   -     Open: drop the undocumented `all=1` query parameter from the CaltechAUTHORS report scripts
DR-0006  2026-08-24  accepted     correction   request          -     CaltechAUTHORS API pagination: one shared `fetchAllRecords()` for all four report scripts
DR-0005  2026-08-13  accepted     correction   request          -     Derive a report's output format from `cold_reports.yaml`'s `content_type` instead of hardcoding it in the script
DR-0004  2026-08-12  accepted     correction   request          -     Issue #106: the 48-month collaborator window was computed but never applied to the query
DR-0003  2026-08-12  accepted     correction   implementation   -     Real bug: `Runnable.run()` decoded report stdout as UTF-8, silently corrupting binary output
DR-0002  2026-04-07  accepted     decision     request          -     Parameterized reports: `basename` becomes a name template, and every layer re-validates
DR-0001  2024-10-25  accepted     decision     design           -     COLD reports are stdout-producing programs; the runner owns validation, placement and notification
```
