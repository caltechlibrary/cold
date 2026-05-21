#!/usr/bin/env bash

set -euo pipefail

DB_PATH="people.ds/collection.db"

OLD_CLGID="${1:-}"
NEW_CLGID="${2:-}"

if [[ -z "$OLD_CLGID" || -z "$NEW_CLGID" ]]; then
  echo "Usage: $0 OLD_CLGID NEW_CLGID"
  exit 1
fi

sqlite3 "$DB_PATH" <<SQL
WITH updated AS (
  SELECT
    p._key,
    json_group_array(
      CASE
        WHEN json_extract(g.value, '\$.clgid') = '$OLD_CLGID'
        THEN json_set(
          g.value,
          '\$.clgid',
          '$NEW_CLGID'
        )
        ELSE g.value
      END
    ) AS new_groups
  FROM people p,
       json_each(p.src, '\$.groups') AS g
  GROUP BY p._key
)
UPDATE people
SET src = json_set(
  src,
  '\$.groups',
  json((SELECT new_groups FROM updated u WHERE u._key = people._key))
)
WHERE EXISTS (
  SELECT 1
  FROM json_each(people.src, '\$.groups') g
  WHERE json_extract(g.value, '\$.clgid') = '$OLD_CLGID'
);
SQL

echo "Update complete."
