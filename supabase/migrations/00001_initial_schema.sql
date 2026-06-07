-- ============================================
-- CricketClub - Initial Schema
-- ============================================

-- Profiles (extends auth.users)
CREATE TABLE profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  first_name text NOT NULL,
  last_name text NOT NULL,
  avatar_url text,
  phone text,
  paypal_email text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Profiles are viewable by authenticated users" ON profiles
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE TO authenticated USING (id = auth.uid());

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, first_name, last_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'last_name', '')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================
-- Clubs
-- ============================================

CREATE TABLE clubs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  logo_url text,
  contact_email text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE clubs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Clubs are viewable by authenticated users" ON clubs
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Clubs are insertable by authenticated users" ON clubs
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Clubs updatable by authenticated" ON clubs
  FOR UPDATE TO authenticated USING (true);

-- ============================================
-- Club Members (junction: user <-> club)
-- ============================================

CREATE TABLE club_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id uuid NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  join_date date NOT NULL DEFAULT current_date,
  player_type text CHECK (player_type IN ('batter', 'bowler', 'all_rounder')),
  batting_hand text CHECK (batting_hand IN ('left', 'right')),
  bowling_type text CHECK (bowling_type IN ('offspin', 'legspin', 'pace')),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (club_id, user_id)
);

ALTER TABLE club_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own memberships" ON club_members
  FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE POLICY "Club members can view co-members" ON club_members
  FOR SELECT TO authenticated
  USING (club_id IN (SELECT cm.club_id FROM club_members cm WHERE cm.user_id = auth.uid()));

CREATE POLICY "Club members insertable by authenticated" ON club_members
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Club members updatable by authenticated" ON club_members
  FOR UPDATE TO authenticated USING (true);

-- ============================================
-- Club Member Roles (one row per role)
-- ============================================

CREATE TABLE club_member_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id uuid NOT NULL REFERENCES club_members(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('admin', 'captain', 'player')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (member_id, role)
);

ALTER TABLE club_member_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Member roles viewable by authenticated" ON club_member_roles
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Member roles insertable by authenticated" ON club_member_roles
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Member roles deletable by authenticated" ON club_member_roles
  FOR DELETE TO authenticated USING (true);

-- ============================================
-- Years (seasons within a club)
-- ============================================

CREATE TABLE years (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id uuid NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  year integer NOT NULL,
  label text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (club_id, year)
);

ALTER TABLE years ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Years viewable by authenticated" ON years
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Years insertable by authenticated" ON years
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Years updatable by authenticated" ON years
  FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Years deletable by authenticated" ON years
  FOR DELETE TO authenticated USING (true);

-- ============================================
-- Teams (for a given year, part of a club)
-- ============================================

CREATE TABLE teams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id uuid NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  year_id uuid NOT NULL REFERENCES years(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE teams ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Teams viewable by authenticated" ON teams
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Teams insertable by authenticated" ON teams
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Teams updatable by authenticated" ON teams
  FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Teams deletable by authenticated" ON teams
  FOR DELETE TO authenticated USING (true);

-- ============================================
-- Team Members (roster + captain flag)
-- ============================================

CREATE TABLE team_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  is_captain boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (team_id, user_id)
);

ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Team members viewable by authenticated" ON team_members
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Team members insertable by authenticated" ON team_members
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Team members updatable by authenticated" ON team_members
  FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Team members deletable by authenticated" ON team_members
  FOR DELETE TO authenticated USING (true);

-- ============================================
-- Games (belong to a team)
-- ============================================

CREATE TABLE games (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  opponent text NOT NULL,
  location text,
  game_date date NOT NULL,
  game_time time,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE games ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Games viewable by authenticated" ON games
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Games insertable by authenticated" ON games
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Games updatable by authenticated" ON games
  FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Games deletable by authenticated" ON games
  FOR DELETE TO authenticated USING (true);

-- ============================================
-- Game Selections (saved squad / playing XI)
-- ============================================

CREATE TABLE game_selections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id uuid NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  batting_order integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (game_id, user_id)
);

ALTER TABLE game_selections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Selections viewable by authenticated" ON game_selections
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Selections insertable by authenticated" ON game_selections
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Selections updatable by authenticated" ON game_selections
  FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Selections deletable by authenticated" ON game_selections
  FOR DELETE TO authenticated USING (true);

