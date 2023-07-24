--
-- Define Models for cold.cl_person in cold.yaml, 2023-07-21
--
\c cold
SET search_path TO cold, public;

--
-- Model: cold.cl_person
-- Based on cold.yaml, 2023-07-21
--

DROP TABLE IF EXISTS cold.cl_person CASCADE;
CREATE TABLE cold.cl_person (
    given_name VARCHAR(256) DEFAULT '',
    orcid VARCHAR(19) DEFAULT '',
    caltech BOOLEAN,
    status BOOLEAN,
    division VARCHAR(256) DEFAULT '',
    ror VARCHAR(25),
    cl_people_id VARCHAR(256) DEFAULT '' PRIMARY KEY,
    family_name VARCHAR(256) DEFAULT '',
    author_id VARCHAR(256) DEFAULT '',
    directory_id VARCHAR(256) DEFAULT '',
    direcotry_person_type VARCHAR(256) DEFAULT '',
    updated DATE
);

--
-- LIST VIEW: cold.cl_person 
-- FIXME: You probably want to customized this statement 
-- (e.g. add WHERE CLAUSE, ORDER BY, GROUP BY).
--
CREATE OR REPLACE VIEW cold.cl_person_view AS
    SELECT author_id, directory_id, direcotry_person_type, updated, cl_people_id, family_name, caltech, status, division, ror, given_name, orcid
    FROM cold.cl_person;

--
-- get_cl_person provides a 'get record' for model cold.cl_person
--
DROP FUNCTION IF EXISTS cold.get_cl_person(_cl_people_id VARCHAR(256) DEFAULT '' PRIMARY KEY);
CREATE FUNCTION cold.get_cl_person(_cl_people_id VARCHAR(256) DEFAULT '' PRIMARY KEY)
RETURNS TABLE (cl_people_id VARCHAR(256) DEFAULT '' PRIMARY KEY, family_name VARCHAR(256) DEFAULT '', author_id VARCHAR(256) DEFAULT '', directory_id VARCHAR(256) DEFAULT '', direcotry_person_type VARCHAR(256) DEFAULT '', updated DATE, given_name VARCHAR(256) DEFAULT '', orcid VARCHAR(19) DEFAULT '', caltech BOOLEAN, status BOOLEAN, division VARCHAR(256) DEFAULT '', ror VARCHAR(25)) AS $$
	SELECT cl_people_id, family_name, author_id, directory_id, direcotry_person_type, updated, given_name, orcid, caltech, status, division, ror FROM cold.cl_person WHERE cl_people_id = _cl_people_id LIMIT 1
$$ LANGUAGE SQL;

--
-- add_cl_person provides an 'add record' for model cold.cl_person
-- It returns the row inserted including the primary key
DROP FUNCTION IF EXISTS cold.add_cl_person(cl_people_id VARCHAR(256) DEFAULT '' PRIMARY KEY, family_name VARCHAR(256) DEFAULT '', author_id VARCHAR(256) DEFAULT '', directory_id VARCHAR(256) DEFAULT '', direcotry_person_type VARCHAR(256) DEFAULT '', updated DATE, given_name VARCHAR(256) DEFAULT '', orcid VARCHAR(19) DEFAULT '', caltech BOOLEAN, status BOOLEAN, division VARCHAR(256) DEFAULT '', ror VARCHAR(25));
CREATE FUNCTION cold.add_cl_person(cl_people_id VARCHAR(256) DEFAULT '' PRIMARY KEY, family_name VARCHAR(256) DEFAULT '', author_id VARCHAR(256) DEFAULT '', directory_id VARCHAR(256) DEFAULT '', direcotry_person_type VARCHAR(256) DEFAULT '', updated DATE, given_name VARCHAR(256) DEFAULT '', orcid VARCHAR(19) DEFAULT '', caltech BOOLEAN, status BOOLEAN, division VARCHAR(256) DEFAULT '', ror VARCHAR(25))
RETURNS VARCHAR(256) DEFAULT '' PRIMARY KEY AS $$
    INSERT INTO cold.cl_person 
               (cl_people_id, family_name, author_id, directory_id, direcotry_person_type, updated, given_name, orcid, caltech, status, division, ror) 
        VALUES (cl_people_id, family_name, author_id, directory_id, direcotry_person_type, updated, given_name, orcid, caltech, status, division, ror)
    RETURNING cl_people_id
