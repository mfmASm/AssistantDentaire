create extension if not exists "pgcrypto";

create table if not exists cabinets (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  dentist_name text,
  address text,
  city text,
  phone text,
  whatsapp_number text,
  google_review_link text,
  logo_url text,
  created_at timestamp default now()
);

create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  email text,
  role text check (role in ('admin', 'doctor', 'secretary')) default 'doctor',
  cabinet_id uuid references cabinets(id) on delete set null,
  created_at timestamp default now()
);

create table if not exists patients (
  id uuid primary key default gen_random_uuid(),
  cabinet_id uuid references cabinets(id) on delete cascade,
  full_name text not null,
  phone text,
  email text,
  age int,
  gender text,
  address text,
  status text default 'Actif',
  notes text,
  created_at timestamp default now(),
  updated_at timestamp default now()
);

create table if not exists appointments (
  id uuid primary key default gen_random_uuid(),
  cabinet_id uuid references cabinets(id) on delete cascade,
  patient_id uuid references patients(id) on delete cascade,
  doctor_id uuid references profiles(id),
  appointment_date date,
  start_time time,
  end_time time,
  treatment_type text,
  status text default 'Confirmé',
  payment_status text,
  notes text,
  created_at timestamp default now()
);

create table if not exists payments (
  id uuid primary key default gen_random_uuid(),
  cabinet_id uuid references cabinets(id) on delete cascade,
  patient_id uuid references patients(id) on delete cascade,
  treatment text,
  total_amount numeric default 0 check (total_amount >= 0),
  paid_amount numeric default 0 check (paid_amount >= 0),
  remaining_amount numeric default 0 check (remaining_amount >= 0),
  status text default 'Impayé',
  due_date date,
  notes text,
  created_at timestamp default now(),
  updated_at timestamp default now(),
  constraint payments_paid_lte_total check (paid_amount <= total_amount)
);

create table if not exists recalls (
  id uuid primary key default gen_random_uuid(),
  cabinet_id uuid references cabinets(id) on delete cascade,
  patient_id uuid references patients(id) on delete cascade,
  recall_type text,
  last_visit_date date,
  next_recall_date date,
  status text default 'Planifié',
  notes text,
  created_at timestamp default now()
);

create table if not exists review_requests (
  id uuid primary key default gen_random_uuid(),
  cabinet_id uuid references cabinets(id) on delete cascade,
  patient_id uuid references patients(id) on delete cascade,
  appointment_id uuid references appointments(id) on delete set null,
  status text default 'Non envoyé',
  sent_at timestamp,
  reviewed_at timestamp,
  created_at timestamp default now()
);

create table if not exists prescriptions (
  id uuid primary key default gen_random_uuid(),
  cabinet_id uuid references cabinets(id) on delete cascade,
  patient_id uuid references patients(id) on delete cascade,
  doctor_id uuid references profiles(id),
  reference text unique,
  prescription_date date default current_date,
  motif text,
  diagnosis_notes text,
  instructions text,
  status text default 'Brouillon',
  pdf_url text,
  created_at timestamp default now(),
  updated_at timestamp default now()
);

create table if not exists prescription_items (
  id uuid primary key default gen_random_uuid(),
  prescription_id uuid references prescriptions(id) on delete cascade,
  medication_name text,
  dosage text,
  frequency text,
  duration text,
  instructions text,
  created_at timestamp default now()
);

create table if not exists favorite_medications (
  id uuid primary key default gen_random_uuid(),
  cabinet_id uuid references cabinets(id) on delete cascade,
  name text not null,
  category text,
  default_dosage text,
  default_frequency text,
  default_duration text,
  default_instructions text,
  internal_notes text,
  created_at timestamp default now(),
  updated_at timestamp default now()
);

