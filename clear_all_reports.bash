#!/bin/bash

sqlite3 reports.ds/collection.db 'delete from reports';
rm htdocs/rpt/*.csv
