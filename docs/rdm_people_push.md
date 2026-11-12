# Pushing COLD's people to the CaltechAUTHORS names list

COLD is where a person is curated. The CaltechAUTHORS RDM instance has a **names pick list** (the list a
cataloguer chooses an author from). The **people push** makes that pick list match what COLD holds, and nothing more
and nothing less. COLD is authoritative: the push never refuses to write what COLD says, and nothing in RDM is a
reason to leave a COLD person out.

The decisions behind it are cold DR-0029 to DR-0041 (in the DLD workspace, `agents/projects/cold/decisions/`). The page,
the report names and the code say "sync" because they were named before the design settled on a push; the two words mean
the same thing here.

## What a push writes

For each person in COLD, one entry in RDM's names list whose **id is the person's clpid**. A push updates the entry with
that id, or creates it if there is none. The entry is built from COLD alone:

| Entry field | Comes from |
|---|---|
| name, given name, family name | COLD's name fields (the form COLD holds, not RDM's) |
| identifiers | the clpid, plus the ORCID and ISNI when COLD has them |
| affiliations | exactly: the ROR in the person's `ror` field, Caltech's ROR when the Caltech box is checked, JPL's ROR when the JPL box is checked, each once (cold DR-0040) |

Nothing is carried over from an entry RDM already had. A person with no `ror` and neither box checked is written with no
affiliation. **The metadata records are never written**, only the pick list; a record keeps the name it was published
with.

An **ORCID, ISNI or ROR that does not validate is not pushed**. It is validated with `idutils`, the library RDM itself
uses, so a value the push accepts is a value RDM accepts. The person's other data is pushed, an ORCID or ISNI already
stored for that person is kept, and the value is listed as a *Malformed identifier in COLD* warning for a person to fix in
COLD (cold DR-0041). `idutils` does not check a ROR's check digits, so a ROR of the right shape and the wrong check pair
passes.

### Two operations

- **A full push** writes every COLD person, then removes every pick-list entry that is not one of those: the older entries
  it replaced (see below) and the entry of any clpid COLD no longer holds. **A person deleted in COLD leaves the pick list
  at the next full push.** There is no cap on removals (cold DR-0038); the dry run lists every one, and the program refuses
  an empty or malformed people list outright (exit 65) so that a broken export cannot empty the list.
- **A push of one person** writes that person only. It reflects a deletion only while COLD still knows the clpid.

An entry RDM created before the push (a *legacy* entry, whose id is not a clpid) is **replaced**: the person's new entry is
written first, so the person is never missing from the list, then the legacy entry is removed. A clpid whose entry was
soft-deleted is **revived** (cold DR-0039), so a person who returns to COLD comes back under the same id.

## Using it

### The page

`rdm_people_sync.html` ("Sync People to RDM"), linked from the dashboard. It shows:

