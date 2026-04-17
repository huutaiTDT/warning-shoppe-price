-- ========================
-- MIGRATION 05: AFF AUTOMATION - ACCOUNT SETTINGS + POST SCHEDULING
-- ========================

-- 1) Account settings for each social platform account/page
CREATE TABLE IF NOT EXISTS account_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  external_id VARCHAR(255),
  page_id VARCHAR(255),
  token TEXT,
  platform VARCHAR(20) NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT chk_account_settings_platform
    CHECK (platform IN ('facebook', 'tiktok', 'threads', 'instagram'))
);

CREATE INDEX IF NOT EXISTS idx_account_settings_platform
ON account_settings(platform);

CREATE INDEX IF NOT EXISTS idx_account_settings_active
ON account_settings(is_active);

-- 2) Post schedules (1 product can have many post schedules)
CREATE TABLE IF NOT EXISTS post_schedules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID REFERENCES products_aff(id) ON DELETE SET NULL,
  title VARCHAR(500) NOT NULL,
  description TEXT,
  galleries JSONB NOT NULL DEFAULT '[]'::jsonb,
  publish_date TIMESTAMP NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'scheduled',
  retry_max INTEGER NOT NULL DEFAULT 3,
  retry_count INTEGER NOT NULL DEFAULT 0,
  error_message TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT chk_post_schedules_status
    CHECK (status IN ('draft', 'scheduled', 'running', 'completed', 'partial_failed', 'failed', 'cancelled'))
);

CREATE INDEX IF NOT EXISTS idx_post_schedules_publish_date
ON post_schedules(publish_date);

CREATE INDEX IF NOT EXISTS idx_post_schedules_status
ON post_schedules(status);

CREATE INDEX IF NOT EXISTS idx_post_schedules_product_id
ON post_schedules(product_id);

-- 3) Targets per account/platform for each schedule
CREATE TABLE IF NOT EXISTS post_schedule_targets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_schedule_id UUID NOT NULL REFERENCES post_schedules(id) ON DELETE CASCADE,
  account_setting_id UUID NOT NULL REFERENCES account_settings(id) ON DELETE CASCADE,
  platform VARCHAR(20) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  retry_count INTEGER NOT NULL DEFAULT 0,
  error_message TEXT,
  response_payload JSONB,
  posted_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT chk_post_schedule_targets_platform
    CHECK (platform IN ('facebook', 'tiktok', 'threads', 'instagram')),
  CONSTRAINT chk_post_schedule_targets_status
    CHECK (status IN ('pending', 'posting', 'posted', 'failed', 'cancelled')),
  CONSTRAINT uq_schedule_account_platform
    UNIQUE (post_schedule_id, account_setting_id, platform)
);

CREATE INDEX IF NOT EXISTS idx_post_schedule_targets_schedule
ON post_schedule_targets(post_schedule_id);

CREATE INDEX IF NOT EXISTS idx_post_schedule_targets_status
ON post_schedule_targets(status);

CREATE INDEX IF NOT EXISTS idx_post_schedule_targets_account
ON post_schedule_targets(account_setting_id);
