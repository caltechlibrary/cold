#!/usr/bin/env python3

#
# Index people and groups
#

import sys
import os
import json

from dataloader.index import index_people, index_groups, index_funders

settings = 'settings.json'

options = { 
    "groups" : index_groups,
    "people": index_people,
    "funders": index_funders 
}

if __name__ == '__main__':
    app_name = os.path.basename(sys.argv[0])
    if len(sys.argv) > 1:
        # Check to see if a settings file is included.
        actions = []
        for arg in sys.argv[1:]:
            if arg.endswith('settings.json'):
                settings = arg
            elif arg in options:
                actions.append(arg)
            else:
                print(f"Don't know how to {arg}")
                print(f'USAGE: {app_name} [settings.json] [options]')
                sys.exit(1)
    else:
        actions = [ "groups", "people", "funders" ]
    for arg in actions:
        if arg in options:
            options[arg](settings)

