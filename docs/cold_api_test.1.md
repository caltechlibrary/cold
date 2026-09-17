%cold_api_test(1) user manual | 0.0.32 d0fecd6
% R. S.Doiel
% 2025-05-16

# NAME

cold_api_test

# SYNOPSIS

cold_api_test C_NAME METHOD API_PATH [JSON_PAYLOAD]

# DESCRIPTION

cold_api_test tests the COLD API as defined by the cold_api.yaml file.

For paths that include a query you need to map the query parameters
form the JSON object into the path.  The JSON_PAYLOAD can be provided
as either a final parameter or read from standard input.

NOTE: Both GET and HEAD requests ignore JSON_PAYLOAD.

# OPTIONS

-h, --help
: display help

-l, --license
: display license

-v, --version
: display version

# EXAMPLE

Retrieve the locally hosted ROR data for <https://ror.org/05dxps055>.

~~~
cold_api_test ror.ds get object/05dxps055
~~~

Run the lookup_by_acronym query.

~~~
cold_api_test ror.ds post query/lookup_by_acronym/q '{"q":"NSF"}'
~~~

In this example there are two parameters in the SQL query. We need to
name them in the JSON payload but also map them as an ordered array in
the path.  The two parameters in this example map to "name" and "acronym".
Even though we are search for one value the parameters are each provided.

~~~
cold_api_test ror.ds post query/lookup_by_name_or_acronym/n/a '{"n":"NSF","a":"NSF"}'


