/**
 * migrate_group_alternative.ts is a ONE-TIME migration script for cold#115.
 *
 * groups.ts's handlePostGroups used to save "alternative" straight from
 * the csv-textarea form field without parsing it, so any group with more
 * than the group's original single alt name ended up with "alternative"
 * stored as one raw multi-line string instead of a JSON array. That write
 * path is now fixed (handlePostGroups runs it through csv.parse(), same
 * as funders.ts), but existing records saved before the fix still hold
 * the old raw-string shape and need a one-time conversion.
 *
 * This script walks groups.ds, and for each record whose "alternative"
 * field is still a plain string:
 *   - splits it on CRLF or LF into individual names
 *   - trims each name and drops empty ones
 *   - replaces the field with the resulting string[]
 *
 * A record whose "alternative" is already an array (including an empty
 * one) is left untouched.
 *
 * This script is meant to be run once against groups.ds, then deleted
 * from the repository. It is not part of the ongoing application.
 *
 * USAGE:
 *
 *   deno run --allow-net --allow-env migrate_group_alternative.ts [--apply]
 *
 * Without --apply this runs as a dry run: it reports what would change
 * but does not write anything. Pass --apply to actually update records.
 *
 * NOTE: datasetd must already be running and reachable on apiPort for
 * groups.ds (e.g. `deno task cold_api` locally, or however datasetd is
 * run in production).
 */
import { apiPort, Dataset } from "./deps.ts";

type GroupRecord = { [key: string]: unknown };

/**
 * splitAlternative turns a raw multi-line "alternative" string into a
 * list of names, matching the split handlePostGroups now performs on
 * form submission (CRLF or LF separated, one name per line).
 */
function splitAlternative(raw: string): string[] {
  return raw
    .split(/\r\n|\n/)
    .map((s) => s.trim())
    .filter((s) => s !== "");
}

function migrateRecord(obj: GroupRecord): GroupRecord | null {
  if (!Object.prototype.hasOwnProperty.call(obj, "alternative")) {
    return null;
  }
  const val = obj["alternative"];
  if (typeof val !== "string") {
    // Already an array (or something else) -- nothing to do.
    return null;
  }
  const next: GroupRecord = { ...obj };
  next["alternative"] = splitAlternative(val);
  return next;
}

async function migrateGroupAlternative(
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
    const obj = await ds.read(key) as GroupRecord | undefined;
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
        `[dry run] would update ${key}: alternative -> ${
          JSON.stringify(next["alternative"])
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
      `updated ${key}: alternative -> ${JSON.stringify(next["alternative"])}`,
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
const apply = Deno.args.includes("--apply");
Deno.exit(await migrateGroupAlternative(apiPort, "groups.ds", apply));
