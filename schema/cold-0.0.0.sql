--
-- Cols database holds tables for controlled object lists of people, groups and funders
-- allow Caltech Library to easily crosswalk between various known PIDs.
--

--
-- people holds person objects
--
DROP TABLE IF EXISTS person;
CREATE TABLE person (
    cl_people_id VARCHAR(255) PRIMARY KEY,
    object JSON
);

--
-- local_group holds groups, organization, school  or departmental objects
-- NOTE: 'group' is a reserved word in SQL, using local_group to avoid quoting and
-- syntax error.
DROP TABLE IF EXISTS local_group;
CREATE TABLE local_group (
    cl_group_id VARCHAR(255) PRIMARY KEY,
    object JSON
);


--
-- funders holds funder information
--
DROP TABLE IF EXISTS funder;
CREATE TABLE funder (
    cl_funder_id VARCHAR(255) PRIMARY KEY,
    object JSON
);

--
-- vocabularies
--
-- DROP TABLE IF EXISTS vocabulary;
-- CREATE TABLE vocabulary (
--  key VARCHAR(255) PRIMARY KEY,
--  value VARCHAR(255) DEFAULT '',
--  description TEXT DEFAULT '',
--  collection VARCHAR(255) NOT NULL 
-- );



