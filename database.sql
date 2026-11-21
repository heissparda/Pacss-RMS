create table profiles(id uuid primary key references auth.users on delete cascade,full_name text,role text check(role in('admin','teacher')) default 'teacher');
create table sessions(id uuid primary key default gen_random_uuid(),name text unique not null);
create table terms(id uuid primary key default gen_random_uuid(),session_id uuid references sessions,name text not null,is_current bool default false,locked bool default false,published bool default false);
create table classes(id uuid primary key default gen_random_uuid(),name text unique not null,sort int);
create table subjects(id uuid primary key default gen_random_uuid(),name text unique not null);
create table teachers(id uuid primary key default gen_random_uuid(),profile_id uuid references profiles,phone text);
create table teacher_assignments(teacher_id uuid references profiles,class_id uuid references classes,subject_id uuid references subjects,primary key(teacher_id,class_id,subject_id));
create table students(id uuid primary key default gen_random_uuid(),admission_no text unique not null,full_name text not null,gender text,class_id uuid references classes,parent_phone text,photo_url text);
create table scores(id uuid primary key default gen_random_uuid(),student_id uuid references students on delete cascade,subject_id uuid references subjects,term_id uuid references terms,
ca1 int default 0 check(ca1 between 0 and 20),ca2 int default 0 check(ca2 between 0 and 20),exam int default 0 check(exam between 0 and 60),total int generated always as(ca1+ca2+exam) stored,unique(student_id,subject_id,term_id));
create table results(id uuid primary key default gen_random_uuid(),student_id uuid references students on delete cascade,term_id uuid references terms,class_id uuid references classes,total int,average numeric(5,2),position int,promoted bool,comment text,unique(student_id,term_id));
create table gallery(id uuid primary key default gen_random_uuid(),url text not null,caption text,created_at timestamptz default now());
create table announcements(id uuid primary key default gen_random_uuid(),title text,body text,created_at timestamptz default now());
create table pins(id uuid primary key default gen_random_uuid(),student_id uuid references students on delete cascade,term_id uuid references terms,code text not null,used bool default false,unique(student_id,term_id));

create or replace function is_admin() returns bool language sql security definer stable as $$select exists(select 1 from profiles where id=auth.uid() and role='admin')$$;

alter table profiles enable row level security;alter table sessions enable row level security;alter table terms enable row level security;alter table classes enable row level security;alter table subjects enable row level security;alter table teachers enable row level security;alter table teacher_assignments enable row level security;alter table students enable row level security;alter table scores enable row level security;alter table results enable row level security;alter table gallery enable row level security;alter table announcements enable row level security;alter table pins enable row level security;

create policy p1 on profiles for select using(id=auth.uid() or is_admin());create policy p1a on profiles for all using(is_admin());
create policy p2 on terms for select using(true);create policy p2a on terms for all using(is_admin());
create policy p3 on classes for select using(true);create policy p3a on classes for all using(is_admin());
create policy p4 on subjects for select using(true);create policy p4a on subjects for all using(is_admin());
create policy p5 on sessions for all using(is_admin());create policy p6 on teachers for all using(is_admin());
create policy p7 on teacher_assignments for select using(teacher_id=auth.uid() or is_admin());create policy p7a on teacher_assignments for all using(is_admin());
create policy p8 on students for all using(is_admin());
create policy p8t on students for select using(exists(select 1 from teacher_assignments a where a.teacher_id=auth.uid() and a.class_id=students.class_id));
create policy p9 on scores for all using(is_admin());
create policy p9t on scores for select using(exists(select 1 from students s join teacher_assignments a on a.class_id=s.class_id where s.id=scores.student_id and a.teacher_id=auth.uid() and a.subject_id=scores.subject_id));
create policy p9i on scores for insert with check(exists(select 1 from students s join teacher_assignments a on a.class_id=s.class_id where s.id=scores.student_id and a.teacher_id=auth.uid() and a.subject_id=scores.subject_id) and not exists(select 1 from terms t where t.id=scores.term_id and t.locked));
create policy p9u on scores for update using(exists(select 1 from students s join teacher_assignments a on a.class_id=s.class_id where s.id=scores.student_id and a.teacher_id=auth.uid() and a.subject_id=scores.subject_id) and not exists(select 1 from terms t where t.id=scores.term_id and t.locked));
create policy p10 on results for all using(is_admin());create policy p11 on pins for all using(is_admin());
create policy p12 on gallery for select using(true);create policy p12a on gallery for all using(is_admin());
create policy p13 on announcements for select using(true);create policy p13a on announcements for all using(is_admin());

