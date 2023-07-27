--
-- Define Models for cold.people in cold.yaml, 2023-07-26
--
\c cold
SET search_path TO cold, public;

--
-- Model: cold.people
-- Based on cold.yaml, 2023-07-26
--

DROP TABLE IF EXISTS cold.people CASCADE;
CREATE TABLE cold.people (
    given_name VARCHAR(256) DEFAULT '',
    orcid VARCHAR(19) DEFAULT '',
    author_id VARCHAR(256) DEFAULT '',
    caltech BOOLEAN,
    status BOOLEAN,
    division VARCHAR(256) DEFAULT '',
    ror VARCHAR(25),
    cl_people_id VARCHAR(256) DEFAULT '' PRIMARY KEY,
    family_name VARCHAR(256) DEFAULT '',
    directory_id VARCHAR(256) DEFAULT '',
    directory_person_type VARCHAR(256) DEFAULT '',
    updated DATE
);

--
-- LIST VIEW: cold.people 
-- FIXME: You probably want to customized this statement 
-- (e.g. add WHERE CLAUSE, ORDER BY, GROUP BY).
--
CREATE OR REPLACE VIEW cold.people_view AS
    SELECT division, ror, given_name, orcid, author_id, caltech, status, cl_people_id, family_name, directory_id, directory_person_type, updated
    FROM cold.people;

--
-- get_people provides a 'get record' for model cold.people
--
DROP FUNCTION IF EXISTS cold.get_people(_cl_people_id VARCHAR(256));
CREATE FUNCTION cold.get_people(_cl_people_id VARCHAR(256))
RETURNS TABLE (directory_person_type VARCHAR(256), updated DATE, cl_people_id VARCHAR(256), family_name VARCHAR(256), directory_id VARCHAR(256), caltech BOOLEAN, status BOOLEAN, division VARCHAR(256), ror VARCHAR(25), given_name VARCHAR(256), orcid VARCHAR(19), author_id VARCHAR(256)) AS $$
	SELECT directory_person_type, updated, cl_people_id, family_name, directory_id, caltech, status, division, ror, given_name, orcid, author_id FROM cold.people WHERE cl_people_id = _cl_people_id LIMIT 1
$$ LANGUAGE SQL;

--
-- add_people provides an 'add record' for model cold.people
-- It returns the row inserted including the primary key
DROP FUNCTION IF EXISTS cold.add_people(status BOOLEAN, division VARCHAR(256), ror VARCHAR(25), given_name VARCHAR(256), orcid VARCHAR(19), author_id VARCHAR(256), caltech BOOLEAN, updated DATE, cl_people_id VARCHAR(256), family_name VARCHAR(256), directory_id VARCHAR(256), directory_person_type VARCHAR(256));
CREATE FUNCTION cold.add_people(status BOOLEAN, division VARCHAR(256), ror VARCHAR(25), given_name VARCHAR(256), orcid VARCHAR(19), author_id VARCHAR(256), caltech BOOLEAN, updated DATE, cl_people_id VARCHAR(256), family_name VARCHAR(256), directory_id VARCHAR(256), directory_person_type VARCHAR(256))
RETURNS VARCHAR(256) AS $$
    INSERT INTO cold.people 
               (status, division, ror, given_name, orcid, author_id, caltech, updated, cl_people_id, family_name, directory_id, directory_person_type) 
        VALUES (status, division, ror, given_name, orcid, author_id, caltech, updated, cl_people_id, family_name, directory_id, directory_person_type)
    RETURNING cl_people_id
$$ LANGUAGE SQL;

