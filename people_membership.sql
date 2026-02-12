
WITH flattened_data AS (
    SELECT
        json_extract(src, '$.clpid') AS clpid,
        json_extract(src, '$.orcid') AS orcid,
        json_extract(src, '$.family_name') AS family_name,
        json_extract(src, '$.given_name') AS given_name,
        json_extract(g.value, '$.clgid') AS clgid,
        json_extract(g.value, '$.group_name') AS group_name
    FROM
        people,
        json_each(json_extract(src, '$.groups')) AS g
)
SELECT
    json_object(
    	'clgid', clgid,
        'group_name', group_name,
    	'clpid', clpid,
    	'orcid', orcid,
        'family_name', family_name,
        'given_name', given_name
    ) as obj
FROM
    flattened_data
ORDER BY
    clgid, clpid

