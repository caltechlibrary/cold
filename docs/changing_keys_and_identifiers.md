
# Changing Keys and Identifiers

By default COLD does not allow you to change object keys or the related identifier in an object. Never the less there are times when this needs to be done. This can be handled via a simple SQL statement executed on the SQLite3 database holding the collection data.


The example that follows is from Caltech People. A faculty member had been assigned the object key and clpid id "Dimitrov-M". Both needed to be changed to "Dimitrov-Vesselin".  At the SQL level the "_Key" column needed to be change but also an attribute in the JSON colomn called "src". To change JSON attribute SQLite3 provides a JSON function called `json_set`. It lets you update a specific attribute and returns the revised object. JSON object attribute needing an update is `src->'clpid'`. The `json_set` function uses the more JSON style path rather than the SQL arrow notation. Below is the resulting UPDATE statement needed to update both the "_Key" column and the `src->'clpid'` value.

~~SQL
UPDATE people
SET _Key = 'Dimitrov-Vesselin',
src = json_set(src, '$.clpid', 'Dimitrov-Vesselin')
WHERE _Key = 'Dimitrov-M';
~~

After running this command on the SQL database the record will reflect the new key and clpid values.

