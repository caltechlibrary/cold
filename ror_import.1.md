%ror_import(1) user manual | 0.0.31 ea40df2
% R. S.Doiel
% 2025-05-14

# NAME

ror_import

# SYNOPSIS

ror_import ROR_DUMP_ZIP_FILE

# DESCRIPTION

ror_import reads the contents of ROR_DUMP_ZIP_FILE and updates the
ror.ds dataset collection. 

The ror.ds dataset collection must already exist.

The dump file can be retrieved from Zenodo. To see the lastest version
available go to <https://zenodo.org/communities/ror-data/records?q&l=list&p=1&s=10&sort=newest>.

Updates are released every four to six weeks.

# OPTIONS

-h, --help
: display help

-l, --license
: display license

-v, --version
: display version

# EXAMPLE

Updating ror.ds from the zipfile named "v1.65-2025-05-05-ror-data.zip". This release
was made 2025-05-05. It as retrieved from Zenodo at <https://zenodo.org/records/15343380>.

~~~
ror_import v1.65-2025-05-05-ror-data.zip
~~~

The import process takes a while. Be patient.



