-- ============================================
-- Pittari - Supabase テーブルセットアップ
-- Supabase ダッシュボード > SQL Editor で実行してください
-- ============================================

-- 1. events テーブル
CREATE TABLE events (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  dates JSONB NOT NULL,
  time_start TEXT NOT NULL DEFAULT '09:00',
  time_end TEXT NOT NULL DEFAULT '21:00',
  deadline TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. responses テーブル
CREATE TABLE responses (
  id SERIAL PRIMARY KEY,
  event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slots JSONB NOT NULL,
  comment TEXT DEFAULT '',
  responded_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(event_id, name)
);

-- 3. インデックス
CREATE INDEX idx_responses_event_id ON responses(event_id);

-- 4. RLS (Row Level Security) を有効化
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE responses ENABLE ROW LEVEL SECURITY;

-- 5. RLS ポリシー: 誰でも読み書き可能（認証なしアプリのため）
-- events
CREATE POLICY "Allow public read events" ON events FOR SELECT USING (true);
CREATE POLICY "Allow public insert events" ON events FOR INSERT WITH CHECK (true);

-- responses
CREATE POLICY "Allow public read responses" ON responses FOR SELECT USING (true);
CREATE POLICY "Allow public insert responses" ON responses FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update responses" ON responses FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Allow public delete responses" ON responses FOR DELETE USING (true);