--
-- update_people provides an 'update record' for model cold.people
-- It returns the updated row primary key
DROP FUNCTION IF EXISTS cold.update_people(_cl_people_id VARCHAR(256), _orcid VARCHAR(19), _author_id VARCHAR(256), _caltech BOOLEAN, _status BOOLEAN, _division VARCHAR(256), _ror VARCHAR(25), _given_name VARCHAR(256), _family_name VARCHAR(256), _directory_id VARCHAR(256), _directory_person_type VARCHAR(256), _updated DATE);
CREATE FUNCTION cold.update_people(_cl_people_id VARCHAR(256), _orcid VARCHAR(19), _author_id VARCHAR(256), _caltech BOOLEAN, _status BOOLEAN, _division VARCHAR(256), _ror VARCHAR(25), _given_name VARCHAR(256), _family_name VARCHAR(256), _directory_id VARCHAR(256), _directory_person_type VARCHAR(256), _updated DATE)
RETURNS VARCHAR(256) AS $$
    UPDATE cold.people SET orcid = _orcid, author_id = _author_id, caltech = _caltech, status = _status, division = _division, ror = _ror, given_name = _given_name, family_name = _family_name, directory_id = _directory_id, directory_person_type = _directory_person_type, updated = _updated
    WHERE cl_people_id = _cl_people_id
    RETURNING cl_people_id
$$ LANGUAGE SQL;


--
-- Define Models for cold.groups in cold.yaml, 2023-07-26
--
\c cold
SET search_path TO cold, public;

--
-- Model: cold.groups
-- Based on cold.yaml, 2023-07-26
--

DROP TABLE IF EXISTS cold.groups CASCADE;
CREATE TABLE cold.groups (
    viaf VARCHAR(256) DEFAULT '',
    ror VARCHAR(25),
    updated TIMESTAMP,
    email VARCHAR(256),
    website VARCHAR(1028),
    parent VARCHAR(256) DEFAULT '',
    prefix VARCHAR(256) DEFAULT '',
    approx_start BOOLEAN,
    end_date VARCHAR(256) DEFAULT '',
    pi VARCHAR(256) DEFAULT '',
    grid VARCHAR(256) DEFAULT '',
    ringold VARCHAR(256) DEFAULT '',
    name VARCHAR(256) DEFAULT '',
    alternative VARCHAR(256) DEFAULT '',
    start_date VARCHAR(256) DEFAULT '',
    activity VARCHAR(256) DEFAULT '',
    cl_group_id VARCHAR(256) DEFAULT '' PRIMARY KEY,
    date DATE,
    description TEXT DEFAULT '',
    approx_end BOOLEAN,
    isni VARCHAR(16) DEFAULT ''
);

--
-- LIST VIEW: cold.groups 
-- FIXME: You probably want to customized this statement 
-- (e.g. add WHERE CLAUSE, ORDER BY, GROUP BY).
--
CREATE OR REPLACE VIEW cold.groups_view AS
    SELECT approx_start, end_date, pi, grid, ringold, name, alternative, start_date, activity, cl_group_id, date, description, approx_end, isni, ror, updated, email, website, parent, prefix, viaf
    FROM cold.groups;

--
-- get_groups provides a 'get record' for model cold.groups
--
DROP FUNCTION IF EXISTS cold.get_groups(_cl_group_id VARCHAR(256));
CREATE FUNCTION cold.get_groups(_cl_group_id VARCHAR(256))
RETURNS TABLE (cl_group_id VARCHAR(256), date DATE, description TEXT, approx_end BOOLEAN, isni VARCHAR(16), viaf VARCHAR(256), ror VARCHAR(25), updated TIMESTAMP, email VARCHAR(256), website VARCHAR(1028), parent VARCHAR(256), prefix VARCHAR(256), approx_start BOOLEAN, end_date VARCHAR(256), pi VARCHAR(256), grid VARCHAR(256), ringold VARCHAR(256), name VARCHAR(256), alternative VARCHAR(256), start_date VARCHAR(256), activity VARCHAR(256)) AS $$
	SELECT cl_group_id, date, description, approx_end, isni, viaf, ror, updated, email, website, parent, prefix, approx_start, end_date, pi, grid, ringold, name, alternative, start_date, activity FROM cold.groups WHERE cl_group_id = _cl_group_id LIMIT 1
