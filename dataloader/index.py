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
from lunr import lunr

settings = 'settings.json'

rest_api_url = 'http://localhost:8486'

pid = os.getpid()

headers = {
    'Content-Type': 'application/json; charset=UTF-8',
}

def settings_to_dict(f_name):
    src = ''
    obj = {}
    with open(f_name) as fp:
        src = fp.read()
    if src:
        obj = json.loads(src)
    return obj


def rest_head(key_path):
    req = Request(url= f'{rest_api_url}{key_path}',
                  headers = headers,
                  method = 'HEAD')
    try:
        with urlopen(req) as resp:
            return resp, None
    except Exception as e:
        return None, f'{e} {key_path}'


def rest_get(key_path):
    req = Request(url= f'{rest_api_url}{key_path}',
                  headers = headers,
                  method = 'GET')
    err = None
    src = ''
    try:
        with urlopen(req) as resp:
            src = resp.read()
    except Exception as e:
        err = f'{e} {key_path}'
    if isinstance(src, bytes):
        src = src.decode('utf-8')
    return src, err

def index_funders(f_name= 'settings.json'):
    #FIXME: run rest request for keys then for records
    cfg = settings_to_dict(f_name)
    if 'base_url' in cfg:
        rest_api_url = cfg['base_url']

def normalize_group(obj):
    for key in [ 'cl_group_id', 'name', 'alternative', 'email', 'date', 'description', 'start',
            'approx_start', 'activity', 'end', 'approx_end', 'website', 'pi', 'prefix',
            'grid', 'isni', 'ringgold', 'viaf', 'ror', 'updated' ]:
        if not key in obj:
            obj[key] = '';
    return obj
    
def index_groups(f_name = 'settings.json'):
    cfg = settings_to_dict(f_name)
    if 'base_url' in cfg:
        rest_api_url = cfg['base_url']
    print(f'Contacting {rest_api_url}')
    src, err = rest_get(f'/api/groups')
    if err != None:
        print(err)
        sys.exit(1)
    keys = json.loads(src)
    tot = len(keys)
    documents = []
    bar = progressbar.ProgressBar(
            max_value = tot,
            widgets = [
                progressbar.Percentage(),
                ' ', progressbar.Counter(), f'/{tot}',
                ' ', progressbar.AdaptiveETA(),
                f' index_groups({f_name}) (pid:{pid})',
            ],
            redirect_stdout = True)
    bar.start()
    for i, key in enumerate(keys):
        src, err = rest_get(f'/api/groups/{key}')
        if err != None:
            print(err)
        ok = True
        try:
            obj = json.loads(src)
        except Exception as e:
            ok = False
            print(f'error ({key}): {e}')
        if ok:
            documents.append(normalize_group(obj))
        bar.update(i)
    bar.finish()
    print(f'writing groups index...')
    idx = lunr(
        ref = 'cl_group_id',
        fields = (
            'cl_group_id', 'name', 'alternative', 'email', 'date', 'description', 'start',
            'approx_start', 'activity', 'end', 'approx_end', 'website', 'pi', 'prefix',
            'grid', 'isni', 'ringgold', 'viaf', 'ror', 'updated'
        ),
        documents = documents
    )
    serialized_idx = idx.serialize()
    try:
        with open('groups_index.json', 'w') as fp:
            fp.write(json.dumps(serialized_idx))
    except Exception as e:
        print(f'Failed write groups index: {e}')
        sys.exit(1)
    

def index_people(f_name  = 'settings.json'):
    #FIXME: run rest request for keys then for records
    cfg = settings_to_dict(f_name)
    if 'base_url' in cfg:
        rest_api_url = cfg['base_url']

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

