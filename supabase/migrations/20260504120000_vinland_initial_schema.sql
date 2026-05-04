/*
  Vinland — initial schema (Supabase Auth + normalized journal / templates / profiles).
*/

create extension if not exists "pgcrypto";

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  workouts_per_week integer not null default 3
    constraint profiles_workouts_per_week_range check (workouts_per_week >= 1 and workouts_per_week <= 7),
  activity_level text not null default 'active'
    constraint profiles_activity_level_check check (
      activity_level in ('inactive', 'active', 'extremely_active')
    ),
  daily_calorie_goal integer not null default 2200
    constraint profiles_daily_calorie_goal_range check (daily_calorie_goal >= 800 and daily_calorie_goal <= 20000),
  weight_goal_mode text
    constraint profiles_weight_goal_mode_check check (weight_goal_mode is null or weight_goal_mode in ('lose', 'gain')),
  baseline_weight_lb double precision,
  baseline_date date,
  cheat_meal_week_start_monday date,
  cheat_meal_used boolean not null default false,
  onboarding_complete boolean not null default false,
  onboarding_step integer not null default 0
    constraint profiles_onboarding_step_range check (onboarding_step >= 0 and onboarding_step <= 4),
  local_data_migrated_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id)
  values (new.id)
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create table public.workout_templates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  legacy_client_id text,
  title text not null,
  description text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint workout_templates_legacy_client_nonempty check (
    legacy_client_id is null or length(trim(legacy_client_id)) > 0
  ),
  constraint workout_templates_legacy_unique unique (user_id, legacy_client_id)
);

create index workout_templates_user_id_idx on public.workout_templates (user_id);

create trigger workout_templates_set_updated_at
  before update on public.workout_templates
  for each row execute function public.set_updated_at();

create table public.workout_template_sections (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references public.workout_templates (id) on delete cascade,
  section_type text not null
    constraint workout_template_sections_type_check check (
      section_type in ('warm_up', 'workout', 'cool_down')
    ),
  sort_order integer not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index workout_template_sections_template_id_idx on public.workout_template_sections (template_id);

create trigger workout_template_sections_set_updated_at
  before update on public.workout_template_sections
  for each row execute function public.set_updated_at();

create table public.workout_template_exercises (
  id uuid primary key default gen_random_uuid(),
  section_id uuid not null references public.workout_template_sections (id) on delete cascade,
  sort_order integer not null,
  definition jsonb not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index workout_template_exercises_section_id_idx on public.workout_template_exercises (section_id);

create trigger workout_template_exercises_set_updated_at
  before update on public.workout_template_exercises
  for each row execute function public.set_updated_at();

create table public.journal_days (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  journal_date date not null,
  weight_lb double precision,
  rest_day boolean not null default false,
  calorie_goal_hit boolean not null default false,
  calories_over integer,
  workout_started_at_ms bigint,
  workout_session_durations_seconds integer[],
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint journal_days_user_date_unique unique (user_id, journal_date)
);

create index journal_days_user_id_journal_date_idx on public.journal_days (user_id, journal_date desc);

create trigger journal_days_set_updated_at
  before update on public.journal_days
  for each row execute function public.set_updated_at();

create table public.journal_tasks (
  id uuid primary key default gen_random_uuid(),
  journal_day_id uuid not null references public.journal_days (id) on delete cascade,
  sort_order integer not null,
  name text not null,
  completed boolean not null default false,
  duration_seconds integer,
  is_scheduled_workout_root boolean not null default false,
  exercise jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index journal_tasks_journal_day_id_idx on public.journal_tasks (journal_day_id, sort_order);

create trigger journal_tasks_set_updated_at
  before update on public.journal_tasks
  for each row execute function public.set_updated_at();

alter table public.profiles enable row level security;
alter table public.workout_templates enable row level security;
alter table public.workout_template_sections enable row level security;
alter table public.workout_template_exercises enable row level security;
alter table public.journal_days enable row level security;
alter table public.journal_tasks enable row level security;

create policy profiles_select_own
  on public.profiles for select to authenticated
  using (id = auth.uid());

create policy profiles_update_own
  on public.profiles for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

create policy profiles_insert_own
  on public.profiles for insert to authenticated
  with check (id = auth.uid());

create policy workout_templates_select_own
  on public.workout_templates for select to authenticated
  using (user_id = auth.uid());

create policy workout_templates_insert_own
  on public.workout_templates for insert to authenticated
  with check (user_id = auth.uid());

create policy workout_templates_update_own
  on public.workout_templates for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy workout_templates_delete_own
  on public.workout_templates for delete to authenticated
  using (user_id = auth.uid());

create policy workout_template_sections_all_own
  on public.workout_template_sections for all to authenticated
  using (
    exists (
      select 1
      from public.workout_templates wt
      where wt.id = workout_template_sections.template_id
        and wt.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from public.workout_templates wt
      where wt.id = workout_template_sections.template_id
        and wt.user_id = auth.uid()
    )
  );

create policy workout_template_exercises_all_own
  on public.workout_template_exercises for all to authenticated
  using (
    exists (
      select 1
      from public.workout_template_sections s
      join public.workout_templates wt on wt.id = s.template_id
      where s.id = workout_template_exercises.section_id
        and wt.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from public.workout_template_sections s
      join public.workout_templates wt on wt.id = s.template_id
      where s.id = workout_template_exercises.section_id
        and wt.user_id = auth.uid()
    )
  );

create policy journal_days_select_own
  on public.journal_days for select to authenticated
  using (user_id = auth.uid());

create policy journal_days_insert_own
  on public.journal_days for insert to authenticated
  with check (user_id = auth.uid());

create policy journal_days_update_own
  on public.journal_days for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy journal_days_delete_own
  on public.journal_days for delete to authenticated
  using (user_id = auth.uid());

create policy journal_tasks_all_own
  on public.journal_tasks for all to authenticated
  using (
    exists (
      select 1
      from public.journal_days jd
      where jd.id = journal_tasks.journal_day_id
        and jd.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from public.journal_days jd
      where jd.id = journal_tasks.journal_day_id
        and jd.user_id = auth.uid()
    )
  );