$$ LANGUAGE SQL;

--
-- update_cl_person provides an 'update record' for model cold.cl_person
-- It returns the updated row primary key
DROP FUNCTION IF EXISTS cold.update_cl_person(_cl_people_id VARCHAR(256) DEFAULT '' PRIMARY KEY, _orcid orcid VARCHAR(19) DEFAULT '', _caltech caltech BOOLEAN, _status status BOOLEAN, _division division VARCHAR(256) DEFAULT '', _ror ror VARCHAR(25), _given_name given_name VARCHAR(256) DEFAULT '', _family_name family_name VARCHAR(256) DEFAULT '', _author_id author_id VARCHAR(256) DEFAULT '', _directory_id directory_id VARCHAR(256) DEFAULT '', _direcotry_person_type direcotry_person_type VARCHAR(256) DEFAULT '', _updated updated DATE);
CREATE FUNCTION cold.update_cl_person(_cl_people_id VARCHAR(256) DEFAULT '' PRIMARY KEY, _orcid orcid VARCHAR(19) DEFAULT '', _caltech caltech BOOLEAN, _status status BOOLEAN, _division division VARCHAR(256) DEFAULT '', _ror ror VARCHAR(25), _given_name given_name VARCHAR(256) DEFAULT '', _family_name family_name VARCHAR(256) DEFAULT '', _author_id author_id VARCHAR(256) DEFAULT '', _directory_id directory_id VARCHAR(256) DEFAULT '', _direcotry_person_type direcotry_person_type VARCHAR(256) DEFAULT '', _updated updated DATE)
RETURNS VARCHAR(256) DEFAULT '' PRIMARY KEY AS $$
    UPDATE cold.cl_person SET orcid = _orcid, caltech = _caltech, status = _status, division = _division, ror = _ror, given_name = _given_name, family_name = _family_name, author_id = _author_id, directory_id = _directory_id, direcotry_person_type = _direcotry_person_type, updated = _updated
    WHERE cl_people_id = _cl_people_id
    RETURNING cl_people_id
$$ LANGUAGE SQL;


--
-- Define Models for cold.cl_group in cold.yaml, 2023-07-21
--
\c cold
SET search_path TO cold, public;

--
-- Model: cold.cl_group
-- Based on cold.yaml, 2023-07-21
--

DROP TABLE IF EXISTS cold.cl_group CASCADE;
CREATE TABLE cold.cl_group (
    cl_group_id VARCHAR(256) DEFAULT '' PRIMARY KEY,
    email VARCHAR(256),
    updated TIMESTAMP,
    approx_start BOOLEAN,
    approx_end BOOLEAN,
    grid VARCHAR(256) DEFAULT '',
    start VARCHAR(256) DEFAULT '',
    end VARCHAR(256) DEFAULT '',
    parent VARCHAR(256) DEFAULT '',
    prefix VARCHAR(256) DEFAULT '',
    name VARCHAR(256) DEFAULT '',
    date DATE,
    website VARCHAR(1028),
    description TEXT DEFAULT '',
    viaf VARCHAR(256) DEFAULT '',
    ringold VARCHAR(256) DEFAULT '',
    ror VARCHAR(25),
    alternative VARCHAR(256) DEFAULT '',
    activity VARCHAR(256) DEFAULT '',
    pi VARCHAR(256) DEFAULT '',
    isni VARCHAR(16) DEFAULT ''
);

--
-- LIST VIEW: cold.cl_group 
-- FIXME: You probably want to customized this statement 
-- (e.g. add WHERE CLAUSE, ORDER BY, GROUP BY).
--
CREATE OR REPLACE VIEW cold.cl_group_view AS
    SELECT cl_group_id, email, approx_end, grid, updated, approx_start, website, description, start, end, parent, prefix, name, date, viaf, pi, isni, ringold, ror, alternative, activity
    FROM cold.cl_group;

