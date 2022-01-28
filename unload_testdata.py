#!/usr/bin/env python3

#
# Unloads the test data into MySQL database using **cold**.
#

import sys
import os
import json

from http import client

from dataloader.loader import unload_groups, unload_people, unload_funders

options = { 
    "groups" : unload_groups,
    "people": unload_people,
    "funders": unload_funders 
}

if __name__ == '__main__':
    if len(sys.argv) == 1:
        unload_groups('testdata/groups.json')
        unload_people('testdata/people.json')
        unload_funders('testdata/funders.json')
    else:
        for arg in sys.argv[1:]:
            if arg in options:
                options[arg](f'testdata/{arg}.json')
            else:
                print(f"Don't know how to {arg}")
                sys.exit(1)

