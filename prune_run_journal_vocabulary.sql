delete from reports
  where _key in (
  select _key from reports
    where src->>'status' = 'completed' and src->>'report_name' = 'run_journal_vocabulary'
    order by updated desc
    limit 1000 offset 1);
