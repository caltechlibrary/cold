People
======

**cold** supports JSON api call to `/api/people` which returns
a JavaScript array expressed as JSON of a list of "cl_people_id"
managed by **cold**. 

```
    curl http://localhost:8486/api/people
```

Returns something like

```
    [
        "Doiel-R-S",
        ...
    ]
```

If you point your web browser at `/people` then get an HTML
list of people id linked to the detail of the people object.

