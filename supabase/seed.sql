-- =====================================================================
-- ExamPrep Global - sample data
-- Run AFTER supabase/schema.sql (Supabase Dashboard -> SQL Editor).
-- Safe to re-run: existing rows are skipped.
-- Creates: 5 categories, all subjects from the project brief, 8 published
-- sample exams (66 MCQs with explanations) and a few free resources.
-- =====================================================================

-- ---------- Categories ----------
insert into public.categories (name, slug, description, icon, sort_order) values
  ('Academic Examinations',        'academic',        'School, college and university subjects: from Matriculation to university-level courses.', 'book-open',      1),
  ('Competitive Examinations',     'competitive',     'CSS, PMS and general knowledge preparation for competitive civil-service exams.',          'trophy',         2),
  ('Job Recruitment Examinations', 'job-recruitment', 'Banking, government, teaching, police, administrative and technical recruitment tests.',  'briefcase',      3),
  ('Admission Examinations',       'admission',       'MDCAT, ECAT, SAT, ACT, GRE, GMAT and university entrance test practice.',                  'graduation-cap', 4),
  ('International Examinations',   'international',   'IELTS, TOEFL, language proficiency and professional certification practice.',              'globe',          5)
on conflict (slug) do nothing;

-- ---------- Subjects ----------
insert into public.subjects (category_id, name, slug, sort_order)
select c.id, v.name, v.slug, v.ord
from (values
  ('academic',        'School Examinations',                 'school-examinations',                1),
  ('academic',        'Matriculation',                       'matriculation',                      2),
  ('academic',        'Intermediate',                        'intermediate',                       3),
  ('academic',        'University Examinations',             'university-examinations',            4),
  ('academic',        'Mathematics',                         'mathematics',                        5),
  ('academic',        'Computer Science',                    'computer-science',                   6),
  ('academic',        'Physics',                             'physics',                            7),
  ('academic',        'Chemistry',                           'chemistry',                          8),
  ('academic',        'Biology',                             'biology',                            9),
  ('academic',        'English',                             'english',                           10),
  ('competitive',     'CSS',                                 'css',                                1),
  ('competitive',     'PMS',                                 'pms',                                2),
  ('competitive',     'General Knowledge',                   'general-knowledge',                  3),
  ('competitive',     'Current Affairs',                     'current-affairs',                    4),
  ('competitive',     'World Affairs',                       'world-affairs',                      5),
  ('competitive',     'General Science',                     'general-science',                    6),
  ('job-recruitment', 'Banking Tests',                       'banking-tests',                      1),
  ('job-recruitment', 'Government Job Tests',                'government-job-tests',               2),
  ('job-recruitment', 'Teaching Tests',                      'teaching-tests',                     3),
  ('job-recruitment', 'Police Recruitment Tests',            'police-recruitment-tests',           4),
  ('job-recruitment', 'Administrative Tests',                'administrative-tests',               5),
  ('job-recruitment', 'Technical Recruitment Tests',         'technical-recruitment-tests',        6),
  ('admission',       'MDCAT',                               'mdcat',                              1),
  ('admission',       'ECAT',                                'ecat',                               2),
  ('admission',       'SAT',                                 'sat',                                3),
  ('admission',       'ACT',                                 'act',                                4),
  ('admission',       'GRE',                                 'gre',                                5),
  ('admission',       'GMAT',                                'gmat',                               6),
  ('admission',       'University Entrance Examinations',    'university-entrance-examinations',   7),
  ('international',   'IELTS',                               'ielts',                              1),
  ('international',   'TOEFL',                               'toefl',                              2),
  ('international',   'Language Proficiency Tests',          'language-proficiency-tests',         3),
  ('international',   'Professional Certification Practice Tests', 'professional-certification-tests', 4)
) as v(cat, name, slug, ord)
join public.categories c on c.slug = v.cat
on conflict (slug) do nothing;

-- ---------- Exams ----------
insert into public.exams
  (category_id, subject_id, title, description, exam_type, duration_minutes,
   total_marks, passing_percentage, is_published, is_featured)