- **Where the next run will go.** One line, read from the env file `cold` was started with: the mode (dry run or apply),
  the RDM URL and the transport. For example, *Dry run: the next run will read RDM at https://… (over ssh) and change
  nothing*. If `cold` cannot read the env file the line says *The next run's target is unknown* and gives the reason. **The page
  does not disable the button in that case**: do not press it until the line names the target you expect; see
  [Settings the people sync needs](configuring_cold.md#settings-the-people-sync-needs-in-the-environment).
- **The latest run:** when it ran, whether it was a dry run, and counts.
- **A table of what needs a person's attention**, one row per person: *Malformed identifier in COLD*, *Entry has keys RDM
  rejects*, *Person not in COLD*, and anything that failed. Creates, updates and replaces that went as planned are counted,
  not listed.
- **Sync all people now**, and for a row that can be fixed in COLD, **Rerun for CLPID**.

A request is filed with the report runner, which picks requests up on a ten-second timer, so a click shows *Sync requested.
It waits for the report runner.* and then the result. Only one run can hold the lock at a time; a second request while one is
waiting or running is refused on the page.

### The person page

A person's page in COLD has an **RDM sync** section with a **Sync CLPID to RDM** button and that person's latest outcome.
The usual loop for a data problem is: fix the person in COLD, press the button, read the outcome.

### From the command line, and from cron

```shell
cd /Sites/cold
PEOPLE_SYNC_ENV=caltechauthors.env PEOPLE_SYNC_TRIGGER=human ./run_people_sync.bash           # everyone
PEOPLE_SYNC_ENV=caltechauthors.env PEOPLE_SYNC_TRIGGER=human ./run_people_sync.bash Doe-Jane  # one person
```

This is the same path the button takes. Cron files a report request the same way, so a cron run and a human run share one
queue (`crontab-example` has the line, commented out).

### Dry run first, always

`PEOPLE_SYNC_MODE` in the env file is `dry-run` (the default) or `apply`. **A dry run reads RDM and writes nothing.** Run
one, read what it would do, and only then set `apply`. The first run against any instance, production above all, is a dry
run from the command line, reviewed with the people who own that instance.

## What protects RDM

- **Records are untouched.** Only the names tables and the names search index are written, and a full push rebuilds the
  names index and nothing else (never `invenio rdm-records rebuild-index`).
- **A pre-image is kept before the first write** of every apply (next section).
- **RDM version check.** An apply is refused on any RDM major version the write path has not been verified on (currently
  13). A dry run is not refused.
- **One writer.** A lock in `cold`'s working directory (`people_sync.lock`) stops a second run; it is exit 75. A lock whose
  owner process is alive is never broken, however old.
- **A time limit.** The instance-side program runs under `timeout` at `PEOPLE_SYNC_STALE_SECONDS` (default 600, ten
  minutes), so a run that hangs ends on the RDM host too and the lock is released. The longest full push measured on the
  rehearsal VM was 309 s over ssh.
- **A failed write does not stop the rest.** It is recorded against that person, the run closes as an error, and the exit
  code is 70. A failed *read* stops everything with nothing further written.

## The way back

Every apply writes a **pre-image** to the RDM host before its first write: every row of `name_metadata` and the names rows of
`pidstore_pid`, as JSON lines.

- **Where.** `PEOPLE_SYNC_PREIMAGE_DIR` on the RDM host, default `/var/tmp/people_sync_preimages`, mode 700, owned by the run
  user. One file per run, named by the run id: `20261112233348-0dd39b68.dump.jsonl`, mode 600.
- **Finding it.** The run's row in `people_sync_runs.ds` has a `preimage` field with the path. A dry run writes none and has
  none.
- **How many.** The newest 20 are kept; after each apply the older ones are removed. The work directories the wrapper makes
  are removed after every run, but this directory is not.
- **A run will not start without it.** If the directory cannot be made the run ends with exit 69 before the program runs.

**The JSON-lines pre-image is a record of the rows, not a restore tool.** There is no program that loads it back. The
restore that has been rehearsed (on the Multipass rehearsal VM, cold R4 step 9, 2026-11-12) is from a **table dump**, and
reproduced the original names row for row with the records unchanged:

1. Take `pg_dump -Fc -t name_metadata` of the RDM database **immediately before the first apply**, and keep it. Do this by
   hand: nothing takes it for you.
2. To go back: `DELETE FROM name_metadata;`, then `pg_restore --data-only -t name_metadata` from that dump.
3. Empty the names search index and rebuild only it. In the RDM application context: delete all documents from the names
   index (`_delete_by_query` with `match_all`), then
   `svc = current_service_registry.get("names"); svc.rebuild_index(system_identity); svc.indexer.process_bulk_queue(); svc.indexer.refresh()`.
   The rebuild only *queues* the ids; the queue must be drained in the same process. About 15 s for 8,825 names.
4. Compare: the names, the record API for a known record, its landing page, and a hash over the records table.

Entries a push creates have no `pidstore_pid` row, so the restore needs no pidstore step on the rehearsal VM. Whether production
behaves the same has **not** been checked: read production before the first apply.

## For maintainers

Facts that are not obvious from the code, found by building and rehearsing it:

- **There is no write API for names.** In `invenio-vocabularies` 9 to 11 the names REST routes are GET only; create and update
  are system-process only. So the write side is a program (`irdmtools/scripts/people_rdm_apply.py`) that `cold` ships to the RDM
  host on every run, runs there as the instance's own user (`sudo -u`, `uv run`, inside the checkout), and reads the report of.
  `cold` never connects to RDM's database. The program, and which version ran, is recorded on every run row (cold DR-0035).
- **Created entries have no `pidstore_pid` row and no `id` inside their stored JSON.** Join with `LEFT JOIN`; an inner join drops
  everything a push created.
- **A soft delete keeps the row and sets its `json` to NULL**, so a clpid stays taken. Re-creating it gives `PIDAlreadyExists`;
  the push revives it instead, by giving the row valid JSON and letting the service's own `update` write it in one
  transaction. This reaches into the service's model and is why the version check exists.
- **Production's 8,825 legacy rows each carry stray top-level `id` and `pid` keys** that the names schema forbids
  (caltechauthors#192), so the service will not update them. This is why a legacy entry is replaced, not repaired.
- **The service reads a soft-deleted entry as a stub, not as not-found.**
- **A push-created entry stores `$schema`,** and the service rejects it on a later write; the program writes only the keys the
  service accepts (`WRITABLE_KEYS`), which leave `$schema` out.
- **The names REST API refuses an RDM host that is not in its trusted list,** so the rehearsal VM cannot be read that way. Read
  an entry with `people_rdm_export_names.py` over ssh.
- **`datasetd` serves queries from `cold_api.yaml` as loaded:** restart it to serve a changed query (the push export selects
  `ror`).
- **A stale `bin/people_sync` hides source changes.** `run_people_sync.bash` runs `./bin/people_sync` when it exists; rebuild
  with `deno task people_sync.ts`.

### Exit codes (`people_sync`)

| Code | Meaning |
|---|---|
| 0 | completed; items needing a person are on the page, not an error |
| 2 | usage |
| 66 | no env file, no target, or no program files |
| 69 | the RDM host or COLD's API cannot be reached, or the pre-image directory could not be made |
| 70 | the program failed, or a write failed |
| 74 | a write to COLD failed |
| 75 | another sync holds the lock |
| 78 | the env file is present but wrong |

## Known limits

- The page does not yet show a run's pre-image path; read it from the run row.
- There is no program to restore from the JSON-lines pre-image.
- ROR check digits are not verified (cold DR-0041).
- Whether the RDM user interface displays an affiliation that has an id and no name has not been looked at; the names service
  accepts one.
- The SSM transport has not been run against the current program; ssh is the production transport and is the one rehearsed.
