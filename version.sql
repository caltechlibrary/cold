-- 
-- cold version information as SQL view
-- type: software
-- title: "cold"
-- abstract: "cold is a localhost web service for managing controlled
object lists."
-- authors:
-- --   - family-names: Doiel
--     given-names: R. S.
--     orcid: ""
-- --   - family-names: Morrell
--     given-names: Thomas E
--     orcid: ""
-- 
-- 
-- maintainers:
-- --   - family-names: 
--     given-names: 
--     orcid: ""
-- 
-- repository-code: "https://github.com/caltechlibrary/cold"
-- version: 0.0.4
-- license-url: "https://caltechlibrary.github.io/cold/LICENSE"
-- keywords: [ "metadata", "objects", "controlled vocabulary" ]
-- 

\c cold
CREATE OR REPLACE VIEW cold.version AS
   SELECT 'cold' AS app_name, '0.0.4' AS version;
