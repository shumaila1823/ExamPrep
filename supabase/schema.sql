-- =====================================================================
-- ExamPrep Global - Supabase schema, functions and Row Level Security
--
-- HOW TO RUN: Supabase Dashboard -> SQL Editor -> New query -> paste this
-- whole file -> Run. Then run supabase/seed.sql for sample data.
-- The file is safe to re-run (it uses IF NOT EXISTS / DROP POLICY IF EXISTS).
--
-- SECURITY MODEL (summary)
--  * Students can only read their own profile, attempts, answers, results.
--  * Correct answers live in a separate table (question_answers) that
--    students cannot read at all. Grading happens inside the database
--    (submit_attempt), and correct answers are only returned by
--    get_attempt_review AFTER the attempt has been submitted.
--  * Students cannot insert/update attempts, answers or results directly;
--    only the SECURITY DEFINER functions below can.
--  * Only users whose profiles.role = 'admin' can manage exam content.
--    The role can only be changed from the SQL editor (never from the app).
-- =====================================================================

-- ---------------------------------------------------------------------
-- 0. Shared helpers
-- ---------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------
-- 1. profiles (one row per auth user; NO passwords are stored here -
--    Supabase Auth stores only salted password hashes in auth.users)
-- ---------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null default '' check (char_length(full_name) <= 100),
  country text check (country is null or char_length(country) <= 80),
  email text,
  role text not null default 'student' check (role in ('student', 'teacher', 'admin')),
  teacher_requested boolean not null default false,
  show_on_leaderboard boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_profiles_updated on public.profiles;
create trigger trg_profiles_updated
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- Upgrade for databases created before the teacher role existed (safe to re-run).
alter table public.profiles add column if not exists email text;
alter table public.profiles add column if not exists teacher_requested boolean not null default false;
alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles add constraint profiles_role_check
  check (role in ('student', 'teacher', 'admin'));
update public.profiles p set email = u.email
  from auth.users u where u.id = p.id and p.email is null;

-- Roles can only be changed by the SQL editor / service role (auth.uid() is null)
-- or by an administrator through admin_set_user_role(), which sets a local flag.
create or replace function public.protect_profile_role()
returns trigger
language plpgsql
as $$
begin
  if auth.uid() is not null and coalesce(current_setting('app.role_change', true), '') <> 'on' then
    if new.role is distinct from old.role then
      raise exception 'Only an administrator can change roles.'
        using errcode = '42501';
    end if;
    new.email := old.email;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_profiles_protect_role on public.profiles;
create trigger trg_profiles_protect_role
  before update on public.profiles
  for each row execute function public.protect_profile_role();

-- Admin check used by every admin policy (SECURITY DEFINER avoids RLS recursion).
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'admin'
  );
$$;

-- Create a profile automatically whenever someone registers.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, country, teacher_requested)
  values (
    new.id,
    new.email,
    left(coalesce(nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''), split_part(new.email, '@', 1)), 100),
    left(nullif(trim(new.raw_user_meta_data ->> 'country'), ''), 80),
    coalesce(new.raw_user_meta_data ->> 'requested_role', '') = 'teacher'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------
-- 2. categories and subjects
-- ---------------------------------------------------------------------
create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique check (char_length(name) between 2 and 120),
  slug text not null unique,
  description text,
  icon text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.subjects (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.categories (id) on delete cascade,
  name text not null check (char_length(name) between 2 and 120),
  slug text not null unique,
  description text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  unique (category_id, name)
);
create index if not exists idx_subjects_category on public.subjects (category_id);

