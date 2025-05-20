%journal_vocabulary(1) user manual | 0.0.32  834fd67
% R. S.Doiel
% 2025-05-16

# NAME
    
journal_vocabulary
    
# SYNOPSIS
    
journal_vocabulary [OPTIONS]
    
# DESCRIPTION

journal_vocabulary generates an RDM Vocabulary for Journals based on
the Journals data held in the dataset collection called "journals.ds".
The dataset collection must be in the same directory where you
run journal_vocabulary.  It must have the "journal_names" query defined
for the dataset collection in the "cold_api.yaml" file. The
cold JSON API must be running for journal_vocabulary to work.
If all goes well journal_vocabulary should exist with a zero status code.

# OPTION

-h, --help
: display this help page

-l, --license
: display the license information

-v, --version
: display version number

# EXAMPLE

Aside from being in the same directory as "journals.ds" journal_vocabulary
will do the rest.

~~~shell
journal_vocabulary
~~~


