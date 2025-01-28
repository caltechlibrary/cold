%journal_vocabulary(1) user manual | 0.0.13  3904253
% R. S.Doiel
% 2025-01-29

# NAME
    
journal_vocabulary
    
# SYNOPSIS
    
journal_vocabulary [OPTIONS]
    
# DESCRIPTION

journal_vocabulary generates an RDM Vocabulary for Journals based on
the ISSN data held in the dataset collection called "issn.ds".
The dataset collection must be in the same directory where you
run journal_vocabulary.  It must have the "issn_names" query defined
in the dataset collection. If all goes well journal_vocabulary should
exist with a zero status code.

# OPTION

-h, --help
: display this help page

-l, --license
: display the license information

-v, --version
: display version number

# EXAMPLE

Aside from being in the same directory as "issn.ds" journal_vocabulary
will do the rest.

~~~shell
journal_vocabulary
~~~


