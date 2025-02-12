#!/bin/bash
#
dsquery \
    -csv "division,clpid,orcid,family_name,given_name" \
    -sql division_people_rpt.sql \
    people.ds
