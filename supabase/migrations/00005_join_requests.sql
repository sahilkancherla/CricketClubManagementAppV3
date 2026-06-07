-- ============================================
-- Club Join Requests
-- A user asks to join a club; an admin approves (→ becomes a member) or rejects.
-- ============================================

CREATE TABLE club_join_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id uuid NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  player_type text CHECK (player_type IN ('batter', 'bowler', 'all_rounder')),
  batting_hand text CHECK (batting_hand IN ('left', 'right')),
  bowling_type text CHECK (bowling_type IN ('offspin', 'legspin', 'pace')),
  message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (club_id, user_id)
);

ALTER TABLE club_join_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Join requests viewable by authenticated" ON club_join_requests
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Join requests insertable by authenticated" ON club_join_requests
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Join requests updatable by authenticated" ON club_join_requests
  FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Join requests deletable by authenticated" ON club_join_requests
  FOR DELETE TO authenticated USING (true);

CREATE INDEX idx_club_join_requests_club_id ON club_join_requests(club_id);
CREATE INDEX idx_club_join_requests_user_id ON club_join_requests(user_id);
