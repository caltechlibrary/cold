#!/usr/bin/env python3

#
# Loads/Unloads the data into MySQL database using the **cold** REST API.
#

import sys
import os
import json

from urllib.request import Request, urlopen
from urllib.parse import quote

import progressbar

rest_api_url = 'http://localhost:8486'

pid = os.getpid()

headers = {
    'Content-Type': 'application/json; charset=UTF-8',
}

def get_field(key, obj, default = ''):
    if key in obj:
        return obj[key]
    return default

def normalize_id(key):
    if isinstance(key, str):
        key = key.encode('utf-8')
    return quote(key)

def person_to_name(person):
    given = get_field('given_name', person, '')
    family = get_field('family_name', person, '')
    display_name = f'{given} {family}'.strip()
    honorific = get_field('honorific', person, '')
    lineage = get_field('lineage', person, '')
    return { 'given': given, 'family': family, 'honorific': honorific, 'lineage': lineage, 'display_name': display_name }

def rest_head(key_path):
    req = Request(url= f'{rest_api_url}{key_path}',
                  headers = headers,
                  method = 'HEAD')
    try:
        with urlopen(req) as resp:
            return resp, None
    except Exception as e:
        return None, f'{e} {key_path}'


def rest_put(key_path, obj):
    data = json.dumps(obj)
    if isinstance(data, str):
        data = data.encode('utf-8')
    req = Request(url= f'{rest_api_url}{key_path}',
                  headers = headers,
                  data = data,
                  method = 'PUT')
    try:
        with urlopen(req) as resp:
            return resp, None
    except Exception as e:
        return None, f'{e} {key_path}'


def rest_post(key_path, obj):
    data = json.dumps(obj)
    if isinstance(data, str):
        data = data.encode('utf-8')
    req = Request(url= f'{rest_api_url}{key_path}',
                  headers = headers,
                  data = data,
                  method = 'POST')
    try:
        with urlopen(req) as resp:
            return resp, None
    except Exception as e:
        return None, f'{e} {key_path}'


def rest_delete(key_path):
    req = Request(url= f'{rest_api_url}{key_path}',
                  headers = headers,
                  method = 'DELETE')
    try:
        with urlopen(req) as resp:
            return resp, None
    except Exception as e:
        return None, f'{e} {key_path}'


def load_funders(f_name):
    with open(f_name) as f:
        src = f.read()
        if not isinstance(src, bytes):
            src = src.encode('utf-8')
        try:
            funders = json.loads(src)
        except Exception as e:
            print(e)
            funders = []
        print(f'loading {len(funders)} funder records')
        tot = len(funders)
        bar = progressbar.ProgressBar(
        max_value = tot,
        widgets = [
            progressbar.Percentage(),
            ' ', progressbar.Counter(), f'/{tot}',
            ' ', progressbar.AdaptiveETA(),
            f' load_funders({f_name}) (pid:{pid})',
        ],
        redirect_stdout = True)
        bar.start()
        for i, funder in enumerate(funders):
            cl_funder_id = funder['cl_funder_id']
            if cl_funder_id != "":
                key_path = f'/api/funder/{normalize_id(cl_funder_id)}'
                resp, err = rest_head(key_path)
                if err != None and not err.startswith('HTTP Error 404'):
                    print(err)
                if resp != None and resp.status == 200:
                    resp, err = rest_post(key_path, funder)
                    if err != None:
                        print(err)
                else:
                    resp, err = rest_put(key_path, funder)
                    if err != None:
                        print(err)
            else:
                print(f'load_funders: cl_funder_id missing in {funder}')
            bar.update(i)
        bar.finish()
    

def unload_funders(f_name):
    with open(f_name) as f:
        src = f.read()
        if not isinstance(src, bytes):
            src = src.encode('utf-8')

        try:
            funders = json.loads(src)
        except Exception as e:
            print(e)
            funders = []
        print(f'unloading {len(funders)} funder records')
        tot = len(funders)
        bar = progressbar.ProgressBar(
        max_value = tot,
        widgets = [
            progressbar.Percentage(),
            ' ', progressbar.Counter(), f'/{tot}',
            ' ', progressbar.AdaptiveETA(),
            f' unload_funders({f_name}) (pid:{pid})',
        ],
        redirect_stdout = True)
        bar.start()
        for i, funder in enumerate(funders):
            cl_funder_id = funder['cl_funder_id']
            if cl_funder_id != '':
                key_path = f'/api/funder/{normalize_id(cl_funder_id)}'
                resp, err = rest_head(key_path)
                if err != None and not err.startswith('HTTP Error 404'):
                    print(err)
                if resp != None and resp.status == 200:
                    resp, err = rest_delete(key_path)
                    if err != None:
                        print(err)
            else:
                print(f'unload_funders: cl_funder_id missing in {funder}')
            bar.update(i)
        bar.finish()