create table if not exists medical_certificates (
  id uuid primary key default gen_random_uuid(),
  cabinet_id uuid references cabinets(id) on delete cascade,
  patient_id uuid references patients(id) on delete cascade,
  doctor_id uuid references profiles(id),
  reference text unique,
  certificate_date date default current_date,
  certificate_type text,
  motif text,
  start_date date,
  end_date date,
  rest_duration text,
  observations text,
  internal_notes text,
  certificate_text text,
  status text default 'Brouillon',
  pdf_url text,
  created_at timestamp default now(),
  updated_at timestamp default now()
);

create table if not exists document_templates (
  id uuid primary key default gen_random_uuid(),
  cabinet_id uuid references cabinets(id) on delete cascade,
  type text check (type in ('prescription', 'certificate', 'whatsapp_message')),
  name text not null,
  description text,
  content jsonb,
  is_default boolean default false,
  created_at timestamp default now(),
  updated_at timestamp default now()
);

create table if not exists whatsapp_logs (
  id uuid primary key default gen_random_uuid(),
  cabinet_id uuid references cabinets(id) on delete cascade,
  patient_id uuid references patients(id) on delete set null,
  type text,
  message text,
  phone text,
  status text default 'Préparé',
  sent_by uuid references profiles(id),
  sent_at timestamp default now()
);

create table if not exists settings (
  id uuid primary key default gen_random_uuid(),
  cabinet_id uuid references cabinets(id) on delete cascade,
  key text,
  value jsonb,
  created_at timestamp default now(),
  updated_at timestamp default now(),
  unique (cabinet_id, key)
);

create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function sync_payment_remaining_amount()
returns trigger language plpgsql as $$
begin
  new.remaining_amount = greatest(coalesce(new.total_amount, 0) - coalesce(new.paid_amount, 0), 0);
  return new;
end;
$$;

drop trigger if exists patients_set_updated_at on patients;
create trigger patients_set_updated_at before update on patients for each row execute function set_updated_at();
drop trigger if exists payments_set_updated_at on payments;
create trigger payments_set_updated_at before update on payments for each row execute function set_updated_at();
drop trigger if exists prescriptions_set_updated_at on prescriptions;
create trigger prescriptions_set_updated_at before update on prescriptions for each row execute function set_updated_at();
drop trigger if exists favorite_medications_set_updated_at on favorite_medications;
create trigger favorite_medications_set_updated_at before update on favorite_medications for each row execute function set_updated_at();
drop trigger if exists medical_certificates_set_updated_at on medical_certificates;
create trigger medical_certificates_set_updated_at before update on medical_certificates for each row execute function set_updated_at();
drop trigger if exists settings_set_updated_at on settings;
create trigger settings_set_updated_at before update on settings for each row execute function set_updated_at();
drop trigger if exists document_templates_set_updated_at on document_templates;
create trigger document_templates_set_updated_at before update on document_templates for each row execute function set_updated_at();
drop trigger if exists payments_sync_remaining on payments;
create trigger payments_sync_remaining before insert or update on payments for each row execute function sync_payment_remaining_amount();

create index if not exists profiles_cabinet_id_idx on profiles(cabinet_id);
create index if not exists patients_cabinet_id_idx on patients(cabinet_id);
create index if not exists appointments_cabinet_id_idx on appointments(cabinet_id);
create index if not exists payments_cabinet_id_idx on payments(cabinet_id);
create index if not exists recalls_cabinet_id_idx on recalls(cabinet_id);
create index if not exists review_requests_cabinet_id_idx on review_requests(cabinet_id);
create index if not exists prescriptions_cabinet_id_idx on prescriptions(cabinet_id);
create index if not exists favorite_medications_cabinet_id_idx on favorite_medications(cabinet_id);
create index if not exists medical_certificates_cabinet_id_idx on medical_certificates(cabinet_id);
create index if not exists document_templates_cabinet_id_idx on document_templates(cabinet_id);
create index if not exists whatsapp_logs_cabinet_id_idx on whatsapp_logs(cabinet_id);
create index if not exists settings_cabinet_id_idx on settings(cabinet_id);

