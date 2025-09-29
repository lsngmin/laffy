create or replace function refresh_event_metrics_10m(entries jsonb)
returns void
language plpgsql
as $$
declare
  rec record;
begin
  if entries is null then
    return;
  end if;

  for rec in
    select
      (value ->> 'ts_bucket_10m')::timestamptz as ts_bucket_10m,
      nullif(value ->> 'event_name', '') as event_name,
      coalesce(value ->> 'slug', '') as slug
    from jsonb_array_elements(entries) as value
  loop
    if rec.ts_bucket_10m is null or rec.event_name is null then
      continue;
    end if;

    insert into event_metrics_10m (ts_bucket_10m, event_name, slug, visit_count, unique_sessions, last_ts)
    select
      rec.ts_bucket_10m,
      rec.event_name,
      rec.slug,
      count(*) as visit_count,
      count(distinct session_id) as unique_sessions,
      max(ts) as last_ts
    from events_raw
    where ts_bucket_10m = rec.ts_bucket_10m
      and event_name = rec.event_name
      and slug = rec.slug
    group by rec.ts_bucket_10m, rec.event_name, rec.slug
    on conflict (ts_bucket_10m, event_name, slug)
    do update
      set visit_count = excluded.visit_count,
          unique_sessions = excluded.unique_sessions,
          last_ts = greatest(event_metrics_10m.last_ts, excluded.last_ts);
  end loop;
end;
$$;
