-- 07-add-guides-table.sql
-- Table to store usage guides for API and UI
CREATE TABLE IF NOT EXISTS guides (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  code VARCHAR(100) UNIQUE NOT NULL,
  content TEXT DEFAULT '', -- stores HTML content
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Trigger to update updated_at on row modification
CREATE OR REPLACE FUNCTION trigger_set_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_timestamp ON guides;
CREATE TRIGGER set_timestamp
BEFORE UPDATE ON guides
FOR EACH ROW
EXECUTE PROCEDURE trigger_set_timestamp();