create index if not exists appointments_patient_id_idx on appointments(patient_id);
create index if not exists payments_patient_id_idx on payments(patient_id);
create index if not exists recalls_patient_id_idx on recalls(patient_id);
create index if not exists review_requests_patient_id_idx on review_requests(patient_id);
create index if not exists prescriptions_patient_id_idx on prescriptions(patient_id);
create index if not exists prescription_items_prescription_id_idx on prescription_items(prescription_id);
create index if not exists medical_certificates_patient_id_idx on medical_certificates(patient_id);
create index if not exists whatsapp_logs_patient_id_idx on whatsapp_logs(patient_id);

create index if not exists patients_status_idx on patients(status);
create index if not exists appointments_status_idx on appointments(status);
create index if not exists payments_status_idx on payments(status);
create index if not exists recalls_status_idx on recalls(status);
create index if not exists review_requests_status_idx on review_requests(status);
create index if not exists prescriptions_status_idx on prescriptions(status);
create index if not exists medical_certificates_status_idx on medical_certificates(status);

create index if not exists patients_created_at_idx on patients(created_at);
create index if not exists appointments_created_at_idx on appointments(created_at);
create index if not exists payments_created_at_idx on payments(created_at);
create index if not exists recalls_created_at_idx on recalls(created_at);
create index if not exists review_requests_created_at_idx on review_requests(created_at);
create index if not exists prescriptions_created_at_idx on prescriptions(created_at);
create index if not exists favorite_medications_created_at_idx on favorite_medications(created_at);
create index if not exists medical_certificates_created_at_idx on medical_certificates(created_at);
create index if not exists whatsapp_logs_sent_at_idx on whatsapp_logs(sent_at);

alter table cabinets enable row level security;
alter table profiles enable row level security;
alter table patients enable row level security;
alter table appointments enable row level security;
alter table payments enable row level security;
alter table recalls enable row level security;
alter table review_requests enable row level security;
alter table prescriptions enable row level security;
alter table prescription_items enable row level security;
alter table favorite_medications enable row level security;
alter table medical_certificates enable row level security;
alter table document_templates enable row level security;
alter table whatsapp_logs enable row level security;
alter table settings enable row level security;

create or replace function current_profile_cabinet_id()
returns uuid language sql stable security definer set search_path = public as $$
  select cabinet_id from profiles where id = auth.uid()
$$;

create or replace function current_profile_role()
returns text language sql stable security definer set search_path = public as $$
  select role from profiles where id = auth.uid()
$$;

