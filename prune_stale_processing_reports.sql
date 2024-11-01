update reports set src = json_patch(src, json_object('status', 'error', 'updated', strftime('%FT%R:%fZ'))),
                   updated = strftime('%F %T')
  where src->>'status' = 'processing' and updated <= date('now', 'now', '-4 hours');