create or replace function compute_results(term uuid) returns void language plpgsql security definer as $$begin if not is_admin() then raise exception 'Admin only';end if;
delete from results where term_id=term;
insert into results(student_id,term_id,class_id,total,average,position,promoted)
select student_id,term,class_id,tot,avg,rank() over(partition by class_id order by tot desc),avg>=40 from(select sc.student_id,s.class_id,sum(sc.total) tot,round(avg(sc.total),2) avg from scores sc join students s on s.id=sc.student_id where sc.term_id=term group by sc.student_id,s.class_id)x;end$$;

create or replace function generate_pins(term uuid) returns void language plpgsql security definer as $$begin if not is_admin() then raise exception 'Admin only';end if;
insert into pins(student_id,term_id,code) select id,term,lpad((floor(random()*1000000000000))::bigint::text,12,'0') from students on conflict do nothing;end$$;

create or replace function promote_students(term uuid) returns void language plpgsql security definer as $$begin if not is_admin() then raise exception 'Admin only';end if;
update students s set class_id=(select c2.id from classes c1 join classes c2 on c2.sort=c1.sort+1 where c1.id=s.class_id) where exists(select 1 from results r where r.student_id=s.id and r.term_id=term and r.promoted) and exists(select 1 from classes c1 join classes c2 on c2.sort=c1.sort+1 where c1.id=s.class_id);end$$;

create or replace function get_report(adm text,pin text,term uuid) returns json language plpgsql security definer as $$declare s record;p record;t record;begin
select * into s from students where admission_no=adm;select * into p from pins where student_id=s.id and term_id=term and code=pin;
if p.id is null then raise exception 'Wrong Admission Number or PIN';end if;select * into t from terms where id=term;
if not t.published then raise exception 'Results are not published yet';end if;update pins set used=true where id=p.id;
return json_build_object('term',t.name,'student',json_build_object('full_name',s.full_name,'admission_no',s.admission_no,'class_name',(select name from classes where id=s.class_id)),
'scores',(select coalesce(json_agg(json_build_object('subject',sb.name,'ca1',sc.ca1,'ca2',sc.ca2,'exam',sc.exam,'total',sc.total)),'[]') from scores sc join subjects sb on sb.id=sc.subject_id where sc.student_id=s.id and sc.term_id=term),
'result',(select row_to_json(r) from results r where r.student_id=s.id and r.term_id=term));end$$;

create or replace function top_scorers() returns table(full_name text,photo_url text,class_name text,average numeric,rank_label text) language sql security definer as $$
select s.full_name,s.photo_url,c.name,r.average,'#'||r.position from results r join students s on s.id=r.student_id join classes c on c.id=r.class_id join terms t on t.id=r.term_id where t.is_current and t.published and r.position<=3 order by c.sort,r.position$$;

grant execute on function get_report,top_scorers to anon,authenticated;

insert into classes(name,sort) values('JSS1',1),('JSS2',2),('JSS3',3),('SS1',4),('SS2',5),('SS3',6);
insert into subjects(name) values('Mathematics'),('English Language'),('Basic Science'),('Civic Education');
insert into sessions(name) values('2026/2027');
insert into terms(session_id,name,is_current) select id,'First Term',true from sessions;