create or replace function same_cabinet(target_cabinet uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select target_cabinet = current_profile_cabinet_id()
$$;

create policy cabinets_select_own on cabinets for select using (same_cabinet(id));
create policy cabinets_update_admin on cabinets for update using (same_cabinet(id) and current_profile_role() = 'admin') with check (same_cabinet(id));

create policy profiles_select_own_or_admin on profiles for select using (id = auth.uid() or (same_cabinet(cabinet_id) and current_profile_role() = 'admin'));
create policy profiles_insert_admin on profiles for insert with check (same_cabinet(cabinet_id) and current_profile_role() = 'admin');
create policy profiles_update_own_or_admin on profiles for update using (id = auth.uid() or (same_cabinet(cabinet_id) and current_profile_role() = 'admin')) with check (same_cabinet(cabinet_id));
create policy profiles_delete_admin on profiles for delete using (same_cabinet(cabinet_id) and current_profile_role() = 'admin' and id <> auth.uid());

create policy patients_all on patients for all using (same_cabinet(cabinet_id)) with check (same_cabinet(cabinet_id));
create policy appointments_all on appointments for all using (same_cabinet(cabinet_id)) with check (same_cabinet(cabinet_id));
create policy payments_all on payments for all using (same_cabinet(cabinet_id)) with check (same_cabinet(cabinet_id));
create policy recalls_all on recalls for all using (same_cabinet(cabinet_id)) with check (same_cabinet(cabinet_id));
create policy review_requests_all on review_requests for all using (same_cabinet(cabinet_id)) with check (same_cabinet(cabinet_id));
create policy prescriptions_all on prescriptions for all using (same_cabinet(cabinet_id)) with check (same_cabinet(cabinet_id));
create policy favorite_medications_all on favorite_medications for all using (same_cabinet(cabinet_id)) with check (same_cabinet(cabinet_id));
create policy medical_certificates_all on medical_certificates for all using (same_cabinet(cabinet_id)) with check (same_cabinet(cabinet_id));
create policy document_templates_all on document_templates for all using (same_cabinet(cabinet_id)) with check (same_cabinet(cabinet_id));
create policy whatsapp_logs_all on whatsapp_logs for all using (same_cabinet(cabinet_id)) with check (same_cabinet(cabinet_id));
create policy settings_all on settings for all using (same_cabinet(cabinet_id)) with check (same_cabinet(cabinet_id));
create policy prescription_items_all on prescription_items for all using (
  exists (
    select 1 from prescriptions p
    where p.id = prescription_items.prescription_id and same_cabinet(p.cabinet_id)
  )
) with check (
  exists (
    select 1 from prescriptions p
    where p.id = prescription_items.prescription_id and same_cabinet(p.cabinet_id)
  )
);

-- Demo data. Replace demo-doctor-id with a real auth.users id before linking a profile.
with demo_cabinet as (
  insert into cabinets (name, dentist_name, address, city, phone, whatsapp_number, google_review_link)
  values ('Cabinet Atlas — Casablanca', 'Dr. Safaa M’gassy', '22 Boulevard Zerktouni, Maarif', 'Casablanca', '+212 522 44 10 20', '+212 661 23 45 00', 'https://g.page/r/cabinet-atlas-casablanca/review')
  on conflict do nothing
  returning id
),
cab as (
  select id from demo_cabinet
  union all
  select id from cabinets where name = 'Cabinet Atlas — Casablanca' limit 1
),
patients_seed as (
  insert into patients (cabinet_id, full_name, phone, email, age, gender, status, notes)
  select cab.id, p.full_name, p.phone, p.email, p.age, p.gender, p.status, p.notes
  from cab, (values
    ('Yasmine El Amrani', '+212 661 23 45 67', 'yasmine.elamrani@gmail.com', 34, 'F', 'Paiement dû', 'Allergie pénicilline'),
    ('Omar Benjelloun', '+212 670 88 21 04', 'omar.benjelloun@outlook.com', 42, 'M', 'Actif', 'Contrôle post-extraction'),
    ('Salma Tazi', '+212 662 19 77 30', 'salma.tazi@gmail.com', 29, 'F', 'Rappel dû', 'Détartrage semestriel'),
    ('Karim Bennani', '+212 665 44 12 90', 'karim.bennani@gmail.com', 51, 'M', 'Suivi', 'Implant secteur 2')
  ) as p(full_name, phone, email, age, gender, status, notes)
  returning id, full_name, cabinet_id
)
insert into settings (cabinet_id, key, value)
select id, 'demo', '{"enabled": true, "country": "MA", "currency": "MAD"}'::jsonb from cab
on conflict (cabinet_id, key) do nothing;

insert into favorite_medications (cabinet_id, name, category, default_dosage, default_frequency, default_duration, default_instructions)
select id, 'Preset antalgique à valider', 'Douleur', '', '', '', 'Modèle éditable uniquement. Le dentiste valide la prescription finale.' from cabinets where name = 'Cabinet Atlas — Casablanca'
on conflict do nothing;

insert into document_templates (cabinet_id, type, name, description, content, is_default)
select id, 'whatsapp_message', 'Rappel rendez-vous', 'Message WhatsApp standard', '{"message": "Bonjour {{Patient}}, rappel de votre rendez-vous au cabinet."}'::jsonb, true
from cabinets where name = 'Cabinet Atlas — Casablanca'
on conflict do nothing;
