/**
 * migrate_journal_alt_name.ts is a ONE-TIME migration script for cold#117.
 *
 * journal_edit.hbs/journals.ts used to post to and read from a field named
 * "alternative_names", but almost every existing journals.ds/issn.ds record
 * carries the data (an empty array, in production today) under a
 * differently named key, "alternate_names". Both names are now retired in
 * favor of "alt_name", matching the funders/people convention.
 *
 * This script walks a collection, and for each record:
 *   - moves "alternate_names" or "alternative_names" (whichever is present)
 *     to "alt_name"
 *   - leaves a record alone if it already only has "alt_name"
 *   - updates the record only if something actually changed
 *
 * This script is meant to be run once per collection (journals.ds and,
 * if desired, issn.ds), then deleted from the repository. It is not part
 * of the ongoing application.
 *
 * USAGE:
 *
 *   deno run --allow-net --allow-env migrate_journal_alt_name.ts DATASET_C_NAME [--apply]
 *
 * Without --apply this runs as a dry run: it reports what would change
 * but does not write anything. Pass --apply to actually update records.
 *
 * NOTE: datasetd must already be running and reachable on apiPort for the
 * named collection (e.g. `deno task cold_api` locally, or however
 * datasetd is run in production).
 */
import { apiPort, Dataset } from "./deps.ts";

type JournalRecord = { [key: string]: unknown };

/**
 * migrateRecord decides the new shape of a record's alt_name field.
 *
 * @returns null if nothing needs to change, otherwise the object to write.
 */
function migrateRecord(obj: JournalRecord): JournalRecord | null {
  const hasAlternate = Object.prototype.hasOwnProperty.call(
    obj,
    "alternate_names",
  );
  const hasAlternative = Object.prototype.hasOwnProperty.call(
    obj,
    "alternative_names",
  );
  if (!hasAlternate && !hasAlternative) {
    return null;
  }
  const alternate = hasAlternate ? obj["alternate_names"] : undefined;
  const alternative = hasAlternative ? obj["alternative_names"] : undefined;
  // Prefer whichever of the two old fields is non-empty; both are empty
  // arrays for essentially every record as of 2026-09-28, so this is
  // mostly picking alternate_names, the one that's actually populated.
  let value: unknown = [];
  if (Array.isArray(alternate) && alternate.length > 0) {
    value = alternate;
  } else if (Array.isArray(alternative) && alternative.length > 0) {
    value = alternative;
  } else if (hasAlternate) {
    value = alternate;
  } else {
    value = alternative;
  }
  const next: JournalRecord = { ...obj };
  delete next["alternate_names"];
  delete next["alternative_names"];
  next["alt_name"] = value;
  return next;
}

async function migrateJournalAltName(
  port: number,
  c_name: string,
  apply: boolean,
): Promise<number> {
  const ds = new Dataset(port, c_name);
  const keys = await ds.keys();
  console.log(`${c_name}: ${keys.length} keys`);

  let migrated = 0;
  let unchanged = 0;
  let errors = 0;

  for (const key of keys) {
    const obj = await ds.read(key) as JournalRecord | undefined;
    if (obj === undefined) {
      console.log(`error: failed to read ${c_name} key ${key}`);
      errors++;
      continue;
    }
    const next = migrateRecord(obj);
    if (next === null) {
      unchanged++;
      continue;
    }
    if (!apply) {
      console.log(
        `[dry run] would update ${key}: alt_name -> ${
          JSON.stringify(next["alt_name"])
        }`,
      );
      migrated++;
      continue;
    }
    const ok = await ds.update(key, next);
    if (!ok) {
      console.log(`error: failed to update ${c_name} key ${key}`);
      errors++;
      continue;
    }
    console.log(
      `updated ${key}: alt_name -> ${JSON.stringify(next["alt_name"])}`,
    );
    migrated++;
  }

  console.log(
    `${c_name}: ${migrated} ${
      apply ? "updated" : "would be updated"
    }, ${unchanged} already ok, ${errors} errors`,
  );
  return errors > 0 ? 1 : 0;
}

/*
 * main
 */
const args = Deno.args.filter((a) => a !== "--apply");
const apply = Deno.args.includes("--apply");
if (args.length !== 1) {
  console.log(
    "USAGE: deno run --allow-net --allow-env migrate_journal_alt_name.ts DATASET_C_NAME [--apply]",
  );
  console.log("NOTE: datasetd must be running on the configured apiPort");
  console.log("Without --apply this only reports what would change.");
  Deno.exit(1);
}
Deno.exit(await migrateJournalAltName(apiPort, args[0], apply));
