#!/usr/bin/env python3

#
# Loads the test data into MySQL database using **cold**.
#

import json
from http import client

headers = {
    'Content-Type': 'application/json; charset=UTF-8',
}


def rest_head(key_path):
    conn = client.HTTPConnection('localhost', 8486)
    conn.request('HEAD', key_path, headers = headers)
    resp = conn.getresponse()
    conn.close()
    return resp

def rest_put(key_path, obj):
    data = json.dumps(obj)
    conn = client.HTTPConnection('localhost', 8486)
    conn.request('PUT', key_path, body = data, headers = headers)
    resp = conn.getresponse()
    conn.close()
    return resp

def rest_post(key_path, obj):
    data = json.dumps(obj)
    conn = client.HTTPConnection('localhost', 8486)
    conn.request('POST', key_path, body = data, headers = headers)
    resp = conn.getresponse()
    conn.close()
    return resp

def rest_delete(key_path):
    conn = client.HTTPConnection('localhost', 8486)
    conn.request('DELETE', key_path, headers = headers)
    resp = conn.getresponse()
    conn.close()
    return resp

def unload_funders():
    with open('testdata/funders.json') as f:
        src = f.read()
        if not isinstance(src, bytes):
            src = src.encode('utf-8')
        try:
            funders = json.loads(src)
        except Exception as e:
            print(f'JSON encode error: {e}')
            funders = []
        print(f'loading {len(funders)} funder records')
        #funders = funders[0:1] # DEBUG
        for funder in funders:
            cl_funder_id = funder['cl_funder_id']
            print(f'unloading funder {cl_funder_id}')
            key_path = f'/api/funder/{cl_funder_id}'
            resp = rest_head(key_path)
            print(f'head {cl_funder_id} -> {resp.status}, {resp.reason}')
            if resp.status == 200:
                resp = rest_delete(key_path)
                print(f'delete {cl_funder_id} -> {resp.status}, {resp.reason}')


if __name__ == '__main__':
    unload_funders()