select c.id, s.id, v.title, v.descr, v.etype, v.dur, v.marks, v.pass, true, v.feat
from (values
  ('academic',        'mathematics',       'Algebra Fundamentals Quiz',
     'Linear equations, factorisation, exponents and quadratic roots. A quick warm-up for any maths exam.',
     'quiz',      10, 40, 50, true),
  ('academic',        'computer-science',  'Computer Science Basics',
     'Core concepts: hardware, data structures, algorithms, databases and the web.',
     'subject',   15, 40, 50, true),
  ('academic',        'physics',           'Physics: Mechanics Practice',
     'Forces, motion, energy and units - essential mechanics for Intermediate and entry tests.',
     'topic',     15, 40, 50, false),
  ('competitive',     'general-knowledge', 'General Knowledge Full Mock',
     'A full-length mixed paper covering geography, history, literature, science and general awareness.',
     'full_mock', 20, 50, 60, true),
  ('competitive',     'general-science',   'General Science Essentials',
     'Biology, chemistry and physics basics that appear in almost every competitive exam.',
     'subject',   15, 40, 50, false),
  ('academic',        'english',           'English Grammar & Vocabulary',
     'Grammar rules, synonyms, antonyms, spelling and common expressions.',
     'quiz',      10, 40, 50, false),
  ('international',   'ielts',             'IELTS Vocabulary & Grammar Starter',
     'Academic vocabulary, linking words and grammar points useful for IELTS preparation.',
     'topic',     15, 40, 50, true),
  ('job-recruitment', 'banking-tests',     'Banking Aptitude Starter',
     'Percentages, ratios, interest, averages and number series - typical banking test arithmetic.',
     'quiz',      15, 40, 50, true)
) as v(cat, subj, title, descr, etype, dur, marks, pass, feat)
join public.categories c on c.slug = v.cat
left join public.subjects s on s.slug = v.subj
where not exists (select 1 from public.exams e where e.title = v.title);

-- ---------- Helper used only by this seed script (dropped at the end) ----------
create or replace function public.seed_question(
  p_title text, p_text text,
  p_a text, p_b text, p_c text, p_d text,
  p_correct integer,          -- 1 = A, 2 = B, 3 = C, 4 = D
  p_expl text
) returns void
language plpgsql
as $$
declare
  v_exam uuid;
  v_q uuid;
  v_opt uuid;
  v_texts text[] := array[p_a, p_b, p_c, p_d];
  i integer;
begin
  select id into v_exam from public.exams where title = p_title limit 1;
  if v_exam is null then
    raise exception 'Seed exam not found: %', p_title;
  end if;
  if exists (select 1 from public.questions where exam_id = v_exam and question_text = p_text) then
    return;
  end if;

  insert into public.questions (exam_id, sort_order, question_text)
  values (
    v_exam,
    (select coalesce(max(sort_order), 0) + 1 from public.questions where exam_id = v_exam),
    p_text
  )
  returning id into v_q;

  for i in 1..4 loop
    insert into public.options (question_id, sort_order, option_text)
    values (v_q, i, v_texts[i])
    returning id into v_opt;
    if i = p_correct then
      insert into public.question_answers (question_id, correct_option_id, explanation)
      values (v_q, v_opt, p_expl);
    end if;
  end loop;
end;
$$;

-- ---------- Algebra Fundamentals Quiz ----------
select public.seed_question('Algebra Fundamentals Quiz', 'Solve for x: 3x + 7 = 22', '3', '5', '7', '15', 2,
  'Subtract 7 from both sides to get 3x = 15, then divide by 3: x = 5.');
select public.seed_question('Algebra Fundamentals Quiz', 'Which expression equals (a + b)²?', 'a² − 2ab + b²', 'a² + b²', '2a + 2b', 'a² + 2ab + b²', 4,
  '(a + b)² = (a + b)(a + b) = a² + 2ab + b².');
select public.seed_question('Algebra Fundamentals Quiz', 'Factorise: x² − 9', '(x − 3)(x − 3)', '(x + 3)(x + 3)', '(x − 3)(x + 3)', '(x − 9)(x + 1)', 3,
  'This is a difference of squares: a² − b² = (a − b)(a + b), so x² − 9 = (x − 3)(x + 3).');
select public.seed_question('Algebra Fundamentals Quiz', 'What are the roots of x² − 5x + 6 = 0?', '2 and 3', '−2 and −3', '1 and 6', '−1 and −6', 1,
  'x² − 5x + 6 = (x − 2)(x − 3), so x = 2 or x = 3.');
select public.seed_question('Algebra Fundamentals Quiz', 'If 2^(x + 1) = 32, what is x?', '3', '5', '4', '6', 3,
  '32 = 2⁵, so x + 1 = 5 and therefore x = 4.');
select public.seed_question('Algebra Fundamentals Quiz', 'What is the slope of the line y = 4x − 3?', '−3', '−4', '3', '4', 4,
  'In y = mx + c the slope is m, the coefficient of x. Here m = 4.');