--
-- get_cl_group provides a 'get record' for model cold.cl_group
--
DROP FUNCTION IF EXISTS cold.get_cl_group(_cl_group_id VARCHAR(256) DEFAULT '' PRIMARY KEY);
CREATE FUNCTION cold.get_cl_group(_cl_group_id VARCHAR(256) DEFAULT '' PRIMARY KEY)
RETURNS TABLE (cl_group_id VARCHAR(256) DEFAULT '' PRIMARY KEY, email VARCHAR(256), updated TIMESTAMP, approx_start BOOLEAN, approx_end BOOLEAN, grid VARCHAR(256) DEFAULT '', name VARCHAR(256) DEFAULT '', date DATE, website VARCHAR(1028), description TEXT DEFAULT '', start VARCHAR(256) DEFAULT '', end VARCHAR(256) DEFAULT '', parent VARCHAR(256) DEFAULT '', prefix VARCHAR(256) DEFAULT '', viaf VARCHAR(256) DEFAULT '', alternative VARCHAR(256) DEFAULT '', activity VARCHAR(256) DEFAULT '', pi VARCHAR(256) DEFAULT '', isni VARCHAR(16) DEFAULT '', ringold VARCHAR(256) DEFAULT '', ror VARCHAR(25)) AS $$
	SELECT cl_group_id, email, updated, approx_start, approx_end, grid, name, date, website, description, start, end, parent, prefix, viaf, alternative, activity, pi, isni, ringold, ror FROM cold.cl_group WHERE cl_group_id = _cl_group_id LIMIT 1
$$ LANGUAGE SQL;

--
-- add_cl_group provides an 'add record' for model cold.cl_group
-- It returns the row inserted including the primary key
DROP FUNCTION IF EXISTS cold.add_cl_group(end VARCHAR(256) DEFAULT '', parent VARCHAR(256) DEFAULT '', prefix VARCHAR(256) DEFAULT '', name VARCHAR(256) DEFAULT '', date DATE, website VARCHAR(1028), description TEXT DEFAULT '', start VARCHAR(256) DEFAULT '', viaf VARCHAR(256) DEFAULT '', ror VARCHAR(25), alternative VARCHAR(256) DEFAULT '', activity VARCHAR(256) DEFAULT '', pi VARCHAR(256) DEFAULT '', isni VARCHAR(16) DEFAULT '', ringold VARCHAR(256) DEFAULT '', cl_group_id VARCHAR(256) DEFAULT '' PRIMARY KEY, email VARCHAR(256), updated TIMESTAMP, approx_start BOOLEAN, approx_end BOOLEAN, grid VARCHAR(256) DEFAULT '');
CREATE FUNCTION cold.add_cl_group(end VARCHAR(256) DEFAULT '', parent VARCHAR(256) DEFAULT '', prefix VARCHAR(256) DEFAULT '', name VARCHAR(256) DEFAULT '', date DATE, website VARCHAR(1028), description TEXT DEFAULT '', start VARCHAR(256) DEFAULT '', viaf VARCHAR(256) DEFAULT '', ror VARCHAR(25), alternative VARCHAR(256) DEFAULT '', activity VARCHAR(256) DEFAULT '', pi VARCHAR(256) DEFAULT '', isni VARCHAR(16) DEFAULT '', ringold VARCHAR(256) DEFAULT '', cl_group_id VARCHAR(256) DEFAULT '' PRIMARY KEY, email VARCHAR(256), updated TIMESTAMP, approx_start BOOLEAN, approx_end BOOLEAN, grid VARCHAR(256) DEFAULT '')
RETURNS VARCHAR(256) DEFAULT '' PRIMARY KEY AS $$
    INSERT INTO cold.cl_group 
               (end, parent, prefix, name, date, website, description, start, viaf, ror, alternative, activity, pi, isni, ringold, cl_group_id, email, updated, approx_start, approx_end, grid) 
        VALUES (end, parent, prefix, name, date, website, description, start, viaf, ror, alternative, activity, pi, isni, ringold, cl_group_id, email, updated, approx_start, approx_end, grid)
    RETURNING cl_group_id
