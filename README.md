# ExamPrep Global

**One Platform. Every Exam. Endless Possibilities.**

A free, all-in-one online examination preparation platform. Students register, log in and practise timed MCQ tests across academic, competitive, job-recruitment, admission and international exams. Administrators manage exams and questions from a secure admin panel.

**Stack:** React 18 + Vite · React Router · Supabase (Auth + Postgres + Row Level Security) · Recharts · Lucide icons · deployable on Vercel.

## Features

- Home page, Explore (searchable/expandable category tree, filters), Practice, About, Contact, free resources, leaderboard
- Supabase email/password auth: register, login, logout, forgot/reset password, validation, protected routes
- Student dashboard: totals, average/highest score, charts, subject-wise performance, continue preparation, recommendations, history, profile settings
- Exam engine: 4-option MCQs, countdown timer (server-clock based), auto-submit, question navigator, mark for review, progress bar, confirmation before submit, resume after refresh
- Automatic grading **on the server**; result page with score ring, pass/fail, per-question review, explanations, time taken, retake
- Admin panel: exams, questions, categories/subjects, resources, contact messages, publish/unpublish
- Mobile, tablet and desktop responsive; loading, error and empty states; toast notifications

## Security model

- Only the public **anon** key is used in the browser. **Never** put the `service_role` key in this project.
- Correct answers live in the `question_answers` table which students cannot read. Grading happens inside the database (`submit_attempt`), and answers are revealed only by `get_attempt_review` **after** submission.
- Students cannot insert or update attempts, answers or results directly (no write policies, only the SECURITY DEFINER functions).
- Admin access is role based (`profiles.role = 'admin'`). A trigger blocks role changes from the app; you promote an admin from the Supabase SQL editor.
- Passwords are handled entirely by Supabase Auth (salted hashes). No passwords are stored in your tables or code.

## Folder structure

```
examprep-global/
├── index.html
├── package.json
├── vite.config.js
├── vercel.json              # SPA rewrite so deep links work on Vercel
├── .env.example             # copy to .env
├── .gitignore               # excludes .env files and node_modules
├── public/favicon.svg
├── supabase/
│   ├── schema.sql           # tables, RLS policies, exam-engine functions
│   └── seed.sql             # categories, subjects, 8 sample exams (66 MCQs), resources
└── src/
    ├── main.jsx, App.jsx    # providers + routes
    ├── supabase/client.js   # Supabase configuration (env variables)
    ├── context/             # AuthContext, ToastContext
    ├── hooks/               # useAsync, useCountdown, useDebounce, useCountUp
    ├── services/            # examService, attemptService, profileService, adminService
    ├── layouts/             # MainLayout, DashboardLayout, AdminLayout, SidebarLayout
    ├── components/          # common, auth, layout, exams, exam, dashboard, routes
    ├── pages/               # public + student pages; pages/admin/* for the admin panel
    ├── styles/              # global.css, components.css, pages.css
    └── utils/               # constants, format, validators, errors, stats, categoryIcons
```

## 1. Run locally in VS Code

1. Install **Node.js 18 or newer** from https://nodejs.org and **VS Code** from https://code.visualstudio.com.
2. Open the project folder in VS Code (`File → Open Folder`), then open the terminal (`Terminal → New Terminal`).
3. Install dependencies:
   ```bash
   npm install
   ```
4. Create your environment file (after step 2 below gives you the values):
   ```bash
   cp .env.example .env        # Windows PowerShell: copy .env.example .env
   ```
5. Start the dev server:
   ```bash
   npm run dev
   ```
   The app opens at http://localhost:5173. Without the `.env` values it shows a "Connect Supabase" notice.

## 2. Create the Supabase project

1. Go to https://supabase.com, sign in and click **New project**. Choose a name, a strong database password and a region near your students.
2. When it is ready open **Project Settings → API** and copy:
   - **Project URL** → `VITE_SUPABASE_URL`
   - **anon public** key → `VITE_SUPABASE_ANON_KEY`
3. Paste them into `.env`. Do **not** copy the `service_role` key anywhere.

## 3. Configure authentication

In **Authentication → Providers**, keep **Email** enabled.

