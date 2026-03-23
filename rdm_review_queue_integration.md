
# RDM Review Queue integration into COLD

## NOTES

What follows were the main request details to add to COLD.

- general report of all fields in review queue minus author field
    - report by creation date sort
    - report by publication date sort
    - simple metadata title, publisher, journal title, created date, publication date
- roll up reports daily, weekly, monthly and quarter
  - historic queue (accepted) versus current queue (submitted)
- search by author name
- search by orcid
- search by clpid
- search by group name
- search by clgid
- search by owner

All search results should have an option to download as CSV

Possible Additional reports

- monthly reports
  - demisions records brought in a month
- citation report by group, people

## Implementation Notes

I decided to implement this largely browser side and use the existing API end point provided by the COLD middleware. The middleware was modified to provide a proxy for the datasetd JSON API for the rdm_review_queue.ds collection defined in the updated cold_api.yaml file. Each type of query was implemented in SQLite3 SQL entered in the cold_api.yaml for the rdm_review_queue.ds collection. That completed the back end. Most of the time was spent refining the SQL queries to return the JSON Arrays I thought would be useful for the Web UI.

For the roll up report data Tom suggested just providing a general report that downloaded all the submissions content in the request_metadata table augument by a minimal set of fields from either the rdm_drafts_metadata or rdm_records_metadata tables. The two types of joined records (submitted content was joined to drafts, accepted joined to records metadata) then aggregated in the dataset collection by RDM id. The search interface works from the rdm_review_queue.ds collection where the aggregation is held.

For implementing the search UI I used a basic JSON object structure from the dump report then added filtering for name, clpid, orcid and clgid. The group names are not stored in RDM outside the vocabulary so I only provide search results against the clgid for groups. COLD has the list of groups and their ids so this shouldn't pose a huge problem. If not then some sort of auto-complete can be implemented so someon can put in a group name fragment and retrieve the full clgid.

A TypeScript object manages the search UI, fetching the results for the cold service (which proxies to the cold api service) and formats the results as a table. Included with the table is a download button and hidden data element that contains the CSV representation of the table. Pressing the download button will trigger a download of the contents in the data element.  If no results are returned then the button and data element are not creasted.

## Implementation of review queue snapshotting

The review queue dataset collection is a snapshot of the contents of the requests table in RDM. For submitted requests we can update our snapshot everyone hour or two (possibly more often) as the process tends to be quick (less than two minutes). Snapshotting the whole requets queue takes longer so I plan to do that once or twice a day.

This snapping approach should be fine for staff. Their are two handicaps.

1. Things added to the RDM queue between snapshots are invisible until the snapshots are updated
2. Processed items will not appear to be processed until we snapshot the whole requests queue

Staff will need to be comfortable with the delay between refresh and updating all items.

The snapshotting process is implemented via SSH, scp and a collection of Bash scripts executing SQL against the Postgres database on the CaltechAUTHORS' server.. Much of this is handled via docker cli given that the Postgres database runs inside a container. The requests table contains a large number of rows since it covers all requests (about 110K rows as I type this document). Eventually this will be inconvienent to snapshot using the simple approach. When that happens then the updated column can be used to capture created/changed records since the last snapshot.

The approach I've taken joining the three tables two at a time seems to be reasonably efficient and does not appear to impact RDM when running in production. When feeds is revised this approach would be suitable to replace the full Postgres dump I do now. This could allow much more frequent updates.

The SQL data fetches to RDM returns JSONL objects, one object per line. This can be used to load/update the dataset collections using the dataset load operation. This allows for updating our dataset collections without having to restart cold_api, cold or cold_reports. In the case of RDM review queue data it is read only so there isn't a worry about tieing up the table when refreshing collection content.
