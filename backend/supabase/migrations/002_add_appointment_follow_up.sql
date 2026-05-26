ALTER TABLE appointments
ADD COLUMN IF NOT EXISTS follow_up_status text DEFAULT 'Aucun suivi',
ADD COLUMN IF NOT EXISTS follow_up_note text,
ADD COLUMN IF NOT EXISTS follow_up_updated_at timestamp;
