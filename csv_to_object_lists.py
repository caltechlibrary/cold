#!/usr/bin/env python3

#
# csv_to_object_lists.py converts the CSV files from feeds into a JSON array of objects for person and groups.
#
import sys
import os
import csv
import json

for name in [ 'people', 'group' ]:
    i_name = os.path.join('testdata', f'{name}.csv')
    o_name = os.path.join('testdata', f'{name}.json')
    l = []
    print(f'Reading {i_name}')
    with open(i_name, newline = '') as csvfile:
        field_names = []
        reader = csv.DictReader(csvfile)
        for obj in reader:
            l.append(obj)
    print(f'Writing {o_name}')
    with open(o_name, 'w') as f:
        f.write(json.dumps(l, indent = '   '))