$$ LANGUAGE SQL;

--
-- add_groups provides an 'add record' for model cold.groups
-- It returns the row inserted including the primary key
DROP FUNCTION IF EXISTS cold.add_groups(alternative VARCHAR(256), start_date VARCHAR(256), activity VARCHAR(256), name VARCHAR(256), date DATE, description TEXT, approx_end BOOLEAN, isni VARCHAR(16), cl_group_id VARCHAR(256), email VARCHAR(256), website VARCHAR(1028), parent VARCHAR(256), prefix VARCHAR(256), viaf VARCHAR(256), ror VARCHAR(25), updated TIMESTAMP, end_date VARCHAR(256), pi VARCHAR(256), grid VARCHAR(256), ringold VARCHAR(256), approx_start BOOLEAN);
CREATE FUNCTION cold.add_groups(alternative VARCHAR(256), start_date VARCHAR(256), activity VARCHAR(256), name VARCHAR(256), date DATE, description TEXT, approx_end BOOLEAN, isni VARCHAR(16), cl_group_id VARCHAR(256), email VARCHAR(256), website VARCHAR(1028), parent VARCHAR(256), prefix VARCHAR(256), viaf VARCHAR(256), ror VARCHAR(25), updated TIMESTAMP, end_date VARCHAR(256), pi VARCHAR(256), grid VARCHAR(256), ringold VARCHAR(256), approx_start BOOLEAN)
RETURNS VARCHAR(256) AS $$
    INSERT INTO cold.groups 
               (alternative, start_date, activity, name, date, description, approx_end, isni, cl_group_id, email, website, parent, prefix, viaf, ror, updated, end_date, pi, grid, ringold, approx_start) 
        VALUES (alternative, start_date, activity, name, date, description, approx_end, isni, cl_group_id, email, website, parent, prefix, viaf, ror, updated, end_date, pi, grid, ringold, approx_start)
    RETURNING cl_group_id
$$ LANGUAGE SQL;

--
-- update_groups provides an 'update record' for model cold.groups
-- It returns the updated row primary key
DROP FUNCTION IF EXISTS cold.update_groups(_cl_group_id VARCHAR(256), _name VARCHAR(256), _alternative VARCHAR(256), _start_date VARCHAR(256), _activity VARCHAR(256), _date DATE, _description TEXT, _approx_end BOOLEAN, _isni VARCHAR(16), _updated TIMESTAMP, _email VARCHAR(256), _website VARCHAR(1028), _parent VARCHAR(256), _prefix VARCHAR(256), _viaf VARCHAR(256), _ror VARCHAR(25), _approx_start BOOLEAN, _end_date VARCHAR(256), _pi VARCHAR(256), _grid VARCHAR(256), _ringold VARCHAR(256));
CREATE FUNCTION cold.update_groups(_cl_group_id VARCHAR(256), _name VARCHAR(256), _alternative VARCHAR(256), _start_date VARCHAR(256), _activity VARCHAR(256), _date DATE, _description TEXT, _approx_end BOOLEAN, _isni VARCHAR(16), _updated TIMESTAMP, _email VARCHAR(256), _website VARCHAR(1028), _parent VARCHAR(256), _prefix VARCHAR(256), _viaf VARCHAR(256), _ror VARCHAR(25), _approx_start BOOLEAN, _end_date VARCHAR(256), _pi VARCHAR(256), _grid VARCHAR(256), _ringold VARCHAR(256))
RETURNS VARCHAR(256) AS $$
    UPDATE cold.groups SET name = _name, alternative = _alternative, start_date = _start_date, activity = _activity, date = _date, description = _description, approx_end = _approx_end, isni = _isni, updated = _updated, email = _email, website = _website, parent = _parent, prefix = _prefix, viaf = _viaf, ror = _ror, approx_start = _approx_start, end_date = _end_date, pi = _pi, grid = _grid, ringold = _ringold
    WHERE cl_group_id = _cl_group_id
    RETURNING cl_group_id
