--
-- Model: cold.cl_person
-- Based on cold.yaml, 2023-07-24
--
--
\c cold
-- Test SELECT STATEMENT: cold.cl_person
--
-- SELECT * FROM cold.cl_person ORDER BY RANDOM() LIMIT 10;

-- Test LIST VIEW: cold.cl_person 
--
SELECT given_name, author_id, status, direcotry_person_type, division, ror, family_name, orcid, directory_id, caltech, updated, cl_people_id FROM cold.cl_person_view;


--
-- Model: cold.cl_group
-- Based on cold.yaml, 2023-07-24
--
--
\c cold
-- Test SELECT STATEMENT: cold.cl_group
--
-- SELECT * FROM cold.cl_group ORDER BY RANDOM() LIMIT 10;

-- Test LIST VIEW: cold.cl_group 
--
SELECT alternative, email, grid, prefix, viaf, name, approx_start, end, isni, ringold, ror, date, description, pi, start, activity, approx_end, parent, cl_group_id, updated, website FROM cold.cl_group_view;


--
-- Model: cold.vocabulary
-- Based on cold.yaml, 2023-07-24
--
--
\c cold
-- Test SELECT STATEMENT: cold.vocabulary
--
-- SELECT * FROM cold.vocabulary ORDER BY RANDOM() LIMIT 10;

-- Test LIST VIEW: cold.vocabulary 
--
SELECT voc_id, namespace, key, value FROM cold.vocabulary_view;


--
-- Model: cold.vocabulary_description
-- Based on cold.yaml, 2023-07-24
--
--
\c cold
-- Test SELECT STATEMENT: cold.vocabulary_description
--
-- SELECT * FROM cold.vocabulary_description ORDER BY RANDOM() LIMIT 10;

-- Test LIST VIEW: cold.vocabulary_description 
--
SELECT namespace, description FROM cold.vocabulary_description_view;


