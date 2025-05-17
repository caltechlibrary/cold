%thesis_option_vocabulary(1) user manual | 0.0.31  ea40df2
% R. S.Doiel
% 2025-05-14

# NAME
    
thesis_option_vocabulary
    
# SYNOPSIS
    
thesis_option_vocabulary [OPTIONS]
    
# DESCRIPTION

thesis_option_vocabulary generates an RDM Thesis Option Vocabulary. It based on
the Thesis Option data held in the dataset collection called "thesis_options.ds".
The dataset collection must be in the same directory where you
run thesis_option_vocabulary.  It must have the "thesis_option_names" query defined
for the dataset collection in the "cold_api.yaml" file. The
cold JSON API must be running for thesis_option_vocabulary to work.
If all goes well thesis_option_vocabulary should exist with a zero status code.

# OPTION

-h, --help
: display this help page

-l, --license
: display the license information

-v, --version
: display version number

# EXAMPLE

Aside from being in the same directory as "thesis_options.ds" thesis_option_vocabulary
will do the rest.

~~~shell
thesis_option_vocabulary
~~~