$$ LANGUAGE SQL;


--
-- Define Models for cold.subjects in cold.yaml, 2023-07-26
--
\c cold
SET search_path TO cold, public;

--
-- Model: cold.subjects
-- Based on cold.yaml, 2023-07-26
--

DROP TABLE IF EXISTS cold.subjects CASCADE;
CREATE TABLE cold.subjects (
    key VARCHAR(256) DEFAULT '' PRIMARY KEY,
    value VARCHAR(256) DEFAULT ''
);

--
-- LIST VIEW: cold.subjects 
-- FIXME: You probably want to customized this statement 
-- (e.g. add WHERE CLAUSE, ORDER BY, GROUP BY).
--
CREATE OR REPLACE VIEW cold.subjects_view AS
    SELECT key, value
    FROM cold.subjects;

--
-- get_subjects provides a 'get record' for model cold.subjects
--
DROP FUNCTION IF EXISTS cold.get_subjects(_key VARCHAR(256));
CREATE FUNCTION cold.get_subjects(_key VARCHAR(256))
RETURNS TABLE (key VARCHAR(256), value VARCHAR(256)) AS $$
	SELECT key, value FROM cold.subjects WHERE key = _key LIMIT 1
$$ LANGUAGE SQL;

--
-- add_subjects provides an 'add record' for model cold.subjects
-- It returns the row inserted including the primary key
DROP FUNCTION IF EXISTS cold.add_subjects(key VARCHAR(256), value VARCHAR(256));
CREATE FUNCTION cold.add_subjects(key VARCHAR(256), value VARCHAR(256))
RETURNS VARCHAR(256) AS $$
    INSERT INTO cold.subjects 
               (key, value) 
        VALUES (key, value)
    RETURNING key
$$ LANGUAGE SQL;

--
-- update_subjects provides an 'update record' for model cold.subjects
-- It returns the updated row primary key
DROP FUNCTION IF EXISTS cold.update_subjects(_key VARCHAR(256), _value VARCHAR(256));
CREATE FUNCTION cold.update_subjects(_key VARCHAR(256), _value VARCHAR(256))
RETURNS VARCHAR(256) AS $$
    UPDATE cold.subjects SET value = _value
    WHERE key = _key
    RETURNING key
$$ LANGUAGE SQL;


--
-- Define Models for cold.doi_prefixes in cold.yaml, 2023-07-26
--
\c cold
SET search_path TO cold, public;

--
-- Model: cold.doi_prefixes
-- Based on cold.yaml, 2023-07-26
--

DROP TABLE IF EXISTS cold.doi_prefixes CASCADE;
CREATE TABLE cold.doi_prefixes (
    key VARCHAR(256) DEFAULT '' PRIMARY KEY,
    value VARCHAR(256) DEFAULT ''
);

--
-- LIST VIEW: cold.doi_prefixes 
-- FIXME: You probably want to customized this statement 
-- (e.g. add WHERE CLAUSE, ORDER BY, GROUP BY).
--
CREATE OR REPLACE VIEW cold.doi_prefixes_view AS
    SELECT key, value
    FROM cold.doi_prefixes;

--
-- get_doi_prefixes provides a 'get record' for model cold.doi_prefixes
--
DROP FUNCTION IF EXISTS cold.get_doi_prefixes(_key VARCHAR(256));
CREATE FUNCTION cold.get_doi_prefixes(_key VARCHAR(256))
RETURNS TABLE (key VARCHAR(256), value VARCHAR(256)) AS $$
	SELECT key, value FROM cold.doi_prefixes WHERE key = _key LIMIT 1
$$ LANGUAGE SQL;