def load_groups(f_name):
    with open(f_name) as f:
        src = f.read()
        if not isinstance(src, bytes):
            src = src.encode('utf-8')

        try:
            groups = json.loads(src)
        except Exception as e:
            print(e)
            groups = []
        print(f'loading {len(groups)} group records')
        tot = len(groups)
        bar = progressbar.ProgressBar(
        max_value = tot,
        widgets = [
            progressbar.Percentage(),
            ' ', progressbar.Counter(), f'/{tot}',
            ' ', progressbar.AdaptiveETA(),
            f' load_groups({f_name}) (pid:{pid})',
        ],
        redirect_stdout = True)
        bar.start()
        for i, group in enumerate(groups):
            cl_group_id = group['key']
            if cl_group_id != "":
                # Map "key" to cl_group_id
                group['cl_group_id'] = cl_group_id
                #del group['key']
                # Map ringold to ringgold (fixing typo)
                # See: https://en.wikipedia.org/wiki/Ringgold_identifier
                if "ringold" in group:
                    rin = group['ringold']
                else:
                    rin = ''
                group['ringgold'] = rin
                print(f'DEBUG {cl_group_id} -> {group}')
                key_path = f'/api/groups/{normalize_id(cl_group_id)}'
                resp, err = rest_head(key_path)
                if err != None and not err.startswith('HTTP Error 404'):
                    print(err)
                if resp != None and resp.status == 200:
                    resp, err = rest_post(key_path, group)
                    if err != None:
                        print(err)
                else:
                    resp, err = rest_put(key_path, group)
                    if err != None:
                        print(err)
            else:
                print(f'load_groups: cl_group_id missing in {group}')
            bar.update(i)
        bar.finish()


def unload_groups(f_name):
    with open(f_name) as f:
        src = f.read()
        if not isinstance(src, bytes):
            src = src.encode('utf-8')

        try:
            groups = json.loads(src)
        except Exception as e:
            print(e)
            groups = []
        print(f'unloading {len(groups)} group records')
        tot = len(groups)
        bar = progressbar.ProgressBar(
        max_value = tot,
        widgets = [
            progressbar.Percentage(),
            ' ', progressbar.Counter(), f'/{tot}',
            ' ', progressbar.AdaptiveETA(),
            f' unload_groups({f_name}) (pid:{pid})',
        ],
        redirect_stdout = True)
        bar.start()
        for i, group in enumerate(groups):
            cl_group_id = group['key']
            if cl_group_id != '':
                key_path = f'/api/groups/{normalize_id(cl_group_id)}'
                resp, err = rest_head(key_path)
                if err != None and not err.startswith('HTTP Error 404'):
                    print(err)
                if resp != None and resp.status == 200:
                    resp, err = rest_delete(key_path)
                    if err != None:
                        print(err)
            else:
                print(f'unload_groups: cl_group_id missing in {group}')
            bar.update(i)
        bar.finish()


def load_people(f_name):
    with open(f_name) as f:
        src = f.read()
        if not isinstance(src, bytes):
            src = src.encode('utf-8')

        try:
            people = json.loads(src)
        except Exception as e:
            print(e)
            people = []
        print(f'loading {len(people)} people records')
        tot = len(people)
        bar = progressbar.ProgressBar(
        max_value = tot,
        widgets = [
            progressbar.Percentage(),
            ' ', progressbar.Counter(), f'/{tot}',
            ' ', progressbar.AdaptiveETA(),
            f' load_people({f_name}) (pid:{pid})',
        ],
        redirect_stdout = True)
        bar.start()
        for i, person in enumerate(people):
            if 'cl_people_id' in person:
                cl_people_id = person['cl_people_id']
                person['name'] = person_to_name(person)
                key_path = f'/api/people/{normalize_id(cl_people_id)}'
                resp, err = rest_head(key_path)
                if err != None and not err.startswith('HTTP Error 404'):
                    print(err)
                if resp != None and resp.status == 200:
                    resp, err = rest_post(key_path, person)
                    if err != None:
                        print(err)
                else:
                    resp, err = rest_put(key_path, person)
                    if err != None:
                        print(err)
            else:
                print(f'load_people: cl_people_id missing in {people}')
            bar.update(i)
        bar.finish()


def unload_people(f_name):
    with open(f_name) as f:
        src = f.read()
        if not isinstance(src, bytes):
            src = src.encode('utf-8')

        try:
            people = json.loads(src)
        except Exception as e:
            print(e)
            people = []
        print(f'unloading {len(people)} people records')
        tot = len(people)
        bar = progressbar.ProgressBar(
        max_value = tot,
        widgets = [
            progressbar.Percentage(),
            ' ', progressbar.Counter(), f'/{tot}',
            ' ', progressbar.AdaptiveETA(),
            f' unload_people({f_name}) (pid:{pid})',
        ],
        redirect_stdout = True)
        bar.start()
        for i, person in enumerate(people):
            if 'cl_people_id' in person:
                cl_people_id = person['cl_people_id']
                key_path = f'/api/people/{normalize_id(cl_people_id)}'
                resp, err = rest_head(key_path)
                if err != None and not err.startswith('HTTP Error 404'):
                    print(err)
                if resp != None and resp.status == 200:
                    resp, err = rest_delete(key_path)
                    if err != None:
                        print(err)
            else:
                print(f'unload_people: cl_people_id missing in {person}')
            bar.update(i)
        bar.finish()


options = { 
    "groups" : load_groups,
    "people": load_people,
    "funders": load_funders 
}

if __name__ == '__main__':
    if len(sys.argv) == 1:
        load_groups()
        load_people()
        load_funders()
    else:
        for arg in sys.argv[1:]:
            if arg in options:
                options[arg]()
            else:
                print(f"Don't know how to {arg}")
                sys.exit(1)

