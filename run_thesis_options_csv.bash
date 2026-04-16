#!/bin/bash
#
dsquery -csv "option_id,name" thesis_options.ds "select src from thesis_options order by src->>'name'"
