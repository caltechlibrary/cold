%generate_collaborator_rpt(1) user manual | 0.0.39c 4ef9c21
% R. S.Doiel
% 2026-04-09

# NAME

generate_collaborator_rpt

# SYNOPSIS

generate_collaborator_rpt CLPID [--record_id]

# DESCRIPTION

Given a CLPID generate a collaborator report as a CSV file suitable for NSF.

# OPTION

-h, --help
: display help

-l, --license
: display license

-v, --version
: display version

--record_id
: Include the RDM record identifier for comparison

# EXAMPLE

~~~shell
generate_collaborator_rpt Newman-D-K --record_id >Diane_Newman_Collaborators.csv
~~~