$$ LANGUAGE SQL;

--
-- update_cl_group provides an 'update record' for model cold.cl_group
-- It returns the updated row primary key
DROP FUNCTION IF EXISTS cold.update_cl_group(_cl_group_id VARCHAR(256) DEFAULT '' PRIMARY KEY, _parent parent VARCHAR(256) DEFAULT '', _prefix prefix VARCHAR(256) DEFAULT '', _name name VARCHAR(256) DEFAULT '', _date date DATE, _website website VARCHAR(1028), _description description TEXT DEFAULT '', _start start VARCHAR(256) DEFAULT '', _end end VARCHAR(256) DEFAULT '', _viaf viaf VARCHAR(256) DEFAULT '', _alternative alternative VARCHAR(256) DEFAULT '', _activity activity VARCHAR(256) DEFAULT '', _pi pi VARCHAR(256) DEFAULT '', _isni isni VARCHAR(16) DEFAULT '', _ringold ringold VARCHAR(256) DEFAULT '', _ror ror VARCHAR(25), _email email VARCHAR(256), _updated updated TIMESTAMP, _approx_start approx_start BOOLEAN, _approx_end approx_end BOOLEAN, _grid grid VARCHAR(256) DEFAULT '');
CREATE FUNCTION cold.update_cl_group(_cl_group_id VARCHAR(256) DEFAULT '' PRIMARY KEY, _parent parent VARCHAR(256) DEFAULT '', _prefix prefix VARCHAR(256) DEFAULT '', _name name VARCHAR(256) DEFAULT '', _date date DATE, _website website VARCHAR(1028), _description description TEXT DEFAULT '', _start start VARCHAR(256) DEFAULT '', _end end VARCHAR(256) DEFAULT '', _viaf viaf VARCHAR(256) DEFAULT '', _alternative alternative VARCHAR(256) DEFAULT '', _activity activity VARCHAR(256) DEFAULT '', _pi pi VARCHAR(256) DEFAULT '', _isni isni VARCHAR(16) DEFAULT '', _ringold ringold VARCHAR(256) DEFAULT '', _ror ror VARCHAR(25), _email email VARCHAR(256), _updated updated TIMESTAMP, _approx_start approx_start BOOLEAN, _approx_end approx_end BOOLEAN, _grid grid VARCHAR(256) DEFAULT '')
RETURNS VARCHAR(256) DEFAULT '' PRIMARY KEY AS $$
    UPDATE cold.cl_group SET parent = _parent, prefix = _prefix, name = _name, date = _date, website = _website, description = _description, start = _start, end = _end, viaf = _viaf, alternative = _alternative, activity = _activity, pi = _pi, isni = _isni, ringold = _ringold, ror = _ror, email = _email, updated = _updated, approx_start = _approx_start, approx_end = _approx_end, grid = _grid
    WHERE cl_group_id = _cl_group_id
    RETURNING cl_group_id
$$ LANGUAGE SQL;


--
-- Define Models for cold.cl_subject in cold.yaml, 2023-07-21
--
\c cold
SET search_path TO cold, public;

--
-- Model: cold.cl_subject
-- Based on cold.yaml, 2023-07-21
--

DROP TABLE IF EXISTS cold.cl_subject CASCADE;
CREATE TABLE cold.cl_subject (
    cl_subject_id VARCHAR(256) DEFAULT '' PRIMARY KEY,
    subject VARCHAR(256) DEFAULT ''
);

--
-- LIST VIEW: cold.cl_subject 
-- FIXME: You probably want to customized this statement 
-- (e.g. add WHERE CLAUSE, ORDER BY, GROUP BY).
--
CREATE OR REPLACE VIEW cold.cl_subject_view AS
    SELECT cl_subject_id, subject
    FROM cold.cl_subject;

