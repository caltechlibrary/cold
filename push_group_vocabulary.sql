---
--- Push group_volabulary request into reports system.
---
delete from reports where _key = 'group_vocabulary';
insert into reports (
    _key, src
) values (
    'group_vocabulary',
    '{ "id": "group_vocabulary", "content_type": "text/csv", "email": "", "link": "", "report_name": "people_vocabulary", "status": "requested", "requested": "2025-05-12T21:20:08Z", "updated": "2025-05-12T21:20:08Z" }'
);
