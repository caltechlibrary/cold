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
            o = {}
            for field in obj:
                   # skip the field.
                if field in [ 'caltech', 'jpl', 'faculty', 'alumn' ]:
                    if field in obj:
                        if obj[field] == 'True':
                            o[field] = True
                elif not field in [ 'thesis_count', 'advisor_count', 'authors_count', 'editor_count', 'data_count' ]:
                    if isinstance(obj[field], str) and len(obj[field]) > 0:
                       o[field] = obj[field]
            l.append(o)
    print(f'Writing {o_name}')
    with open(o_name, 'w') as f:
        f.write(json.dumps(l, indent = '   '))


