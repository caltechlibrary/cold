#!/usr/bin/env python3

#
# Loads the test data into MySQL database using **cold**.
#

import sys
import os
import json

from http import client

from dataloader.loader import load_people, load_groups

options = { 
    "groups" : load_groups,
    "people": load_people
}

if __name__ == '__main__':
    if len(sys.argv) == 1:
        load_groups('testdata/groups.json')
        load_people('testdata/people.json')
    else:
        for arg in sys.argv[1:]:
            if arg in options:
                options[arg](f'testdata/{arg}.json')
            else:
                print(f"Don't know how to {arg}")
                sys.exit(1)

