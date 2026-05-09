/*
  RPC: atomically replace a user's saved workout library.

  Why:
  - The client previously did a delete-first multi-step write. If any insert failed,
    the user's library could be partially written or appear wiped.
  - This function executes server-side in a single transaction.

  Contract:
  - Input: workouts jsonb array where each element has:
      {
        "id": string,          // legacy_client_id
        "title": string,
        "description"?: string,
        "warmUp": ExerciseDefinition[],
        "workout": ExerciseDefinition[],
        "coolDown": ExerciseDefinition[]
      }
  - Output: void (throws on any error, rolling back all changes).
*/

create or replace function public.replace_saved_workouts(workouts jsonb)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  uid uuid;
  w jsonb;
  template_id uuid;
  section_id uuid;
  ex jsonb;
  idx int;
begin
  uid := auth.uid();
  if uid is null then
    raise exception 'Not authenticated';
  end if;

  if workouts is null or jsonb_typeof(workouts) <> 'array' then
    raise exception 'workouts must be a JSON array';
  end if;

  -- Replace library atomically.
  delete from public.workout_templates where user_id = uid;

  for w in
    select value from jsonb_array_elements(workouts)
  loop
    insert into public.workout_templates (user_id, legacy_client_id, title, description)
    values (
      uid,
      nullif(trim(coalesce(w->>'id', '')), ''),
      coalesce(w->>'title', ''),
      nullif(trim(coalesce(w->>'description', '')), '')
    )
    returning id into template_id;

    -- Always create the 3 sections in a stable order.
    insert into public.workout_template_sections (template_id, section_type, sort_order)
    values (template_id, 'warm_up', 0)
    returning id into section_id;

    idx := 0;
    if jsonb_typeof(w->'warmUp') = 'array' then
      for ex in select value from jsonb_array_elements(w->'warmUp') loop
        insert into public.workout_template_exercises (section_id, sort_order, definition)
        values (section_id, idx, ex);
        idx := idx + 1;
      end loop;
    end if;

    insert into public.workout_template_sections (template_id, section_type, sort_order)
    values (template_id, 'workout', 1)
    returning id into section_id;

    idx := 0;
    if jsonb_typeof(w->'workout') = 'array' then
      for ex in select value from jsonb_array_elements(w->'workout') loop
        insert into public.workout_template_exercises (section_id, sort_order, definition)
        values (section_id, idx, ex);
        idx := idx + 1;
      end loop;
    end if;

    insert into public.workout_template_sections (template_id, section_type, sort_order)
    values (template_id, 'cool_down', 2)
    returning id into section_id;

    idx := 0;
    if jsonb_typeof(w->'coolDown') = 'array' then
      for ex in select value from jsonb_array_elements(w->'coolDown') loop
        insert into public.workout_template_exercises (section_id, sort_order, definition)
        values (section_id, idx, ex);
        idx := idx + 1;
      end loop;
    end if;
  end loop;
end;
$$;

revoke all on function public.replace_saved_workouts(jsonb) from public;
grant execute on function public.replace_saved_workouts(jsonb) to authenticated;

