-- ============================================================
-- Golf Charity Subscription Platform - Supabase Schema
-- Run this in Supabase SQL Editor
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- CHARITIES
-- ============================================================
CREATE TABLE charities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  website VARCHAR(500),
  logo_url VARCHAR(500),
  total_raised DECIMAL(10,2) DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- USERS
-- ============================================================
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  full_name VARCHAR(255) NOT NULL,
  role VARCHAR(20) DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  is_active BOOLEAN DEFAULT true,
  charity_id UUID REFERENCES charities(id),
  charity_contribution_percent DECIMAL(5,2) DEFAULT 10.00 CHECK (charity_contribution_percent >= 10 AND charity_contribution_percent <= 100),
  stripe_customer_id VARCHAR(255) UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_charity ON users(charity_id);

-- ============================================================
-- SUBSCRIPTIONS
-- ============================================================
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  stripe_subscription_id VARCHAR(255) UNIQUE NOT NULL,
  stripe_customer_id VARCHAR(255) NOT NULL,
  plan VARCHAR(20) NOT NULL CHECK (plan IN ('monthly', 'yearly')),
  status VARCHAR(30) NOT NULL DEFAULT 'active' 
    CHECK (status IN ('active', 'cancelled', 'expired', 'past_due', 'trialing')),
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_subscriptions_user ON subscriptions(user_id);
CREATE INDEX idx_subscriptions_status ON subscriptions(status);

-- ============================================================
-- GOLF SCORES
-- ============================================================
CREATE TABLE golf_scores (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  score INTEGER NOT NULL CHECK (score >= 1 AND score <= 45),
  played_at DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_scores_user ON golf_scores(user_id);
CREATE INDEX idx_scores_played_at ON golf_scores(user_id, played_at DESC);

-- ============================================================
-- DRAWS
-- ============================================================
CREATE TABLE draws (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  draw_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  winning_numbers INTEGER[] NOT NULL,
  prize_pool DECIMAL(10,2) NOT NULL DEFAULT 0,
  rollover_amount DECIMAL(10,2) DEFAULT 0,
  jackpot_rolled_over BOOLEAN DEFAULT false,
  status VARCHAR(20) DEFAULT 'pending' 
    CHECK (status IN ('pending', 'completed', 'published', 'cancelled')),
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_draws_status ON draws(status);
CREATE INDEX idx_draws_date ON draws(draw_date DESC);

-- ============================================================
-- DRAW WINNERS
-- ============================================================
CREATE TABLE draw_winners (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  draw_id UUID NOT NULL REFERENCES draws(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id),
  match_count INTEGER NOT NULL CHECK (match_count IN (3, 4, 5)),
  prize_amount DECIMAL(10,2) NOT NULL,
  payment_status VARCHAR(30) DEFAULT 'pending'
    CHECK (payment_status IN ('pending', 'proof_submitted', 'approved', 'rejected', 'paid')),
  proof_url TEXT,
  proof_submitted_at TIMESTAMPTZ,
  rejection_reason TEXT,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_winners_draw ON draw_winners(draw_id);
CREATE INDEX idx_winners_user ON draw_winners(user_id);
CREATE INDEX idx_winners_status ON draw_winners(payment_status);

-- ============================================================
-- UPDATED_AT TRIGGER FUNCTION
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_users_updated BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_charities_updated BEFORE UPDATE ON charities FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_subscriptions_updated BEFORE UPDATE ON subscriptions FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_draws_updated BEFORE UPDATE ON draws FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_winners_updated BEFORE UPDATE ON draw_winners FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- SEED DATA - Default Charities
-- ============================================================
INSERT INTO charities (name, description, website) VALUES
  ('Cancer Research UK', 'Funding life-saving cancer research and clinical trials worldwide.', 'https://www.cancerresearchuk.org'),
  ('British Heart Foundation', 'Fighting heart and circulatory diseases through research and education.', 'https://www.bhf.org.uk'),
  ('Macmillan Cancer Support', 'Providing medical, emotional and financial support to people with cancer.', 'https://www.macmillan.org.uk'),
  ('Age UK', 'Supporting older people to live well and independently.', 'https://www.ageuk.org.uk'),
  ('RNLI', 'Saving lives at sea with volunteer lifeboat crews.', 'https://rnli.org'),
  ('Oxfam', 'Fighting poverty and injustice around the world.', 'https://www.oxfam.org.uk'),
  ('Save the Children', 'Protecting children''s rights and improving their lives globally.', 'https://www.savethechildren.org.uk'),
  ('WWF', 'Protecting wildlife and the natural environment.', 'https://www.wwf.org.uk'),
  ('Mind', 'Mental health support and advocacy in England and Wales.', 'https://www.mind.org.uk'),
  ('Comic Relief', 'Using the power of entertainment to change lives.', 'https://www.comicrelief.com');

-- ============================================================
-- SEED DATA - Default Admin User
-- Password: Admin@123456 (bcrypt hash)
-- CHANGE THIS IN PRODUCTION
-- ============================================================
INSERT INTO users (email, password_hash, full_name, role, charity_id)
SELECT 
  'admin@golfcharity.com',
  '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4J/HS.iK8i',
  'Platform Admin',
  'admin',
  id
FROM charities LIMIT 1;
