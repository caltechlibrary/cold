#!/bin/bash
echo 'funders_grant_number	funders_agency'>testdata/grant_numbers.txt
mysql caltechauthors <harvest_funders.sql \
	>>testdata/grant_numbers.txt
cat testdata/grant_numbers.txt |\
    tab2csv -use-lazy-quotes -fields-per-record -1 \
    >testdata/grant_numbers.csv
if [ -f testdata/grant_numbers.txt ]; then rm testdata/grant_numbers.txt; fi
#echo "Now your ready to run csv_to_object_lists.py"
./csv_to_object_lists.py
