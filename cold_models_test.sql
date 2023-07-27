--
-- Model: cold.people
-- Based on cold.yaml, 2023-07-26
--
--
\c cold
-- Test SELECT STATEMENT: cold.people
--
-- SELECT * FROM cold.people ORDER BY RANDOM() LIMIT 10;

-- Test LIST VIEW: cold.people 
--
SELECT given_name, orcid, directory_id, caltech, status, directory_person_type, cl_people_id, family_name, ror, updated, author_id, division FROM cold.people_view;


--
-- Model: cold.groups
-- Based on cold.yaml, 2023-07-26
--
--
\c cold
-- Test SELECT STATEMENT: cold.groups
--
-- SELECT * FROM cold.groups ORDER BY RANDOM() LIMIT 10;

-- Test LIST VIEW: cold.groups 
--
SELECT end_date, pi, cl_group_id, date, activity, parent, email, start_date, approx_end, prefix, grid, isni, viaf, ror, alternative, description, website, approx_start, ringold, name, updated FROM cold.groups_view;


--
-- Model: cold.subjects
-- Based on cold.yaml, 2023-07-26
--
--
\c cold
-- Test SELECT STATEMENT: cold.subjects
--
-- SELECT * FROM cold.subjects ORDER BY RANDOM() LIMIT 10;

-- Test LIST VIEW: cold.subjects 
--
SELECT key, value FROM cold.subjects_view;


--
-- Model: cold.doi_prefixes
-- Based on cold.yaml, 2023-07-26
--
--
\c cold
-- Test SELECT STATEMENT: cold.doi_prefixes
--
-- SELECT * FROM cold.doi_prefixes ORDER BY RANDOM() LIMIT 10;

-- Test LIST VIEW: cold.doi_prefixes 
--
SELECT key, value FROM cold.doi_prefixes_view;


--
-- Model: cold.journal_names
-- Based on cold.yaml, 2023-07-26
--
--
\c cold
-- Test SELECT STATEMENT: cold.journal_names
--
-- SELECT * FROM cold.journal_names ORDER BY RANDOM() LIMIT 10;

-- Test LIST VIEW: cold.journal_names 
--
SELECT issn, journal, publisher FROM cold.journal_names_view;