select public.seed_question('Algebra Fundamentals Quiz', 'Simplify: (x³ · x⁴) ÷ x²', 'x⁹', 'x⁵', 'x¹²', 'x⁶', 2,
  'Add exponents when multiplying: x³ · x⁴ = x⁷. Subtract when dividing: x⁷ ÷ x² = x⁵.');
select public.seed_question('Algebra Fundamentals Quiz', 'What is the sum of the roots of 2x² − 8x + 6 = 0?', '3', '−4', '4', '6', 3,
  'For ax² + bx + c = 0 the sum of the roots is −b/a = −(−8)/2 = 4. (The roots are 1 and 3.)');

-- ---------- Computer Science Basics ----------
select public.seed_question('Computer Science Basics', 'What does CPU stand for?', 'Central Processing Unit', 'Computer Personal Unit', 'Central Program Utility', 'Control Processing Unit', 1,
  'CPU stands for Central Processing Unit, the component that executes program instructions.');
select public.seed_question('Computer Science Basics', 'Which data structure follows the Last-In-First-Out (LIFO) principle?', 'Queue', 'Tree', 'Stack', 'Graph', 3,
  'In a stack the most recently added element is the first one removed (push and pop at the same end).');
select public.seed_question('Computer Science Basics', 'What is the binary representation of the decimal number 10?', '1001', '1010', '1100', '0110', 2,
  '10 = 8 + 2 = 1×2³ + 0×2² + 1×2¹ + 0×2⁰ = 1010.');
select public.seed_question('Computer Science Basics', 'Which language is primarily used to style web pages?', 'HTML', 'SQL', 'Python', 'CSS', 4,
  'CSS (Cascading Style Sheets) controls layout, colours and fonts. HTML provides the structure.');
select public.seed_question('Computer Science Basics', 'What is the time complexity of binary search on a sorted array of n elements?', 'O(n)', 'O(n log n)', 'O(log n)', 'O(1)', 3,
  'Binary search halves the search space at every step, so it needs about log₂(n) comparisons.');
select public.seed_question('Computer Science Basics', 'Which of the following is a relational database management system?', 'PostgreSQL', 'Photoshop', 'Notepad', 'Bluetooth', 1,
  'PostgreSQL stores data in related tables and is queried with SQL.');
select public.seed_question('Computer Science Basics', 'What does HTTP stand for?', 'High Transfer Text Protocol', 'HyperText Transfer Protocol', 'Hyperlink Transmission Process', 'Host Text Transfer Program', 2,
  'HTTP = HyperText Transfer Protocol, the protocol browsers use to request web pages.');
select public.seed_question('Computer Science Basics', 'Which type of memory is volatile (loses its contents when power is off)?', 'RAM', 'ROM', 'Hard disk drive', 'Solid-state drive', 1,
  'RAM needs power to keep its data. ROM, hard disks and SSDs are non-volatile.');

-- ---------- Physics: Mechanics Practice ----------
select public.seed_question('Physics: Mechanics Practice', 'What is the SI unit of force?', 'Joule', 'Pascal', 'Watt', 'Newton', 4,
  'The newton (N) is the SI unit of force: 1 N = 1 kg·m/s².');
select public.seed_question('Physics: Mechanics Practice', 'Newton''s first law of motion is also known as the law of:', 'Acceleration', 'Inertia', 'Gravitation', 'Action and reaction', 2,
  'A body stays at rest or in uniform motion unless acted on by a net force. This tendency is inertia.');
select public.seed_question('Physics: Mechanics Practice', 'A 5 kg body accelerates at 2 m/s². What is the net force acting on it?', '2.5 N', '7 N', '10 N', '3 N', 3,
  'F = ma = 5 kg × 2 m/s² = 10 N.');
select public.seed_question('Physics: Mechanics Practice', 'A car travels 150 km in 3 hours. What is its average speed?', '40 km/h', '45 km/h', '60 km/h', '50 km/h', 4,
  'Average speed = distance ÷ time = 150 km ÷ 3 h = 50 km/h.');
select public.seed_question('Physics: Mechanics Practice', 'What is the kinetic energy of a 2 kg object moving at 3 m/s?', '9 J', '6 J', '12 J', '18 J', 1,
  'KE = ½mv² = ½ × 2 × 3² = 9 J.');