-- ============================================
-- Expenses (club / team / game level)
-- ============================================

CREATE TABLE expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id uuid NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  year_id uuid REFERENCES years(id) ON DELETE SET NULL,
  team_id uuid REFERENCES teams(id) ON DELETE CASCADE,
  game_id uuid REFERENCES games(id) ON DELETE CASCADE,
  description text NOT NULL,
  amount_cents integer NOT NULL,
  category text NOT NULL DEFAULT 'other'
    CHECK (category IN ('ground_booking', 'equipment', 'travel', 'food', 'umpire', 'registration', 'kit', 'other')),
  expense_date date NOT NULL DEFAULT current_date,
  created_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Expenses viewable by authenticated" ON expenses
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Expenses insertable by authenticated" ON expenses
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Expenses updatable by authenticated" ON expenses
  FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Expenses deletable by authenticated" ON expenses
  FOR DELETE TO authenticated USING (true);

-- ============================================
-- Payments (admin creates, assigns to users)
-- ============================================

CREATE TABLE payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id uuid NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  amount_cents integer NOT NULL,
  due_date date,
  created_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Payments viewable by authenticated" ON payments
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Payments insertable by authenticated" ON payments
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Payments updatable by authenticated" ON payments
  FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Payments deletable by authenticated" ON payments
  FOR DELETE TO authenticated USING (true);

-- ============================================
-- Payment Assignments (one per assigned user)
-- ============================================

CREATE TABLE payment_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id uuid NOT NULL REFERENCES payments(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'cancelled')),
  paid_at timestamptz,
  paypal_order_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (payment_id, user_id)
);

ALTER TABLE payment_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own assignments" ON payment_assignments
  FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE POLICY "Assignments viewable by authenticated" ON payment_assignments
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Assignments insertable by authenticated" ON payment_assignments
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Assignments updatable by authenticated" ON payment_assignments
  FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Assignments deletable by authenticated" ON payment_assignments
  FOR DELETE TO authenticated USING (true);

-- ============================================
-- Indexes for performance
-- ============================================

CREATE INDEX idx_club_members_club_id ON club_members(club_id);
CREATE INDEX idx_club_members_user_id ON club_members(user_id);
CREATE INDEX idx_club_member_roles_member_id ON club_member_roles(member_id);
CREATE INDEX idx_years_club_id ON years(club_id);
CREATE INDEX idx_teams_club_id ON teams(club_id);
CREATE INDEX idx_teams_year_id ON teams(year_id);
CREATE INDEX idx_team_members_team_id ON team_members(team_id);
CREATE INDEX idx_team_members_user_id ON team_members(user_id);
CREATE INDEX idx_games_team_id ON games(team_id);
CREATE INDEX idx_games_game_date ON games(game_date);
CREATE INDEX idx_game_selections_game_id ON game_selections(game_id);
CREATE INDEX idx_expenses_club_id ON expenses(club_id);
CREATE INDEX idx_expenses_team_id ON expenses(team_id);
CREATE INDEX idx_expenses_game_id ON expenses(game_id);
CREATE INDEX idx_expenses_year_id ON expenses(year_id);
CREATE INDEX idx_payments_club_id ON payments(club_id);
CREATE INDEX idx_payment_assignments_payment_id ON payment_assignments(payment_id);
CREATE INDEX idx_payment_assignments_user_id ON payment_assignments(user_id);

-- ============================================
-- Storage buckets
-- ============================================

INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true);
INSERT INTO storage.buckets (id, name, public) VALUES ('club-logos', 'club-logos', true);

CREATE POLICY "Avatar images are publicly accessible" ON storage.objects
  FOR SELECT USING (bucket_id = 'avatars');

CREATE POLICY "Users can upload own avatar" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can update own avatar" ON storage.objects
  FOR UPDATE USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can delete own avatar" ON storage.objects
  FOR DELETE USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Club logos are publicly accessible" ON storage.objects
  FOR SELECT USING (bucket_id = 'club-logos');

CREATE POLICY "Club logos uploadable by authenticated" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'club-logos');

CREATE POLICY "Club logos updatable by authenticated" ON storage.objects
  FOR UPDATE USING (bucket_id = 'club-logos');

CREATE POLICY "Club logos deletable by authenticated" ON storage.objects
  FOR DELETE USING (bucket_id = 'club-logos');
