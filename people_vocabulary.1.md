<<<<<<< HEAD
%people_vocabulary(1) user manual | 0.0.39c  ccc8ac9
=======
%people_vocabulary(1) user manual | 0.0.40  cf3625d
>>>>>>> d2870679a5761b5f584d5170ba905de301eca0f3
% R. S.Doiel
% 2026-05-08

# NAME

people_vocabulary

# SYNOPSIS

people_vocabulary [OPTIONS]

# DESCRIPTION

people_vocabulary generates an RDM Vocabulary for People based on
the dataset collection called "people.ds".
The dataset collection must be in the same directory where you
run people_vocabulary.  It must have the "people_vocabulary" query defined
in the "cold_api.yaml" file and the "cold_api" service running.
If all goes well people_vocabulary should exist with a zero status code.

# OPTION

-h, --help
: display this help page

-l, --license
: display the license information

-v, --version
: display version number

# EXAMPLE

Aside from being in the same directory as "people.ds" people_vocabulary
will do the rest.

~~~shell
people_vocabulary
~~~