select public.seed_question('Physics: Mechanics Practice', 'Which of these is the SI unit of power?', 'Joule', 'Watt', 'Newton', 'Pascal', 2,
  'Power is the rate of doing work. One watt equals one joule per second.');
select public.seed_question('Physics: Mechanics Practice', 'Which of the following is a vector quantity?', 'Speed', 'Mass', 'Displacement', 'Time', 3,
  'Displacement has both magnitude and direction. Speed, mass and time are scalars.');
select public.seed_question('Physics: Mechanics Practice', 'The acceleration due to gravity near the Earth''s surface is approximately:', '1.6 m/s²', '12.5 m/s²', '24.8 m/s²', '9.8 m/s²', 4,
  'Near Earth''s surface g ≈ 9.8 m/s² (about 9.81).');

-- ---------- General Knowledge Full Mock ----------
select public.seed_question('General Knowledge Full Mock', 'What is the capital city of Pakistan?', 'Karachi', 'Lahore', 'Islamabad', 'Peshawar', 3,
  'Islamabad has been the capital of Pakistan since the 1960s. Karachi was the first capital.');
select public.seed_question('General Knowledge Full Mock', 'Which is the largest ocean on Earth?', 'Atlantic Ocean', 'Pacific Ocean', 'Indian Ocean', 'Arctic Ocean', 2,
  'The Pacific Ocean covers more area than all of Earth''s land combined.');
select public.seed_question('General Knowledge Full Mock', 'Who wrote the play ''Romeo and Juliet''?', 'Charles Dickens', 'Jane Austen', 'Mark Twain', 'William Shakespeare', 4,
  'Romeo and Juliet is a tragedy written by William Shakespeare in the 1590s.');
select public.seed_question('General Knowledge Full Mock', 'Which planet is known as the Red Planet?', 'Mars', 'Venus', 'Jupiter', 'Mercury', 1,
  'Iron oxide (rust) on its surface gives Mars its reddish colour.');
select public.seed_question('General Knowledge Full Mock', 'In which year was the Lahore Resolution adopted?', '1930', '1947', '1940', '1956', 3,
  'The Lahore Resolution was adopted in March 1940 at the All-India Muslim League session in Lahore.');
select public.seed_question('General Knowledge Full Mock', 'Which is the longest river in Pakistan?', 'Jhelum', 'Indus', 'Ravi', 'Chenab', 2,
  'The Indus River, about 3,000 km long, is the longest river in Pakistan.');
select public.seed_question('General Knowledge Full Mock', 'What is the chemical symbol for gold?', 'Ag', 'Gd', 'Go', 'Au', 4,
  'Au comes from the Latin word aurum. Ag is silver.');
select public.seed_question('General Knowledge Full Mock', 'In which city is the headquarters of the United Nations located?', 'Geneva', 'New York City', 'Paris', 'London', 2,
  'The UN headquarters is in New York City. Geneva hosts a major UN office but not the headquarters.');
select public.seed_question('General Knowledge Full Mock', 'Which mountain is the highest above sea level?', 'K2', 'Kangchenjunga', 'Mount Everest', 'Lhotse', 3,
  'Mount Everest rises about 8,849 m above sea level. K2 is the second highest.');
select public.seed_question('General Knowledge Full Mock', 'What is the smallest prime number?', '1', '2', '3', '5', 2,
  'A prime has exactly two distinct divisors. 1 has only one divisor, so the smallest prime is 2.');

-- ---------- General Science Essentials ----------
select public.seed_question('General Science Essentials', 'Which organelle is known as the powerhouse of the cell?', 'Nucleus', 'Ribosome', 'Mitochondria', 'Golgi apparatus', 3,
  'Mitochondria produce most of the cell''s ATP through cellular respiration.');
select public.seed_question('General Science Essentials', 'Which gas makes up most of the Earth''s atmosphere?', 'Oxygen', 'Nitrogen', 'Carbon dioxide', 'Argon', 2,
  'The atmosphere is about 78% nitrogen and 21% oxygen.');
select public.seed_question('General Science Essentials', 'What is the pH of pure water at 25 °C?', '0', '14', '1', '7', 4,
  'Pure water is neutral, with a pH of 7.');
select public.seed_question('General Science Essentials', 'Which vitamin does the human skin produce when exposed to sunlight?', 'Vitamin A', 'Vitamin D', 'Vitamin C', 'Vitamin K', 2,
  'UVB light triggers the skin to synthesise vitamin D.');
