#!/usr/bin/env python3

#
# Loads the test data into MySQL database using **cold**.
#

import sys
import os
import json

from http import client

headers = {
    'Content-Type': 'application/json; charset=UTF-8',
}

def rest_head(key_path):
    conn = client.HTTPConnection('localhost', 8486)
    try:
        conn.request('HEAD', key_path)
        resp = conn.getresponse()
        conn.close()
        return resp, None
    except Exception as e:
        print(e)
        return None, e

def rest_put(key_path, obj):
    data = json.dumps(obj)
    try:
        conn = client.HTTPConnection('localhost', 8486)
        conn.request('PUT', key_path, body = data, headers = headers)
        resp = conn.getresponse()
        conn.close()
        return resp, None
    except Exception as e:
        return None, e

def rest_post(key_path, obj):
    data = json.dumps(obj)
    try:
        conn = client.HTTPConnection('localhost', 8486)
        conn.request('POST', key_path, body = data, headers = headers)
        resp = conn.getresponse()
        conn.close()
        return resp, None
    except Exception as e:
        return None, e

def rest_delete(key_path, obj):
    data = json.dumps(obj)
    try:
        conn = client.HTTPConnection('localhost', 8486)
        conn.request('DELETE', key_path, headers = headers)
        resp = conn.getresponse()
        conn.close()
        return resp, None
    except Exception as e:
        return None, e

def load_funders():
    with open('testdata/funders.json') as f:
        src = f.read()
        if not isinstance(src, bytes):
            src = src.encode('utf-8')

        try:
            funders = json.loads(src)
        except Exception as e:
            print(e)
            funders = []
        print(f'loading {len(funders)} funder records')
        for funder in funders:
            cl_funder_id = funder['cl_funder_id']
            key_path = f'/api/funder/{cl_funder_id}'
            resp, err = rest_head(key_path)
            if err != None:
                print(err)
            else:
                print(f'head {cl_funder_id} -> {resp.status}, {resp.reason}')
            if resp != None and resp.status == 200:
                resp, err = rest_post(key_path, funder)
                if err != None:
                    print(err)
                else:
                    print(f'post {cl_funder_id} -> {resp.status}, {resp.reason}')
            elif resp != None:
                resp, err = rest_put(key_path, funder)
                if err != None:
                    print(err)
                else:
                    print(f'put {cl_funder_id} -> {resp.status}, {resp.reason}')


def load_groups():
    with open('testdata/groups.json') as f:
        src = f.read()
        if not isinstance(src, bytes):
            src = src.encode('utf-8')

        try:
            groups = json.loads(src)
        except Exception as e:
            print(e)
            groups = []
        print(f'loading {len(groups)} group records')
        for group in groups:
            cl_group_id = group['key']
            key_path = f'/api/groups/{cl_group_id}'
            resp, err = rest_head(key_path)
            if err != None:
                print(err)
            else:
                print(f'head {cl_group_id} -> {resp.status}, {resp.reason}')
            if resp != None and resp.status == 200:
                resp, err = rest_post(key_path, group)
                if err != None:
                    print(err)
                else:
                    print(f'post {cl_group_id} -> {resp.status}, {resp.reason}')
            elif resp != None:
                resp, err = rest_put(key_path, group)
                if err != None:
                    print(err)
                else:
                    print(f'put {cl_group_id} -> {resp.status}, {resp.reason}')


def load_people():
    with open('testdata/people.json') as f:
        src = f.read()
        if not isinstance(src, bytes):
            src = src.encode('utf-8')

        try:
            people = json.loads(src)
        except Exception as e:
            print(e)
            people = []
        print(f'loading {len(people)} people records')
        for people in people:
            if 'cl_people_id' in people:
                cl_people_id = people['cl_people_id']
                key_path = f'/api/people/{cl_people_id}'
                resp, err = rest_head(key_path)
                if err != None:
                    print(err)
                else:
                    print(f'head {cl_people_id} -> {resp.status}, {resp.reason}')
                if resp != None and resp.status == 200:
                    resp, err = rest_post(key_path, people)
                    if err != None:
                        print(err)
                    else:
                        print(f'post {cl_people_id} -> {resp.status}, {resp.reason}')
                elif resp != None:
                    resp, err = rest_put(key_path, people)
                    if err != None:
                        print(err)
                    else:
                        print(f'put {cl_people_id} -> {resp.status}, {resp.reason}')
    
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