--
-- add_doi_prefixes provides an 'add record' for model cold.doi_prefixes
-- It returns the row inserted including the primary key
DROP FUNCTION IF EXISTS cold.add_doi_prefixes(key VARCHAR(256), value VARCHAR(256));
CREATE FUNCTION cold.add_doi_prefixes(key VARCHAR(256), value VARCHAR(256))
RETURNS VARCHAR(256) AS $$
    INSERT INTO cold.doi_prefixes 
               (key, value) 
        VALUES (key, value)
    RETURNING key
$$ LANGUAGE SQL;

--
-- update_doi_prefixes provides an 'update record' for model cold.doi_prefixes
-- It returns the updated row primary key
DROP FUNCTION IF EXISTS cold.update_doi_prefixes(_key VARCHAR(256), _value VARCHAR(256));
CREATE FUNCTION cold.update_doi_prefixes(_key VARCHAR(256), _value VARCHAR(256))
RETURNS VARCHAR(256) AS $$
    UPDATE cold.doi_prefixes SET value = _value
    WHERE key = _key
    RETURNING key
$$ LANGUAGE SQL;


--
-- Define Models for cold.journal_names in cold.yaml, 2023-07-26
--
\c cold
SET search_path TO cold, public;

--
-- Model: cold.journal_names
-- Based on cold.yaml, 2023-07-26
--

DROP TABLE IF EXISTS cold.journal_names CASCADE;
CREATE TABLE cold.journal_names (
    issn VARCHAR(256) DEFAULT '' PRIMARY KEY,
    journal VARCHAR(256) DEFAULT '',
    publisher VARCHAR(256) DEFAULT ''
);

--
-- LIST VIEW: cold.journal_names 
-- FIXME: You probably want to customized this statement 
-- (e.g. add WHERE CLAUSE, ORDER BY, GROUP BY).
--
CREATE OR REPLACE VIEW cold.journal_names_view AS
    SELECT issn, journal, publisher
    FROM cold.journal_names;

--
-- get_journal_names provides a 'get record' for model cold.journal_names
--
DROP FUNCTION IF EXISTS cold.get_journal_names(_issn VARCHAR(256));
CREATE FUNCTION cold.get_journal_names(_issn VARCHAR(256))
RETURNS TABLE (issn VARCHAR(256), journal VARCHAR(256), publisher VARCHAR(256)) AS $$
	SELECT issn, journal, publisher FROM cold.journal_names WHERE issn = _issn LIMIT 1
$$ LANGUAGE SQL;

--
-- add_journal_names provides an 'add record' for model cold.journal_names
-- It returns the row inserted including the primary key
DROP FUNCTION IF EXISTS cold.add_journal_names(issn VARCHAR(256), journal VARCHAR(256), publisher VARCHAR(256));
CREATE FUNCTION cold.add_journal_names(issn VARCHAR(256), journal VARCHAR(256), publisher VARCHAR(256))
RETURNS VARCHAR(256) AS $$
    INSERT INTO cold.journal_names 
               (issn, journal, publisher) 
        VALUES (issn, journal, publisher)
    RETURNING issn
$$ LANGUAGE SQL;

--
-- update_journal_names provides an 'update record' for model cold.journal_names
-- It returns the updated row primary key
DROP FUNCTION IF EXISTS cold.update_journal_names(_issn VARCHAR(256), _journal VARCHAR(256), _publisher VARCHAR(256));
CREATE FUNCTION cold.update_journal_names(_issn VARCHAR(256), _journal VARCHAR(256), _publisher VARCHAR(256))
RETURNS VARCHAR(256) AS $$
    UPDATE cold.journal_names SET journal = _journal, publisher = _publisher
    WHERE issn = _issn
    RETURNING issn
$$ LANGUAGE SQL;


--
-- PostgREST access and controls.
--
-- GRANT or REVOKE role permissions here to match our models.
--

-- Give access to the Schema to PostgREST for each role.
GRANT USAGE ON SCHEMA cold TO cold_anonymous;
GRANT USAGE ON SCHEMA cold TO cold;