select public.seed_question('General Science Essentials', 'What is the chemical formula of water?', 'CO₂', 'O₂', 'H₂O', 'H₂', 3,
  'A water molecule has two hydrogen atoms and one oxygen atom: H₂O.');
select public.seed_question('General Science Essentials', 'Which organ pumps blood around the human body?', 'Heart', 'Liver', 'Lungs', 'Kidney', 1,
  'The heart is a muscular pump that circulates blood through the blood vessels.');
select public.seed_question('General Science Essentials', 'What is the approximate speed of light in a vacuum?', '3 × 10⁶ m/s', '3 × 10⁸ m/s', '3 × 10⁵ m/s', '3 × 10¹⁰ m/s', 2,
  'Light travels at about 299,792,458 m/s, roughly 3 × 10⁸ m/s.');
select public.seed_question('General Science Essentials', 'What is the process by which plants make their own food using sunlight?', 'Respiration', 'Transpiration', 'Digestion', 'Photosynthesis', 4,
  'In photosynthesis plants convert carbon dioxide and water into glucose and oxygen using light energy.');

-- ---------- English Grammar & Vocabulary ----------
select public.seed_question('English Grammar & Vocabulary', 'Choose the grammatically correct sentence.', 'She don''t like tea.', 'She not like tea.', 'She doesn''t like tea.', 'She doesn''t likes tea.', 3,
  'With a third-person singular subject use "doesn''t" followed by the base verb: "She doesn''t like tea."');
select public.seed_question('English Grammar & Vocabulary', 'Choose the synonym of ''rapid''.', 'Slow', 'Quick', 'Weak', 'Quiet', 2,
  '"Rapid" means moving at great speed, so its synonym is "quick".');
select public.seed_question('English Grammar & Vocabulary', 'Choose the antonym of ''generous''.', 'Humble', 'Kind', 'Polite', 'Stingy', 4,
  '"Generous" means willing to give; the opposite is "stingy".');
select public.seed_question('English Grammar & Vocabulary', 'Fill in the blank: He has been working here ___ 2019.', 'for', 'during', 'since', 'from', 3,
  'Use "since" with a specific starting point in time (2019) and "for" with a duration (e.g. for five years).');
select public.seed_question('English Grammar & Vocabulary', 'What is the plural of ''child''?', 'childs', 'children', 'childrens', 'childes', 2,
  '"Child" has an irregular plural: "children".');
select public.seed_question('English Grammar & Vocabulary', 'Which spelling is correct?', 'Accomodation', 'Acommodation', 'Accommodation', 'Accomodasion', 3,
  '"Accommodation" has a double c and a double m.');
select public.seed_question('English Grammar & Vocabulary', 'What does the idiom ''Break a leg'' mean?', 'Good luck', 'Get injured', 'Run away', 'Be quiet', 1,
  'It is a theatrical expression used to wish a performer good luck.');
select public.seed_question('English Grammar & Vocabulary', 'What is the past participle of ''write''?', 'wrote', 'writed', 'writing', 'written', 4,
  'The forms are write - wrote - written. The past participle is "written".');

-- ---------- IELTS Vocabulary & Grammar Starter ----------
select public.seed_question('IELTS Vocabulary & Grammar Starter', 'Which word is closest in meaning to ''considerable''?', 'Substantial', 'Tiny', 'Careless', 'Unclear', 1,
  '"Considerable" means large in amount or importance, similar to "substantial".');
select public.seed_question('IELTS Vocabulary & Grammar Starter', 'Choose the correct sentence: "The number of students ___ increased."', 'have', 'has', 'are', 'were', 2,
  '"The number of" takes a singular verb: "The number of students has increased."');
select public.seed_question('IELTS Vocabulary & Grammar Starter', 'In IELTS Academic Writing Task 1, candidates are usually asked to describe:', 'A personal opinion essay', 'A letter to a friend', 'Visual information such as a graph, chart or diagram', 'A short story', 3,
  'Academic Task 1 asks you to summarise and compare information from a graph, chart, table or diagram.');
select public.seed_question('IELTS Vocabulary & Grammar Starter', 'Which linking word shows contrast?', 'Moreover', 'Furthermore', 'Therefore', 'However', 4,
  '"However" introduces a contrasting idea. "Moreover" and "furthermore" add information; "therefore" shows a result.');
select public.seed_question('IELTS Vocabulary & Grammar Starter', 'What does ''mitigate'' mean?', 'To make worse', 'To make less severe', 'To ignore', 'To repeat', 2,
  'To mitigate is to reduce the seriousness or severity of something.');