--
-- get_cl_subject provides a 'get record' for model cold.cl_subject
--
DROP FUNCTION IF EXISTS cold.get_cl_subject(_cl_subject_id VARCHAR(256) DEFAULT '' PRIMARY KEY);
CREATE FUNCTION cold.get_cl_subject(_cl_subject_id VARCHAR(256) DEFAULT '' PRIMARY KEY)
RETURNS TABLE (cl_subject_id VARCHAR(256) DEFAULT '' PRIMARY KEY, subject VARCHAR(256) DEFAULT '') AS $$
	SELECT cl_subject_id, subject FROM cold.cl_subject WHERE cl_subject_id = _cl_subject_id LIMIT 1
$$ LANGUAGE SQL;

--
-- add_cl_subject provides an 'add record' for model cold.cl_subject
-- It returns the row inserted including the primary key
DROP FUNCTION IF EXISTS cold.add_cl_subject(subject VARCHAR(256) DEFAULT '', cl_subject_id VARCHAR(256) DEFAULT '' PRIMARY KEY);
CREATE FUNCTION cold.add_cl_subject(subject VARCHAR(256) DEFAULT '', cl_subject_id VARCHAR(256) DEFAULT '' PRIMARY KEY)
RETURNS VARCHAR(256) DEFAULT '' PRIMARY KEY AS $$
    INSERT INTO cold.cl_subject 
               (subject, cl_subject_id) 
        VALUES (subject, cl_subject_id)
    RETURNING cl_subject_id
$$ LANGUAGE SQL;

--
-- update_cl_subject provides an 'update record' for model cold.cl_subject
-- It returns the updated row primary key
DROP FUNCTION IF EXISTS cold.update_cl_subject(_cl_subject_id VARCHAR(256) DEFAULT '' PRIMARY KEY, _subject subject VARCHAR(256) DEFAULT '');
CREATE FUNCTION cold.update_cl_subject(_cl_subject_id VARCHAR(256) DEFAULT '' PRIMARY KEY, _subject subject VARCHAR(256) DEFAULT '')
RETURNS VARCHAR(256) DEFAULT '' PRIMARY KEY AS $$
    UPDATE cold.cl_subject SET subject = _subject
    WHERE cl_subject_id = _cl_subject_id
    RETURNING cl_subject_id
$$ LANGUAGE SQL;


--
-- Define Models for cold.cl_publishers in cold.yaml, 2023-07-21
--
\c cold
SET search_path TO cold, public;

--
-- Model: cold.cl_publishers
-- Based on cold.yaml, 2023-07-21
--

DROP TABLE IF EXISTS cold.cl_publishers CASCADE;
CREATE TABLE cold.cl_publishers (
    issn VARCHAR(9) DEFAULT '' PRIMARY KEY,
    publisher VARCHAR(256) DEFAULT ''
);

--
-- LIST VIEW: cold.cl_publishers 
-- FIXME: You probably want to customized this statement 
-- (e.g. add WHERE CLAUSE, ORDER BY, GROUP BY).
--
CREATE OR REPLACE VIEW cold.cl_publishers_view AS
    SELECT issn, publisher
    FROM cold.cl_publishers;

--
-- get_cl_publishers provides a 'get record' for model cold.cl_publishers
--
DROP FUNCTION IF EXISTS cold.get_cl_publishers(_issn VARCHAR(9) DEFAULT '' PRIMARY KEY);
CREATE FUNCTION cold.get_cl_publishers(_issn VARCHAR(9) DEFAULT '' PRIMARY KEY)
RETURNS TABLE (issn VARCHAR(9) DEFAULT '' PRIMARY KEY, publisher VARCHAR(256) DEFAULT '') AS $$
	SELECT issn, publisher FROM cold.cl_publishers WHERE issn = _issn LIMIT 1
$$ LANGUAGE SQL;

--
-- add_cl_publishers provides an 'add record' for model cold.cl_publishers
-- It returns the row inserted including the primary key
DROP FUNCTION IF EXISTS cold.add_cl_publishers(issn VARCHAR(9) DEFAULT '' PRIMARY KEY, publisher VARCHAR(256) DEFAULT '');
CREATE FUNCTION cold.add_cl_publishers(issn VARCHAR(9) DEFAULT '' PRIMARY KEY, publisher VARCHAR(256) DEFAULT '')
RETURNS VARCHAR(9) DEFAULT '' PRIMARY KEY AS $$
    INSERT INTO cold.cl_publishers 
               (issn, publisher) 
        VALUES (issn, publisher)
    RETURNING issn
