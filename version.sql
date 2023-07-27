/* 
cold 0.0.4 version information as SQL view

cold is a localhost web service for managing controlled object lists.

authors:
  Doiel, R. S. 
  Morrell, Thomas E 



maintainers:
  Doiel, R. S. 



Git Repo: https://github.com/caltechlibrary/cold

*/
\c cold
CREATE OR REPLACE VIEW cold.version AS
   SELECT 'cold' AS app_name, '0.0.4' AS version;