select public.seed_question('IELTS Vocabulary & Grammar Starter', 'Which sentence is in the passive voice?', 'The committee approved the plan.', 'The committee will approve the plan.', 'The plan was approved by the committee.', 'The committee is approving the plan.', 3,
  'In the passive voice the subject receives the action: "The plan was approved by the committee."');
select public.seed_question('IELTS Vocabulary & Grammar Starter', 'Which word is closest in meaning to ''scarce''?', 'Rare', 'Plentiful', 'Heavy', 'Bright', 1,
  '"Scarce" means insufficient or hard to find, similar to "rare".');
select public.seed_question('IELTS Vocabulary & Grammar Starter', 'Choose the correct preposition: "She is interested ___ environmental science."', 'on', 'at', 'for', 'in', 4,
  'The adjective "interested" is followed by "in".');

-- ---------- Banking Aptitude Starter ----------
select public.seed_question('Banking Aptitude Starter', 'What is 20% of 250?', '40', '50', '60', '25', 2,
  '20% of 250 = 0.20 × 250 = 50.');
select public.seed_question('Banking Aptitude Starter', 'What is the simple interest on 5,000 at 10% per annum for 2 years?', '500', '1,500', '1,100', '1,000', 4,
  'SI = (P × R × T) ÷ 100 = (5,000 × 10 × 2) ÷ 100 = 1,000.');
select public.seed_question('Banking Aptitude Starter', 'Simplify the ratio 12 : 18.', '2 : 3', '3 : 2', '4 : 5', '6 : 7', 1,
  'Divide both terms by their highest common factor, 6: 12 : 18 = 2 : 3.');
select public.seed_question('Banking Aptitude Starter', 'What is the average of 10, 20, 30, 40 and 50?', '25', '35', '30', '40', 3,
  'The sum is 150 and there are 5 numbers, so the average is 150 ÷ 5 = 30.');
select public.seed_question('Banking Aptitude Starter', 'An item bought for 400 is sold for 500. What is the profit percentage?', '20%', '25%', '30%', '15%', 2,
  'Profit = 100. Profit % = (100 ÷ 400) × 100 = 25%.');
select public.seed_question('Banking Aptitude Starter', 'Find the next number in the series: 2, 6, 12, 20, ?', '28', '32', '36', '30', 4,
  'The differences are 4, 6, 8, so the next difference is 10 and the next term is 20 + 10 = 30.');
select public.seed_question('Banking Aptitude Starter', '6 workers finish a job in 12 days. How many days will 9 workers (working at the same rate) need?', '6 days', '9 days', '8 days', '18 days', 3,
  'Total work = 6 × 12 = 72 worker-days. With 9 workers: 72 ÷ 9 = 8 days.');
select public.seed_question('Banking Aptitude Starter', 'Express 0.75 as a fraction in simplest form.', '3/4', '1/2', '2/3', '4/5', 1,
  '0.75 = 75/100 = 3/4.');

-- ---------- Free resources (external websites - edit or remove in the admin panel) ----------
insert into public.resources (title, description, url, category_id)
select v.title, v.descr, v.url, c.id
from (values
  ('Khan Academy',            'Free video lessons and practice exercises in mathematics, science and more.',            'https://www.khanacademy.org',                                                     'academic'),
  ('MIT OpenCourseWare',      'Free course materials from MIT covering hundreds of university-level subjects.',        'https://ocw.mit.edu',                                                             'academic'),
  ('CS50 (Harvard)',          'Free introduction to computer science and programming.',                                'https://cs50.harvard.edu/x',                                                      'academic'),
  ('British Council LearnEnglish', 'Free English grammar, vocabulary, listening and reading practice.',                 'https://learnenglish.britishcouncil.org',                                         'international'),
  ('IELTS Official Website',  'Official information about the IELTS test format, preparation and sample materials.',  'https://ielts.org',                                                               'international'),
  ('TOEFL (ETS)',             'Official TOEFL test information and free preparation resources from ETS.',             'https://www.ets.org/toefl.html',                                                  'international'),
  ('SAT Practice (College Board)', 'Official SAT information and free practice resources.',                            'https://satsuite.collegeboard.org/sat/practice-preparation',                      'admission')
) as v(title, descr, url, cat)
join public.categories c on c.slug = v.cat
where not exists (select 1 from public.resources r where r.url = v.url);

-- ---------- Cleanup ----------
drop function if exists public.seed_question(text, text, text, text, text, text, integer, text);
