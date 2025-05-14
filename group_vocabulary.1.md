%group_vocabulary(1) user manual | 0.0.31  b962e90
% R. S.Doiel
% 2025-05-14

# NAME
    
group_vocabulary
    
# SYNOPSIS
    
group_vocabulary [OPTIONS]
    
# DESCRIPTION

group_vocabulary generates an RDM Vocabulary for Groups based on
the dataset collection called "groups.ds".
The dataset collection must be in the same directory where you
run group_vocabulary.  It must have the "group_vocabulary" query defined
in the "cold_api.yaml" file and the "cold_api" service running. 
If all goes well group_vocabulary should exist with a zero status code.

# OPTION

-h, --help
: display this help page

-l, --license
: display the license information

-v, --version
: display version number

# EXAMPLE

Aside from being in the same directory as "groups.ds" group_vocabulary
will do the rest.

~~~shell
group_vocabulary
~~~