--
-- Permissions for model cold.people
--

-- Access for our anonymous role cold_anonymous
GRANT SELECT ON cold.people TO cold_anonymous;
GRANT SELECT ON cold.people_view TO cold_anonymous;
GRANT EXECUTE ON FUNCTION cold.get_people TO cold_anonymous;

-- Access for our authenticated role cold
GRANT SELECT, INSERT, UPDATE, DELETE ON cold.people TO cold;
GRANT SELECT ON cold.people_view TO cold;
GRANT EXECUTE ON FUNCTION cold.get_people TO cold;
GRANT EXECUTE ON FUNCTION cold.add_people TO cold;
GRANT EXECUTE ON FUNCTION cold.update_people TO cold;

--
-- Permissions for model cold.groups
--

-- Access for our anonymous role cold_anonymous
GRANT SELECT ON cold.groups TO cold_anonymous;
GRANT SELECT ON cold.groups_view TO cold_anonymous;
GRANT EXECUTE ON FUNCTION cold.get_groups TO cold_anonymous;

-- Access for our authenticated role cold
GRANT SELECT, INSERT, UPDATE, DELETE ON cold.groups TO cold;
GRANT SELECT ON cold.groups_view TO cold;
GRANT EXECUTE ON FUNCTION cold.get_groups TO cold;
GRANT EXECUTE ON FUNCTION cold.add_groups TO cold;
GRANT EXECUTE ON FUNCTION cold.update_groups TO cold;

--
-- Permissions for model cold.subjects
--

-- Access for our anonymous role cold_anonymous
GRANT SELECT ON cold.subjects TO cold_anonymous;
GRANT SELECT ON cold.subjects_view TO cold_anonymous;
GRANT EXECUTE ON FUNCTION cold.get_subjects TO cold_anonymous;

-- Access for our authenticated role cold
GRANT SELECT, INSERT, UPDATE, DELETE ON cold.subjects TO cold;
GRANT SELECT ON cold.subjects_view TO cold;
GRANT EXECUTE ON FUNCTION cold.get_subjects TO cold;
GRANT EXECUTE ON FUNCTION cold.add_subjects TO cold;
GRANT EXECUTE ON FUNCTION cold.update_subjects TO cold;

--
-- Permissions for model cold.doi_prefixes
--

-- Access for our anonymous role cold_anonymous
GRANT SELECT ON cold.doi_prefixes TO cold_anonymous;
GRANT SELECT ON cold.doi_prefixes_view TO cold_anonymous;
GRANT EXECUTE ON FUNCTION cold.get_doi_prefixes TO cold_anonymous;

-- Access for our authenticated role cold
GRANT SELECT, INSERT, UPDATE, DELETE ON cold.doi_prefixes TO cold;
GRANT SELECT ON cold.doi_prefixes_view TO cold;
GRANT EXECUTE ON FUNCTION cold.get_doi_prefixes TO cold;
GRANT EXECUTE ON FUNCTION cold.add_doi_prefixes TO cold;
GRANT EXECUTE ON FUNCTION cold.update_doi_prefixes TO cold;

--
-- Permissions for model cold.journal_names
--

-- Access for our anonymous role cold_anonymous
GRANT SELECT ON cold.journal_names TO cold_anonymous;
GRANT SELECT ON cold.journal_names_view TO cold_anonymous;
GRANT EXECUTE ON FUNCTION cold.get_journal_names TO cold_anonymous;

-- Access for our authenticated role cold
GRANT SELECT, INSERT, UPDATE, DELETE ON cold.journal_names TO cold;
GRANT SELECT ON cold.journal_names_view TO cold;
GRANT EXECUTE ON FUNCTION cold.get_journal_names TO cold;
GRANT EXECUTE ON FUNCTION cold.add_journal_names TO cold;
GRANT EXECUTE ON FUNCTION cold.update_journal_names TO cold;