-- ---------------------------------------------------------------------
-- 3. exams
-- ---------------------------------------------------------------------
create table if not exists public.exams (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.categories (id) on delete restrict,
  subject_id uuid references public.subjects (id) on delete set null,
  title text not null check (char_length(title) between 3 and 200),
  description text check (description is null or char_length(description) <= 1000),
  exam_type text not null default 'quiz'
    check (exam_type in ('full_mock', 'subject', 'topic', 'quiz')),
  duration_minutes integer not null default 30 check (duration_minutes between 1 and 360),
  total_marks integer not null default 100 check (total_marks > 0),
  passing_percentage numeric(5, 2)
    check (passing_percentage is null or (passing_percentage >= 0 and passing_percentage <= 100)),
  question_count integer not null default 0,
  is_published boolean not null default false,
  is_featured boolean not null default false,
  created_by uuid default auth.uid() references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_exams_category on public.exams (category_id);
create index if not exists idx_exams_subject on public.exams (subject_id);
create index if not exists idx_exams_published on public.exams (is_published);

drop trigger if exists trg_exams_updated on public.exams;
create trigger trg_exams_updated
  before update on public.exams
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- 4. questions, options and (secret) answers
-- ---------------------------------------------------------------------
create table if not exists public.questions (
  id uuid primary key default gen_random_uuid(),
  exam_id uuid not null references public.exams (id) on delete cascade,
  sort_order integer not null default 1,
  question_text text not null check (char_length(question_text) between 1 and 2000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_questions_exam on public.questions (exam_id, sort_order);

drop trigger if exists trg_questions_updated on public.questions;
create trigger trg_questions_updated
  before update on public.questions
  for each row execute function public.set_updated_at();

create table if not exists public.options (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.questions (id) on delete cascade,
  sort_order smallint not null check (sort_order between 1 and 4),
  option_text text not null check (char_length(option_text) between 1 and 500),
  created_at timestamptz not null default now(),
  unique (question_id, sort_order),
  unique (id, question_id)
);

-- Correct answer + explanation. Students have NO read access to this table.
create table if not exists public.question_answers (
  question_id uuid primary key references public.questions (id) on delete cascade,
  correct_option_id uuid not null,
  explanation text check (explanation is null or char_length(explanation) <= 2000),
  created_at timestamptz not null default now(),
  -- the correct option must belong to the same question
  foreign key (correct_option_id, question_id)
    references public.options (id, question_id) on delete cascade
);

-- Keep exams.question_count in sync (so public pages can show it without
-- needing access to the questions table).
create or replace function public.refresh_exam_question_count()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_exam uuid;
begin
  if tg_op = 'DELETE' then
    v_exam := old.exam_id;
  else
    v_exam := new.exam_id;
  end if;
  update public.exams
     set question_count = (select count(*) from public.questions where exam_id = v_exam)
   where id = v_exam;
  return null;
end;
$$;

drop trigger if exists trg_questions_count on public.questions;
create trigger trg_questions_count
  after insert or delete on public.questions
  for each row execute function public.refresh_exam_question_count();

-- ---------------------------------------------------------------------
-- 5. attempts, student answers, results
-- ---------------------------------------------------------------------
create table if not exists public.exam_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  exam_id uuid not null references public.exams (id) on delete restrict,
  status text not null default 'in_progress'
    check (status in ('in_progress', 'submitted', 'expired')),
  duration_minutes integer not null,
  started_at timestamptz not null default now(),
  submitted_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists idx_attempts_user on public.exam_attempts (user_id, status);
create index if not exists idx_attempts_exam on public.exam_attempts (exam_id);

create table if not exists public.student_answers (
  id uuid primary key default gen_random_uuid(),
  attempt_id uuid not null references public.exam_attempts (id) on delete cascade,
  question_id uuid not null references public.questions (id) on delete cascade,
  selected_option_id uuid references public.options (id) on delete set null,
  is_correct boolean not null default false,
  created_at timestamptz not null default now(),
  unique (attempt_id, question_id)
);
create index if not exists idx_student_answers_attempt on public.student_answers (attempt_id);

create table if not exists public.results (
  id uuid primary key default gen_random_uuid(),
  attempt_id uuid not null unique references public.exam_attempts (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  exam_id uuid not null references public.exams (id) on delete restrict,
  total_questions integer not null,
  correct_answers integer not null,
  incorrect_answers integer not null,
  unanswered integer not null,
  obtained_marks numeric(8, 2) not null,
  total_marks numeric(8, 2) not null,
  percentage numeric(5, 2) not null,
  passed boolean,
  time_taken_seconds integer not null,
  created_at timestamptz not null default now()
);
create index if not exists idx_results_user on public.results (user_id, created_at desc);
create index if not exists idx_results_exam on public.results (exam_id);

-- ---------------------------------------------------------------------
-- 6. free resources and contact messages
-- ---------------------------------------------------------------------
create table if not exists public.resources (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 2 and 160),
  description text check (description is null or char_length(description) <= 500),
  url text not null check (url ~* '^https?://'),
  category_id uuid references public.categories (id) on delete set null,
  is_published boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.contact_messages (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 120),
  email text not null check (email ~* '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' and char_length(email) <= 200),
  subject text check (subject is null or char_length(subject) <= 200),
  message text not null check (char_length(message) between 5 and 4000),
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- 6b. Role helpers (teachers manage only the exams they created)
-- ---------------------------------------------------------------------
create or replace function public.is_teacher()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'teacher'
  );
$$;

create or replace function public.owns_exam(p_exam uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_teacher() and exists (
    select 1 from public.exams e
    where e.id = p_exam and e.created_by = auth.uid()
  );
$$;

create or replace function public.owns_question(p_question uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_teacher() and exists (
    select 1 from public.questions q
    join public.exams e on e.id = q.exam_id
    where q.id = p_question and e.created_by = auth.uid()
  );
$$;

-- Only administrators may feature exams on the homepage.
create or replace function public.protect_exam_featured()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is not null and not public.is_admin() then
    if tg_op = 'INSERT' then
      new.is_featured := false;
    else
      new.is_featured := old.is_featured;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_exams_protect_featured on public.exams;
create trigger trg_exams_protect_featured
  before insert or update on public.exams
  for each row execute function public.protect_exam_featured();

-- ---------------------------------------------------------------------
-- 7. Row Level Security
-- ---------------------------------------------------------------------
alter table public.profiles          enable row level security;
alter table public.categories        enable row level security;
alter table public.subjects          enable row level security;
alter table public.exams             enable row level security;
alter table public.questions         enable row level security;
alter table public.options           enable row level security;
alter table public.question_answers  enable row level security;
alter table public.exam_attempts     enable row level security;
alter table public.student_answers   enable row level security;
alter table public.results           enable row level security;
alter table public.resources         enable row level security;
alter table public.contact_messages  enable row level security;

-- profiles ------------------------------------------------------------
drop policy if exists "profiles_select_own_or_admin" on public.profiles;
create policy "profiles_select_own_or_admin" on public.profiles
  for select to authenticated
  using (id = auth.uid() or public.is_admin());

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own" on public.profiles
  for insert to authenticated
  with check (id = auth.uid() and role = 'student');

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- categories / subjects (public read, admin write) ---------------------
drop policy if exists "categories_public_read" on public.categories;
create policy "categories_public_read" on public.categories
  for select to anon, authenticated using (true);
drop policy if exists "categories_admin_write" on public.categories;
create policy "categories_admin_write" on public.categories
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "subjects_public_read" on public.subjects;
create policy "subjects_public_read" on public.subjects
  for select to anon, authenticated using (true);
drop policy if exists "subjects_admin_write" on public.subjects;
create policy "subjects_admin_write" on public.subjects
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- exams (published exams are public; admins see/manage everything) -----
drop policy if exists "exams_public_read_published" on public.exams;
create policy "exams_public_read_published" on public.exams
  for select to anon, authenticated
  using (is_published = true or public.is_admin() or created_by = auth.uid());
drop policy if exists "exams_admin_write" on public.exams;
create policy "exams_admin_write" on public.exams
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "exams_teacher_insert" on public.exams;
create policy "exams_teacher_insert" on public.exams
  for insert to authenticated
  with check (public.is_teacher() and created_by = auth.uid());
drop policy if exists "exams_teacher_update" on public.exams;
create policy "exams_teacher_update" on public.exams
  for update to authenticated
  using (public.is_teacher() and created_by = auth.uid())
  with check (public.is_teacher() and created_by = auth.uid());
drop policy if exists "exams_teacher_delete" on public.exams;
create policy "exams_teacher_delete" on public.exams
  for delete to authenticated
  using (public.is_teacher() and created_by = auth.uid());

-- questions + options (visible only for published exams, and only to
-- logged-in users; they contain NO answers) ----------------------------
drop policy if exists "questions_read_published" on public.questions;
create policy "questions_read_published" on public.questions
  for select to authenticated
  using (
    public.is_admin()
    or public.owns_exam(exam_id)
    or exists (select 1 from public.exams e where e.id = questions.exam_id and e.is_published)
  );
drop policy if exists "questions_admin_write" on public.questions;
create policy "questions_admin_write" on public.questions
  for all to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists "questions_teacher_write" on public.questions;
create policy "questions_teacher_write" on public.questions
  for all to authenticated
  using (public.owns_exam(exam_id)) with check (public.owns_exam(exam_id));

drop policy if exists "options_read_published" on public.options;
create policy "options_read_published" on public.options
  for select to authenticated
  using (
    public.is_admin()
    or public.owns_question(question_id)
    or exists (
      select 1
      from public.questions q
      join public.exams e on e.id = q.exam_id
      where q.id = options.question_id and e.is_published
    )
  );
drop policy if exists "options_admin_write" on public.options;
create policy "options_admin_write" on public.options
  for all to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists "options_teacher_write" on public.options;
create policy "options_teacher_write" on public.options
  for all to authenticated
  using (public.owns_question(question_id)) with check (public.owns_question(question_id));

-- question_answers: admins + the teacher who owns the exam (students never) -
drop policy if exists "question_answers_admin_only" on public.question_answers;
create policy "question_answers_admin_only" on public.question_answers
  for all to authenticated using (public.is_admin()) with check (public.is_admin());
-- teachers can read/write the answers of THEIR OWN exams only
drop policy if exists "question_answers_teacher_own" on public.question_answers;
create policy "question_answers_teacher_own" on public.question_answers
  for all to authenticated
  using (public.owns_question(question_id)) with check (public.owns_question(question_id));

-- attempts / answers / results: owner can read; nobody writes directly --
drop policy if exists "attempts_select_own" on public.exam_attempts;
create policy "attempts_select_own" on public.exam_attempts
  for select to authenticated
  using (user_id = auth.uid() or public.is_admin());

drop policy if exists "student_answers_select_own" on public.student_answers;
create policy "student_answers_select_own" on public.student_answers
  for select to authenticated
  using (
    public.is_admin()
    or exists (
      select 1 from public.exam_attempts a
      where a.id = student_answers.attempt_id and a.user_id = auth.uid()
    )
  );

drop policy if exists "results_select_own" on public.results;
create policy "results_select_own" on public.results
  for select to authenticated
  using (user_id = auth.uid() or public.is_admin());

-- resources -------------------------------------------------------------
drop policy if exists "resources_public_read" on public.resources;
create policy "resources_public_read" on public.resources
  for select to anon, authenticated
  using (is_published = true or public.is_admin());
drop policy if exists "resources_admin_write" on public.resources;
create policy "resources_admin_write" on public.resources
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- contact messages: anyone can send, only admins can read/delete --------
drop policy if exists "contact_insert_anyone" on public.contact_messages;
create policy "contact_insert_anyone" on public.contact_messages
  for insert to anon, authenticated with check (true);
drop policy if exists "contact_admin_read" on public.contact_messages;
create policy "contact_admin_read" on public.contact_messages
  for select to authenticated using (public.is_admin());
drop policy if exists "contact_admin_delete" on public.contact_messages;
create policy "contact_admin_delete" on public.contact_messages
  for delete to authenticated using (public.is_admin());

-- ---------------------------------------------------------------------
-- 8. Table privileges (RLS above still decides which ROWS are allowed)
-- ---------------------------------------------------------------------
grant usage on schema public to anon, authenticated;

grant select on public.categories, public.subjects, public.exams, public.resources to anon;
grant insert on public.contact_messages to anon;

grant select on public.categories, public.subjects, public.exams, public.resources,
                public.questions, public.options, public.question_answers,
                public.exam_attempts, public.student_answers, public.results,
                public.profiles to authenticated;
grant insert, update on public.profiles to authenticated;
grant insert, update, delete on public.categories, public.subjects, public.exams,
                public.questions, public.options, public.question_answers,
                public.resources to authenticated;
grant insert on public.contact_messages to authenticated;
grant select, delete on public.contact_messages to authenticated;

-- ---------------------------------------------------------------------
-- 9. Server-side functions (exam engine)
-- ---------------------------------------------------------------------

-- 9.1 Start (or resume) an attempt ------------------------------------
create or replace function public.start_attempt(p_exam_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_exam public.exams;
  v_attempt public.exam_attempts;
begin
  if v_uid is null then
    raise exception 'Please log in to attempt an exam.' using errcode = '28000';
  end if;

  select * into v_exam from public.exams where id = p_exam_id and is_published = true;
  if not found then
    raise exception 'This exam does not exist or is not published.';
  end if;
  if v_exam.question_count = 0 then
    raise exception 'This exam has no questions yet.';
  end if;

  -- close attempts whose time ran out without being submitted
  update public.exam_attempts
     set status = 'expired'
   where user_id = v_uid
     and status = 'in_progress'
     and started_at + make_interval(mins => duration_minutes) < now();

  -- resume a still-running attempt for this exam, otherwise start a new one
  select * into v_attempt
    from public.exam_attempts
   where user_id = v_uid and exam_id = p_exam_id and status = 'in_progress'
   order by started_at desc
   limit 1;

  if not found then
    insert into public.exam_attempts (user_id, exam_id, duration_minutes)
    values (v_uid, p_exam_id, v_exam.duration_minutes)
    returning * into v_attempt;
  end if;

  return jsonb_build_object(
    'id', v_attempt.id,
    'exam_id', v_attempt.exam_id,
    'status', v_attempt.status,
    'duration_minutes', v_attempt.duration_minutes,
    'started_at', v_attempt.started_at,
    'server_now', clock_timestamp()
  );
end;
$$;

-- 9.2 Submit and grade an attempt -------------------------------------
-- p_answers is a JSON object: { "<question_id>": "<selected_option_id>", ... }
create or replace function public.submit_attempt(p_attempt_id uuid, p_answers jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_attempt public.exam_attempts;
  v_exam public.exams;
  v_result public.results;
  v_total integer;
  v_correct integer;
  v_unanswered integer;
  v_incorrect integer;
  v_pct numeric;
  v_obtained numeric;
  v_passed boolean;
  v_elapsed integer;
  v_answers jsonb := coalesce(p_answers, '{}'::jsonb);
begin
  if v_uid is null then
    raise exception 'Please log in to submit an exam.' using errcode = '28000';
  end if;

  select * into v_attempt
    from public.exam_attempts
   where id = p_attempt_id and user_id = v_uid
   for update;
  if not found then
    raise exception 'Attempt not found.';
  end if;

  -- idempotent: submitting twice just returns the stored result
  if v_attempt.status = 'submitted' then
    select * into v_result from public.results where attempt_id = v_attempt.id;
    return to_jsonb(v_result);
  end if;
  if v_attempt.status <> 'in_progress' then
    raise exception 'This attempt has expired and can no longer be submitted.';
  end if;

  v_elapsed := greatest(0, floor(extract(epoch from (clock_timestamp() - v_attempt.started_at)))::integer);
  -- 2 minutes of grace for slow connections; beyond that the attempt is void
  if v_elapsed > v_attempt.duration_minutes * 60 + 120 then
    raise exception 'The time limit has passed, so this attempt can no longer be submitted.';
  end if;

  if jsonb_typeof(v_answers) <> 'object' then
    v_answers := '{}'::jsonb;
  end if;

  select * into v_exam from public.exams where id = v_attempt.exam_id;

  -- one row per question; an answer only counts if the option belongs to it
  insert into public.student_answers (attempt_id, question_id, selected_option_id, is_correct)
  select v_attempt.id,
         q.id,
         o.id,
         (o.id is not null and o.id = qa.correct_option_id)
    from public.questions q
    left join public.question_answers qa on qa.question_id = q.id
    left join public.options o
           on o.question_id = q.id
          and o.id::text = (v_answers ->> (q.id::text))
   where q.exam_id = v_attempt.exam_id
  on conflict (attempt_id, question_id) do nothing;

  select count(*),
         count(*) filter (where selected_option_id is not null and is_correct),
         count(*) filter (where selected_option_id is null)
    into v_total, v_correct, v_unanswered
    from public.student_answers
   where attempt_id = v_attempt.id;

  if v_total = 0 then
    raise exception 'This exam has no questions.';
  end if;

  v_incorrect := v_total - v_correct - v_unanswered;
  v_pct := round(100.0 * v_correct / v_total, 2);
  v_obtained := round(v_exam.total_marks::numeric * v_correct / v_total, 2);
  v_passed := case
                when v_exam.passing_percentage is null then null
                else v_pct >= v_exam.passing_percentage
              end;

  insert into public.results (
    attempt_id, user_id, exam_id, total_questions, correct_answers,
    incorrect_answers, unanswered, obtained_marks, total_marks,
    percentage, passed, time_taken_seconds
  )
  values (
    v_attempt.id, v_uid, v_attempt.exam_id, v_total, v_correct,
    v_incorrect, v_unanswered, v_obtained, v_exam.total_marks,
    v_pct, v_passed, least(v_elapsed, v_attempt.duration_minutes * 60)
  )
  returning * into v_result;

  update public.exam_attempts
     set status = 'submitted', submitted_at = now()
   where id = v_attempt.id;

  return to_jsonb(v_result);
end;
$$;

-- 9.3 Review a SUBMITTED attempt (the only place correct answers are revealed)
create or replace function public.get_attempt_review(p_attempt_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_attempt public.exam_attempts;
  v_result public.results;
  v_exam public.exams;
begin
  if v_uid is null then
    raise exception 'Please log in to view results.' using errcode = '28000';
  end if;

  select * into v_attempt from public.exam_attempts where id = p_attempt_id;
  if not found or (v_attempt.user_id <> v_uid and not public.is_admin()) then
    raise exception 'Result not found.';
  end if;
  if v_attempt.status <> 'submitted' then
    raise exception 'Answers are revealed only after you submit the exam.';
  end if;

  select * into v_result from public.results where attempt_id = v_attempt.id;
  select * into v_exam from public.exams where id = v_attempt.exam_id;

  return jsonb_build_object(
    'result', to_jsonb(v_result),
    'exam', jsonb_build_object(
      'id', v_exam.id,
      'title', v_exam.title,
      'exam_type', v_exam.exam_type,
      'duration_minutes', v_exam.duration_minutes,
      'passing_percentage', v_exam.passing_percentage
    ),
    'questions', coalesce((
      select jsonb_agg(
               jsonb_build_object(
                 'id', q.id,
                 'sort_order', q.sort_order,
                 'question_text', q.question_text,
                 'options', (
                   select coalesce(
                            jsonb_agg(
                              jsonb_build_object('id', o.id, 'sort_order', o.sort_order, 'option_text', o.option_text)
                              order by o.sort_order
                            ), '[]'::jsonb)
                     from public.options o
                    where o.question_id = q.id
                 ),
                 'selected_option_id', sa.selected_option_id,
                 'correct_option_id', qa.correct_option_id,
                 'is_correct', sa.is_correct,
                 'explanation', qa.explanation
               )
               order by q.sort_order, q.created_at
             )
        from public.questions q
        join public.student_answers sa on sa.question_id = q.id and sa.attempt_id = v_attempt.id
        left join public.question_answers qa on qa.question_id = q.id
       where q.exam_id = v_attempt.exam_id
    ), '[]'::jsonb)
  );
end;
$$;

-- 9.4 Admin: create/update a question with its 4 options + answer atomically
-- p_question = { id?, exam_id, question_text, options: [4 strings],
--                correct_index: 0-3, explanation? }
create or replace function public.admin_upsert_question(p_question jsonb)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_exam uuid;
  v_text text;
  v_opts jsonb;
  v_correct integer;
  v_sort integer;
  v_correct_opt uuid;
  i integer;
begin
  v_exam := (p_question ->> 'exam_id')::uuid;
  if not (public.is_admin() or public.owns_exam(v_exam)) then
    raise exception 'You do not have permission to edit this exam.' using errcode = '42501';
  end if;

  v_text := nullif(trim(p_question ->> 'question_text'), '');
  v_opts := p_question -> 'options';
  v_correct := (p_question ->> 'correct_index')::integer;

  if v_exam is null or not exists (select 1 from public.exams where id = v_exam) then
    raise exception 'Exam not found.';
  end if;
  if v_text is null then
    raise exception 'The question text is required.';
  end if;
  if v_opts is null or jsonb_typeof(v_opts) <> 'array' or jsonb_array_length(v_opts) <> 4 then
    raise exception 'Exactly four answer options are required.';
  end if;
  if v_correct is null or v_correct < 0 or v_correct > 3 then
    raise exception 'Choose which option is the correct answer.';
  end if;
  for i in 0..3 loop
    if nullif(trim(v_opts ->> i), '') is null then
      raise exception 'All four answer options must be filled in.';
    end if;
  end loop;

  if nullif(p_question ->> 'id', '') is null then
    select coalesce(max(sort_order), 0) + 1 into v_sort from public.questions where exam_id = v_exam;
    insert into public.questions (exam_id, sort_order, question_text)
    values (v_exam, v_sort, v_text)
    returning id into v_id;
  else
    v_id := (p_question ->> 'id')::uuid;
    update public.questions
       set question_text = v_text
     where id = v_id and exam_id = v_exam;
    if not found then
      raise exception 'Question not found.';
    end if;
  end if;

  for i in 0..3 loop
    insert into public.options (question_id, sort_order, option_text)
    values (v_id, i + 1, trim(v_opts ->> i))
    on conflict (question_id, sort_order) do update set option_text = excluded.option_text;
  end loop;

  select id into v_correct_opt
    from public.options
   where question_id = v_id and sort_order = v_correct + 1;

  insert into public.question_answers (question_id, correct_option_id, explanation)
  values (v_id, v_correct_opt, nullif(trim(coalesce(p_question ->> 'explanation', '')), ''))
  on conflict (question_id) do update
    set correct_option_id = excluded.correct_option_id,
        explanation = excluded.explanation;

  return v_id;
end;
$$;

-- 9.5 Public platform statistics (counts only, no personal data) -------
create or replace function public.get_platform_stats()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'exams', (select count(*) from public.exams where is_published),
    'questions', (
      select count(*) from public.questions q
      join public.exams e on e.id = q.exam_id
      where e.is_published
    ),
    'students', (select count(*) from public.profiles where role = 'student'),
    'attempts', (select count(*) from public.results)
  );
$$;

-- 9.6 Leaderboard (first name + last initial only; users can opt out) --
create or replace function public.get_leaderboard(p_days integer default null, p_limit integer default 50)
returns table (
  rank_no bigint,
  display_name text,
  country text,
  tests_taken bigint,
  average_percentage numeric,
  best_percentage numeric
)
language sql
stable
security definer
set search_path = public
as $$
  with agg as (
    select r.user_id,
           count(*) as tests,
           round(avg(r.percentage), 2) as avg_pct,
           max(r.percentage) as best_pct
      from public.results r
     where p_days is null or r.created_at >= now() - make_interval(days => p_days)
     group by r.user_id
  )
  select row_number() over (order by a.avg_pct desc, a.tests desc, a.best_pct desc) as rank_no,
         case
           when strpos(trim(p.full_name), ' ') > 0
             then split_part(trim(p.full_name), ' ', 1) || ' '
                  || upper(left(regexp_replace(trim(p.full_name), '^.*\s', ''), 1)) || '.'
           else coalesce(nullif(trim(p.full_name), ''), 'Student')
         end as display_name,
         p.country,
         a.tests,
         a.avg_pct,
         a.best_pct
    from agg a
    join public.profiles p on p.id = a.user_id
   where p.show_on_leaderboard
   order by 1
   limit least(greatest(coalesce(p_limit, 50), 1), 100);
$$;

-- 9.6b Admin: change a user's role (approve teachers) -----------------
create or replace function public.admin_set_user_role(p_user uuid, p_role text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Administrator access required.' using errcode = '42501';
  end if;
  if p_role not in ('student', 'teacher', 'admin') then
    raise exception 'Invalid role.';
  end if;
  if p_user = auth.uid() then
    raise exception 'You cannot change your own role.';
  end if;
  perform set_config('app.role_change', 'on', true);
  update public.profiles
     set role = p_role, teacher_requested = false
   where id = p_user;
  if not found then
    raise exception 'User not found.';
  end if;
end;
$$;

-- 9.7 Function permissions --------------------------------------------
revoke all on function public.start_attempt(uuid) from public, anon;
revoke all on function public.submit_attempt(uuid, jsonb) from public, anon;
revoke all on function public.get_attempt_review(uuid) from public, anon;
revoke all on function public.admin_upsert_question(jsonb) from public, anon;
grant execute on function public.start_attempt(uuid) to authenticated;
grant execute on function public.submit_attempt(uuid, jsonb) to authenticated;
grant execute on function public.get_attempt_review(uuid) to authenticated;
grant execute on function public.admin_upsert_question(jsonb) to authenticated;
revoke all on function public.admin_set_user_role(uuid, text) from public, anon;
grant execute on function public.admin_set_user_role(uuid, text) to authenticated;

revoke all on function public.get_platform_stats() from public;
revoke all on function public.get_leaderboard(integer, integer) from public;
grant execute on function public.get_platform_stats() to anon, authenticated;
grant execute on function public.get_leaderboard(integer, integer) to anon, authenticated;

-- =====================================================================
-- To make yourself an administrator (run AFTER you have registered):
--   update public.profiles set role = 'admin'
--   where id = (select id from auth.users where email = 'you@example.com');
-- =====================================================================
