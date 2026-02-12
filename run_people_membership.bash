#!/bin/bash
#
dsquery \
    -csv "clgid,group_name,clpid,orcid,family_name,given_name" \
    -sql people_membership.sql \
    people.ds