$$ LANGUAGE SQL;

--
-- update_cl_publishers provides an 'update record' for model cold.cl_publishers
-- It returns the updated row primary key
DROP FUNCTION IF EXISTS cold.update_cl_publishers(_issn VARCHAR(9) DEFAULT '' PRIMARY KEY, _publisher publisher VARCHAR(256) DEFAULT '');
CREATE FUNCTION cold.update_cl_publishers(_issn VARCHAR(9) DEFAULT '' PRIMARY KEY, _publisher publisher VARCHAR(256) DEFAULT '')
RETURNS VARCHAR(9) DEFAULT '' PRIMARY KEY AS $$
    UPDATE cold.cl_publishers SET publisher = _publisher
    WHERE issn = _issn
    RETURNING issn
$$ LANGUAGE SQL;


--
-- Define Models for cold.cl_doi_prefixes in cold.yaml, 2023-07-21
--
\c cold
SET search_path TO cold, public;

--
-- Model: cold.cl_doi_prefixes
-- Based on cold.yaml, 2023-07-21
--

DROP TABLE IF EXISTS cold.cl_doi_prefixes CASCADE;
CREATE TABLE cold.cl_doi_prefixes (
    prefix VARCHAR(256) DEFAULT '' PRIMARY KEY,
    name VARCHAR(256) DEFAULT ''
);

--
-- LIST VIEW: cold.cl_doi_prefixes 
-- FIXME: You probably want to customized this statement 
-- (e.g. add WHERE CLAUSE, ORDER BY, GROUP BY).
--
CREATE OR REPLACE VIEW cold.cl_doi_prefixes_view AS
    SELECT prefix, name
    FROM cold.cl_doi_prefixes;

--
-- get_cl_doi_prefixes provides a 'get record' for model cold.cl_doi_prefixes
--
DROP FUNCTION IF EXISTS cold.get_cl_doi_prefixes(_prefix VARCHAR(256) DEFAULT '' PRIMARY KEY);
CREATE FUNCTION cold.get_cl_doi_prefixes(_prefix VARCHAR(256) DEFAULT '' PRIMARY KEY)
RETURNS TABLE (prefix VARCHAR(256) DEFAULT '' PRIMARY KEY, name VARCHAR(256) DEFAULT '') AS $$
	SELECT prefix, name FROM cold.cl_doi_prefixes WHERE prefix = _prefix LIMIT 1
$$ LANGUAGE SQL;

--
-- add_cl_doi_prefixes provides an 'add record' for model cold.cl_doi_prefixes
-- It returns the row inserted including the primary key
DROP FUNCTION IF EXISTS cold.add_cl_doi_prefixes(prefix VARCHAR(256) DEFAULT '' PRIMARY KEY, name VARCHAR(256) DEFAULT '');
CREATE FUNCTION cold.add_cl_doi_prefixes(prefix VARCHAR(256) DEFAULT '' PRIMARY KEY, name VARCHAR(256) DEFAULT '')
RETURNS VARCHAR(256) DEFAULT '' PRIMARY KEY AS $$
    INSERT INTO cold.cl_doi_prefixes 
               (prefix, name) 
        VALUES (prefix, name)
    RETURNING prefix
$$ LANGUAGE SQL;

--
-- update_cl_doi_prefixes provides an 'update record' for model cold.cl_doi_prefixes
-- It returns the updated row primary key
DROP FUNCTION IF EXISTS cold.update_cl_doi_prefixes(_prefix VARCHAR(256) DEFAULT '' PRIMARY KEY, _name name VARCHAR(256) DEFAULT '');
CREATE FUNCTION cold.update_cl_doi_prefixes(_prefix VARCHAR(256) DEFAULT '' PRIMARY KEY, _name name VARCHAR(256) DEFAULT '')
RETURNS VARCHAR(256) DEFAULT '' PRIMARY KEY AS $$
    UPDATE cold.cl_doi_prefixes SET name = _name
    WHERE prefix = _prefix
    RETURNING prefix
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
-- Permissions for model cold.cl_person
--

