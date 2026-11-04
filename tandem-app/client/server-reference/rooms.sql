CREATE TABLE IF NOT EXISTS rooms (
  code VARCHAR(8) PRIMARY KEY,
  phase TEXT NOT NULL DEFAULT 'waiting' CHECK (phase IN ('waiting','question','reveal','final')),
  round INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS room_players (
  room_code VARCHAR(8) REFERENCES rooms(code) ON DELETE CASCADE,
  player_key TEXT NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('player','spectator')),
  score INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (room_code, player_key)
);
CREATE TABLE IF NOT EXISTS round_answers (
  room_code VARCHAR(8) REFERENCES rooms(code) ON DELETE CASCADE,
  round INTEGER NOT NULL,
  player_key TEXT NOT NULL,
  choice INTEGER NOT NULL,
  correct BOOLEAN NOT NULL,
  PRIMARY KEY (room_code, round, player_key)
);
CREATE TABLE IF NOT EXISTS spectator_messages (
  id SERIAL PRIMARY KEY,
  room_code VARCHAR(8) REFERENCES rooms(code) ON DELETE CASCADE,
  name TEXT NOT NULL,
  text VARCHAR(300) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Clues
ALTER TABLE round_answers ADD COLUMN IF NOT EXISTS hints_used TEXT[] NOT NULL DEFAULT '{}';
ALTER TABLE words ADD COLUMN IF NOT EXISTS category TEXT;
ALTER TABLE words ADD COLUMN IF NOT EXISTS example TEXT;
