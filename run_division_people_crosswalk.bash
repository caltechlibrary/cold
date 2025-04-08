#!/bin/bash
#
if [ -d /Sites/cold ]; then cd /Sites/cold || exit 1; fi
### cat <<SQL >division_people_crosswalk_rpt.sql
### SELECT
###     json_object(
###         'tag', T.clgid,
###         'clpid', T.clpid,
###         'orcid', T.orcid
###     ) AS json_output
### FROM (
###     SELECT
###         json_extract(groups.value, '$.clgid') AS clgid,
###         json_extract(p.src, '$.clpid') AS clpid,
###         json_extract(p.src, '$.orcid') AS orcid
###     FROM
###         people p,
###         json_each(json_extract(p.src, '$.groups')) AS groups
###     WHERE
###         json_extract(groups.value, '$.clgid') IS NOT NULL AND
###         json_extract(groups.value, '$.clgid') Like 'Division-%'
### ) AS T
### ORDER BY
###     T.clgid,
###     T.clpid;
### SQL
### 
dsquery \
    -csv "tag,clpid,orcid" \
    -sql division_people_crosswalk_rpt.sql \
    people.ds

