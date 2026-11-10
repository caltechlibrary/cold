#!/bin/bash

cd ~/WorkLab/cold
ssh apps.library.caltech.edu 'cd /Sites/cold && ./dump_collections.bash && ls -l cold_collections.zip'
scp apps.library.caltech.edu:/Sites/cold/cold_collections.zip ~/WorkLab/cold/cold_collections.zip
./load_collections.bash

