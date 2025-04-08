update reports set src = json_patch(src, json_object('status', 'error', 'link', 'error://failed to process', 'updated', strftime('%FT%R:%fZ'))),
                   updated = strftime('%F %T')
  where src->>'status' = 'processing' and updated <= datetime('now', '-1 minutes');