-- Access for our anonymous role cold_anonymous
GRANT SELECT ON cold.cl_person TO cold_anonymous;
GRANT SELECT ON cold.cl_person_view TO cold_anonymous;
GRANT EXECUTE ON FUNCTION cold.get_cl_person TO cold_anonymous;

-- Access for our authenticated role cold
GRANT SELECT, INSERT, UPDATE, DELETE ON cold.cl_person TO cold;
GRANT SELECT ON cold.cl_person_view TO cold;
GRANT EXECUTE ON FUNCTION cold.get_cl_person TO cold;
GRANT EXECUTE ON FUNCTION cold.add_cl_person TO cold;
GRANT EXECUTE ON FUNCTION cold.update_cl_person TO cold;

--
-- Permissions for model cold.cl_group
--

-- Access for our anonymous role cold_anonymous
GRANT SELECT ON cold.cl_group TO cold_anonymous;
GRANT SELECT ON cold.cl_group_view TO cold_anonymous;
GRANT EXECUTE ON FUNCTION cold.get_cl_group TO cold_anonymous;

-- Access for our authenticated role cold
GRANT SELECT, INSERT, UPDATE, DELETE ON cold.cl_group TO cold;
GRANT SELECT ON cold.cl_group_view TO cold;
GRANT EXECUTE ON FUNCTION cold.get_cl_group TO cold;
GRANT EXECUTE ON FUNCTION cold.add_cl_group TO cold;
GRANT EXECUTE ON FUNCTION cold.update_cl_group TO cold;

--
-- Permissions for model cold.cl_subject
--

-- Access for our anonymous role cold_anonymous
GRANT SELECT ON cold.cl_subject TO cold_anonymous;
GRANT SELECT ON cold.cl_subject_view TO cold_anonymous;
GRANT EXECUTE ON FUNCTION cold.get_cl_subject TO cold_anonymous;

-- Access for our authenticated role cold
GRANT SELECT, INSERT, UPDATE, DELETE ON cold.cl_subject TO cold;
GRANT SELECT ON cold.cl_subject_view TO cold;
GRANT EXECUTE ON FUNCTION cold.get_cl_subject TO cold;
GRANT EXECUTE ON FUNCTION cold.add_cl_subject TO cold;
GRANT EXECUTE ON FUNCTION cold.update_cl_subject TO cold;

--
-- Permissions for model cold.cl_publishers
--

-- Access for our anonymous role cold_anonymous
GRANT SELECT ON cold.cl_publishers TO cold_anonymous;
GRANT SELECT ON cold.cl_publishers_view TO cold_anonymous;
GRANT EXECUTE ON FUNCTION cold.get_cl_publishers TO cold_anonymous;

-- Access for our authenticated role cold
GRANT SELECT, INSERT, UPDATE, DELETE ON cold.cl_publishers TO cold;
GRANT SELECT ON cold.cl_publishers_view TO cold;
GRANT EXECUTE ON FUNCTION cold.get_cl_publishers TO cold;
GRANT EXECUTE ON FUNCTION cold.add_cl_publishers TO cold;
GRANT EXECUTE ON FUNCTION cold.update_cl_publishers TO cold;

--
-- Permissions for model cold.cl_doi_prefixes
--

-- Access for our anonymous role cold_anonymous
GRANT SELECT ON cold.cl_doi_prefixes TO cold_anonymous;
GRANT SELECT ON cold.cl_doi_prefixes_view TO cold_anonymous;
GRANT EXECUTE ON FUNCTION cold.get_cl_doi_prefixes TO cold_anonymous;

-- Access for our authenticated role cold
GRANT SELECT, INSERT, UPDATE, DELETE ON cold.cl_doi_prefixes TO cold;
GRANT SELECT ON cold.cl_doi_prefixes_view TO cold;
GRANT EXECUTE ON FUNCTION cold.get_cl_doi_prefixes TO cold;
GRANT EXECUTE ON FUNCTION cold.add_cl_doi_prefixes TO cold;
GRANT EXECUTE ON FUNCTION cold.update_cl_doi_prefixes TO cold;


