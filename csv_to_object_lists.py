#!/usr/bin/env python3

#
# csv_to_object_lists.py converts the CSV files from feeds into a JSON array of objects for person, groups and funders.
#
import sys
import os
import csv
import json
from datetime import datetime

ymdhms = '%Y-%m-%d %H:%M:%S'
# 2006-01-02T15:04:05Z07:00"
ymdhms = '%Y-%m-%d %H:%M:%S'

def normalize_time(s):
    if len(s) == 16:
        s += ':00'
    elif len(s) == 10:
        s += ' 00:00:00'
    else:
        s = '1001-01-01 01:01:01'
    t = datetime.strptime(s, ymdhms)
    return f'''{t.strftime(ymdhms)}'''

def sluggify(s):
    s = s.casefold().strip()
    # collapse the follow chars
    for c in [ '(', ')', '!', '[', ']', ':', '.', "\t", "\r" ]:
        if c in s:
            s = s.replace(c, '')
    return s.replace(' ', '-')

for name in [ 'people', 'groups' ]:
    i_name = os.path.join('testdata', f'{name}.csv')
    o_name = os.path.join('testdata', f'{name}.json')
    l = []
    cl_id = f'cl_{name}_id'
    print(f'Reading {i_name}')
    with open(i_name, newline = '') as csvfile:
        field_names = []
        reader = csv.DictReader(csvfile)
        for obj in reader:
            o = {}
            for field in obj:
                # skip the field.
                if field == 'key' and cl_id not in obj:
                    o[cl_id] = obj[field]
                if field in [ 'caltech', 'jpl', 'faculty', 'alumn' ]:
                    if field in obj:
                        if obj[field] == 'True':
                            o[field] = True
                elif field in ['created', 'updated']:
                    o[field] = normalize_time(obj[field])
                elif not field in [ 'thesis_count', 'advisor_count', 'authors_count', 'editor_count', 'data_count' ]:
                    if isinstance(obj[field], str) and len(obj[field]) > 0:
                       o[field] = obj[field]
            l.append(o)
    print(f'Writing {o_name}')
    with open(o_name, 'w') as f:
        f.write(json.dumps(l, indent = '   '))

# Pivot funders table on grant number to agency name into
# A funder object
name = "grant_numbers"
i_name = os.path.join('testdata', f'{name}.csv')
name = "funders"
o_name = os.path.join('testdata', f'{name}.json')
l = []
print(f'Reading {i_name}')
with open(i_name, newline = '') as csvfile:
    field_names = []
    reader = csv.DictReader(csvfile)
    o = {}
    for obj in reader:
        if not 'funders_agency' in obj or obj['funders_agency'] == None:
            obj['funders_agency'] = 'unknown'
        key = sluggify(obj['funders_agency'])
        agency = sluggify(obj['funders_agency'])
        grant_number = obj['funders_grant_number']
        if not key in o:
            o[key] = {}
            o[key]['cl_funder_id'] = key
            o[key]['grant_number'] = []
            o[key]['agency'] = agency
        if len(grant_number) > 0:
            o[key]['grant_number'].append(grant_number)
    # Now build our list from our map
    l = []
    for key in o:
        l.append(o[key])
print(f'Writing {o_name}')
with open(o_name, 'w') as f:
    f.write(json.dumps(l, indent = '   '))