In **Authentication → URL Configuration**:
- **Site URL:** `http://localhost:5173` while developing (change to your Vercel URL after deploying).
- **Redirect URLs:** add `http://localhost:5173/**` and `https://YOUR-APP.vercel.app/**`.

In **Authentication → Providers → Email**:
- *Confirm email* ON (recommended for production): new students must click the link in their inbox. The app shows a "Check your email" screen.
- *Confirm email* OFF (easier for testing): students are logged in immediately after registering.

Password reset emails link back to `/reset-password` in this app.

## 4. Create the database tables and security policies

1. Open **SQL Editor → New query**.
2. Paste the whole contents of `supabase/schema.sql` and click **Run**. This creates all tables (`profiles`, `categories`, `subjects`, `exams`, `questions`, `options`, `question_answers`, `exam_attempts`, `student_answers`, `results`, `resources`, `contact_messages`), enables Row Level Security, and adds the policies and exam-engine functions. It is safe to run again.
3. New query → paste `supabase/seed.sql` → **Run**. This adds all categories and subjects from the brief, 8 published sample exams with 66 questions and explanations, and some free resources.

## 5. Make yourself an administrator

1. Register an account in the running app (or on the deployed site).
2. In the Supabase **SQL Editor** run (use your email):
   ```sql
   update public.profiles set role = 'admin'
   where id = (select id from auth.users where email = 'you@example.com');
   ```
3. Refresh the app. An **Admin panel** link appears in your account menu. Only the SQL editor can change roles - the app cannot.

### Using the admin panel
- **Exams & questions:** create an exam (duration, total marks, passing percentage, type, category/subject), open *Manage questions* to add MCQs (4 options, correct answer, explanation), then **Publish**. An exam needs at least one question before it can be published.
- Marks are shared equally between questions; there is no negative marking.
- Exams that students have already attempted cannot be deleted - unpublish them instead.

## 6. Upload to GitHub

```bash
git init
git add .
git commit -m "Initial commit: ExamPrep Global"
git branch -M main
git remote add origin https://github.com/YOUR-USERNAME/examprep-global.git
git push -u origin main
```
Create the empty repository on github.com first. `.gitignore` already excludes `.env` and `node_modules`, so your keys are not uploaded - check that `.env` does not appear in `git status` before committing.

## 7. Deploy on Vercel

1. Sign in at https://vercel.com with GitHub and click **Add New → Project**, then import your repository.
2. Vercel detects **Vite** automatically (Build command `npm run build`, output directory `dist`).
3. Under **Environment Variables** add:
   - `VITE_SUPABASE_URL` = your project URL
   - `VITE_SUPABASE_ANON_KEY` = your anon key
4. Click **Deploy**.
5. Copy your live URL (e.g. `https://examprep-global.vercel.app`) and add it in Supabase **Authentication → URL Configuration** (Site URL and Redirect URLs).
6. If you change environment variables later, **redeploy** for them to take effect.

`vercel.json` makes direct links such as `/exams/...` and `/dashboard` work after a page refresh.

## Testing checklist

1. Register a student → log in → open **Explore** → start *Algebra Fundamentals Quiz*.
2. Answer some questions, mark one for review, submit → check score, review and explanations → **Retake**.
3. Open the dashboard: charts and history update; check **Leaderboard**.
4. As a student visit `/admin` → you see "Administrators only".
5. As admin add an exam and questions, publish it, and attempt it as a student.

## Troubleshooting

| Problem | Fix |
|---|---|
| "Connect Supabase" screen | `.env` missing or variable names wrong; restart `npm run dev` after editing. |
| Empty exam list | Run `supabase/seed.sql`, or publish an exam in the admin panel. |
| "Email not confirmed" | Click the link in the confirmation email, or turn off *Confirm email* while testing. |
| Reset link says invalid/expired | Request a new link; make sure the Redirect URLs in Supabase include your site. |
| Admin link missing | Run the SQL in step 5 with the same email you registered with, then reload. |
| Blank page on Vercel after refresh | Make sure `vercel.json` is in the repository root. |

## Notes

- Testimonials on the home page are clearly marked **sample content**.
- The Free practice resources point to well-known external sites; edit or remove them in *Admin → Free resources*.
- Scripts: `npm run dev`, `npm run build`, `npm run preview`.
