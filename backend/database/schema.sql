-- ============================================================
-- LetsDoItSmartly — Database Schema
-- MySQL 5.7+ · utf8mb4 · InnoDB
-- ============================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ------------------------------------------------------------
-- 1. staff_users — internal portal accounts (all 6 internal roles)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS staff_users (
  id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name            VARCHAR(100) NOT NULL,
  email           VARCHAR(150) NOT NULL UNIQUE,
  password_hash   VARCHAR(255) NOT NULL,
  role            ENUM('super_admin','admin','account_manager','support_admin','backoffice','auditor') NOT NULL,
  is_active       TINYINT(1) NOT NULL DEFAULT 1,
  password_reset_required TINYINT(1) NOT NULL DEFAULT 0,
  totp_secret     VARCHAR(64) DEFAULT NULL,
  totp_enabled    TINYINT(1) NOT NULL DEFAULT 0,
  last_login_at   DATETIME DEFAULT NULL,
  created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ------------------------------------------------------------
-- 2. billing_entities — companies / clients (license boundary)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS billing_entities (
  id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name            VARCHAR(150) NOT NULL,
  slug            VARCHAR(60)  NOT NULL UNIQUE,   -- used in OU path
  gst_number      VARCHAR(20)  DEFAULT NULL,
  contact_email   VARCHAR(150) NOT NULL,
  contact_phone   VARCHAR(20)  DEFAULT NULL,
  address         TEXT         DEFAULT NULL,
  renewal_date    DATE         NOT NULL,           -- anniversary date
  auto_suspend    TINYINT(1)   NOT NULL DEFAULT 0, -- 1 = suspended for non-payment
  distributor_id  INT UNSIGNED DEFAULT NULL,       -- NULL = direct client
  welcome_email_sender_name VARCHAR(100) DEFAULT NULL,
  welcome_email_body        TEXT         DEFAULT NULL,
  created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ------------------------------------------------------------
-- 3. domains — each domain belongs to one billing entity
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS domains (
  id                  INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  billing_entity_id   INT UNSIGNED NOT NULL,
  name                VARCHAR(150) NOT NULL UNIQUE,  -- e.g. abc.com
  ou_path             VARCHAR(255) NOT NULL,          -- e.g. defaultOU/abc
  is_active           TINYINT(1) NOT NULL DEFAULT 1,
  created_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (billing_entity_id) REFERENCES billing_entities(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ------------------------------------------------------------
-- 4. plans — pricing config, editable by super_admin only
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS plans (
  id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  slug            ENUM('basic','pro','enterprise','premium') NOT NULL UNIQUE,
  name            VARCHAR(60) NOT NULL,
  price_per_year  DECIMAL(10,2) NOT NULL,
  ou_suffix       VARCHAR(10) NOT NULL,   -- b / p / e / pre
  color_hex       VARCHAR(10) NOT NULL DEFAULT '#6366f1',
  is_active       TINYINT(1) NOT NULL DEFAULT 1,
  updated_by      INT UNSIGNED DEFAULT NULL,  -- staff_users.id
  updated_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- seed data handled in migrate script

-- ------------------------------------------------------------
-- 5. license_pool — one row per billing_entity per plan
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS license_pool (
  id                  INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  billing_entity_id   INT UNSIGNED NOT NULL,
  plan_slug           ENUM('basic','pro','enterprise','premium') NOT NULL,
  allocated           INT UNSIGNED NOT NULL DEFAULT 0,  -- total purchased
  used                INT UNSIGNED NOT NULL DEFAULT 0,  -- currently assigned
  updated_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_entity_plan (billing_entity_id, plan_slug),
  FOREIGN KEY (billing_entity_id) REFERENCES billing_entities(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ------------------------------------------------------------
-- 6. license_purchases — every buy / renewal transaction
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS license_purchases (
  id                  INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  billing_entity_id   INT UNSIGNED NOT NULL,
  plan_slug           ENUM('basic','pro','enterprise','premium') NOT NULL,
  quantity            INT UNSIGNED NOT NULL,
  price_per_year      DECIMAL(10,2) NOT NULL,   -- snapshot at purchase time
  pro_rata_days       INT UNSIGNED NOT NULL,
  pro_rata_amount     DECIMAL(10,2) NOT NULL,
  discount_amount     DECIMAL(10,2) NOT NULL DEFAULT 0,  -- coupon discount
  net_amount          DECIMAL(10,2) NOT NULL,
  promo_code          VARCHAR(30) DEFAULT NULL,
  purchase_type       ENUM('new','renewal','upgrade') NOT NULL DEFAULT 'new',
  from_plan_slug      ENUM('basic','pro','enterprise','premium') DEFAULT NULL, -- for upgrades
  payment_status      ENUM('pending','paid','failed') NOT NULL DEFAULT 'pending',
  zoho_payment_id     VARCHAR(100) DEFAULT NULL,
  zoho_invoice_id     VARCHAR(100) DEFAULT NULL,
  zoho_invoice_number VARCHAR(50)  DEFAULT NULL,
  purchased_by        INT UNSIGNED DEFAULT NULL,  -- domain_owner portal_users.id
  created_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (billing_entity_id) REFERENCES billing_entities(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ------------------------------------------------------------
-- 7. portal_users — domain owners / master users (external login)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS portal_users (
  id                      INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  billing_entity_id       INT UNSIGNED NOT NULL,
  name                    VARCHAR(100) NOT NULL,
  email                   VARCHAR(150) NOT NULL UNIQUE,
  password_hash           VARCHAR(255) NOT NULL,
  password_reset_required TINYINT(1) NOT NULL DEFAULT 1,
  totp_secret             VARCHAR(64) DEFAULT NULL,
  totp_enabled            TINYINT(1) NOT NULL DEFAULT 0,
  is_active               TINYINT(1) NOT NULL DEFAULT 1,
  last_login_at           DATETIME DEFAULT NULL,
  created_at              DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at              DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (billing_entity_id) REFERENCES billing_entities(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ------------------------------------------------------------
-- 8. workspace_users — Google Workspace users managed via portal
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS workspace_users (
  id                  INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  domain_id           INT UNSIGNED NOT NULL,
  billing_entity_id   INT UNSIGNED NOT NULL,
  google_user_id      VARCHAR(100) DEFAULT NULL,   -- Google Directory user id
  first_name          VARCHAR(80)  NOT NULL,
  last_name           VARCHAR(80)  NOT NULL,
  email               VARCHAR(150) NOT NULL UNIQUE,
  plan_slug           ENUM('basic','pro','enterprise','premium') NOT NULL,
  ou_path             VARCHAR(255) NOT NULL,        -- full OU at time of last move
  status              ENUM('active','suspended','pending') NOT NULL DEFAULT 'pending',
  created_via_portal  TINYINT(1) NOT NULL DEFAULT 1,
  two_sv_enabled      TINYINT(1) NOT NULL DEFAULT 0,
  storage_used_mb     BIGINT UNSIGNED NOT NULL DEFAULT 0,
  storage_total_mb    BIGINT UNSIGNED NOT NULL DEFAULT 0,
  last_login_at       DATETIME DEFAULT NULL,
  google_created_at   DATETIME DEFAULT NULL,
  created_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (domain_id) REFERENCES domains(id) ON DELETE RESTRICT,
  FOREIGN KEY (billing_entity_id) REFERENCES billing_entities(id) ON DELETE RESTRICT,
  INDEX idx_wu_domain (domain_id),
  INDEX idx_wu_billing (billing_entity_id),
  INDEX idx_wu_status (status),
  INDEX idx_wu_plan (plan_slug)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ------------------------------------------------------------
-- 9. pending_checkouts — tracks payment in-flight (Zoho pattern)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS pending_checkouts (
  id                  INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  reference_number    VARCHAR(40) NOT NULL UNIQUE,
  checkout_type       ENUM('LICENSE_PURCHASE','RENEWAL','UPGRADE') NOT NULL,
  billing_entity_id   INT UNSIGNED NOT NULL,
  plan_slug           ENUM('basic','pro','enterprise','premium') NOT NULL,
  from_plan_slug      ENUM('basic','pro','enterprise','premium') DEFAULT NULL,
  quantity            INT UNSIGNED NOT NULL DEFAULT 1,
  amount              DECIMAL(10,2) NOT NULL,
  promo_code          VARCHAR(30) DEFAULT NULL,
  customer_email      VARCHAR(150) NOT NULL,
  customer_name       VARCHAR(100) NOT NULL,
  customer_phone      VARCHAR(20)  DEFAULT NULL,
  zoho_payment_id     VARCHAR(100) DEFAULT NULL,
  status              ENUM('pending','paid','failed','expired') NOT NULL DEFAULT 'pending',
  initiated_by        INT UNSIGNED DEFAULT NULL,
  created_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  expires_at          DATETIME NOT NULL,
  FOREIGN KEY (billing_entity_id) REFERENCES billing_entities(id) ON DELETE RESTRICT,
  INDEX idx_pc_status (status),
  INDEX idx_pc_ref (reference_number)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ------------------------------------------------------------
-- 10. invoices — Zoho Books invoice record (post-payment)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS invoices (
  id                  INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  billing_entity_id   INT UNSIGNED NOT NULL,
  license_purchase_id INT UNSIGNED DEFAULT NULL,
  zoho_invoice_id     VARCHAR(100) DEFAULT NULL,
  invoice_number      VARCHAR(50)  NOT NULL,
  invoice_date        DATE NOT NULL,
  due_date            DATE NOT NULL,
  plan_slug           ENUM('basic','pro','enterprise','premium') NOT NULL,
  description         VARCHAR(255) NOT NULL,   -- "Charged on pro-rata basis for X.X months"
  rate                DECIMAL(10,2) NOT NULL,  -- annual price
  qty                 INT UNSIGNED NOT NULL DEFAULT 1,
  discount_amount     DECIMAL(10,2) NOT NULL DEFAULT 0,
  net_amount          DECIMAL(10,2) NOT NULL,
  gst_amount          DECIMAL(10,2) NOT NULL DEFAULT 0,
  total_amount        DECIMAL(10,2) NOT NULL,
  status              ENUM('paid','pending','overdue') NOT NULL DEFAULT 'pending',
  pdf_path            VARCHAR(255) DEFAULT NULL,
  created_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (billing_entity_id) REFERENCES billing_entities(id) ON DELETE RESTRICT,
  FOREIGN KEY (license_purchase_id) REFERENCES license_purchases(id) ON DELETE SET NULL,
  INDEX idx_inv_billing (billing_entity_id),
  INDEX idx_inv_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ------------------------------------------------------------
-- 11. promo_codes — coupon / discount codes (super_admin managed)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS promo_codes (
  id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  code            VARCHAR(30) NOT NULL UNIQUE,
  discount_type   ENUM('percent','flat') NOT NULL,
  discount_value  DECIMAL(10,2) NOT NULL,
  label           VARCHAR(100) DEFAULT NULL,
  is_active       TINYINT(1) NOT NULL DEFAULT 1,
  usage_count     INT UNSIGNED NOT NULL DEFAULT 0,
  usage_limit     INT UNSIGNED DEFAULT NULL,   -- NULL = unlimited
  expires_at      DATETIME DEFAULT NULL,
  created_by      INT UNSIGNED NOT NULL,       -- staff_users.id
  created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ------------------------------------------------------------
-- 12. security_links — password reset / invite tokens
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS security_links (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  token       VARCHAR(80) NOT NULL UNIQUE,
  user_type   ENUM('staff','portal') NOT NULL,
  user_id     INT UNSIGNED NOT NULL,
  link_type   ENUM('password_reset','invite','force_reset') NOT NULL,
  status      ENUM('pending','used','expired') NOT NULL DEFAULT 'pending',
  expires_at  DATETIME NOT NULL,
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  used_at     DATETIME DEFAULT NULL,
  INDEX idx_sl_token (token),
  INDEX idx_sl_user (user_type, user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ------------------------------------------------------------
-- 13. user_sessions — login session tracking (JWT + audit)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS user_sessions (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_type   ENUM('staff','portal') NOT NULL,
  user_id     INT UNSIGNED NOT NULL,
  token_hash  VARCHAR(100) NOT NULL UNIQUE,  -- SHA256 of JWT
  ip_address  VARCHAR(45) NOT NULL,
  user_agent  TEXT DEFAULT NULL,
  is_revoked  TINYINT(1) NOT NULL DEFAULT 0,
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expires_at  DATETIME NOT NULL,
  INDEX idx_us_user (user_type, user_id),
  INDEX idx_us_token (token_hash)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ------------------------------------------------------------
-- 14. audit_log — all portal actions by staff + domain owners
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS audit_log (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  actor_type  ENUM('staff','portal') NOT NULL,
  actor_id    INT UNSIGNED NOT NULL,
  actor_name  VARCHAR(100) NOT NULL,
  actor_role  VARCHAR(30) NOT NULL,
  action      VARCHAR(60) NOT NULL,   -- e.g. user_created, plan_changed
  target      VARCHAR(150) DEFAULT NULL,
  detail      TEXT DEFAULT NULL,
  ip_address  VARCHAR(45) DEFAULT NULL,
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_al_actor (actor_type, actor_id),
  INDEX idx_al_action (action),
  INDEX idx_al_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ------------------------------------------------------------
-- 15. renewal_reminders — tracks which reminders have been sent
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS renewal_reminders (
  id                  INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  billing_entity_id   INT UNSIGNED NOT NULL,
  reminder_day        TINYINT UNSIGNED NOT NULL,  -- 7, 3, or 1
  sent_at             DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  renewal_date        DATE NOT NULL,
  UNIQUE KEY uq_reminder (billing_entity_id, reminder_day, renewal_date),
  FOREIGN KEY (billing_entity_id) REFERENCES billing_entities(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ------------------------------------------------------------
-- 16. distributors — external reseller accounts (same as WMD)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS distributors (
  id                      INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name                    VARCHAR(100) NOT NULL,
  email                   VARCHAR(150) NOT NULL UNIQUE,
  password_hash           VARCHAR(255) NOT NULL,
  password_reset_required TINYINT(1) NOT NULL DEFAULT 1,
  status                  ENUM('pending','active','suspended') NOT NULL DEFAULT 'pending',
  commission_rate         DECIMAL(5,2) NOT NULL DEFAULT 10.00,  -- percent
  wallet_balance          DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  gst_number              VARCHAR(20) DEFAULT NULL,
  pan_number              VARCHAR(15) DEFAULT NULL,
  bank_account_holder     VARCHAR(100) DEFAULT NULL,
  bank_name               VARCHAR(100) DEFAULT NULL,
  bank_account_number     VARCHAR(30)  DEFAULT NULL,
  bank_ifsc               VARCHAR(15)  DEFAULT NULL,
  bank_account_type       ENUM('savings','current') DEFAULT NULL,
  upi_id                  VARCHAR(60)  DEFAULT NULL,
  created_at              DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at              DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ------------------------------------------------------------
-- 17. distributor_applications — signup + approval flow
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS distributor_applications (
  id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  first_name      VARCHAR(80) NOT NULL,
  last_name       VARCHAR(80) NOT NULL,
  email           VARCHAR(150) NOT NULL,
  whatsapp        VARCHAR(20) DEFAULT NULL,
  company_name    VARCHAR(100) DEFAULT NULL,
  gst_number      VARCHAR(20) DEFAULT NULL,
  pan_number      VARCHAR(15) DEFAULT NULL,
  city            VARCHAR(60) DEFAULT NULL,
  state           VARCHAR(60) DEFAULT NULL,
  status          ENUM('pending','approved','rejected') NOT NULL DEFAULT 'pending',
  review_notes    TEXT DEFAULT NULL,
  reviewed_by     INT UNSIGNED DEFAULT NULL,  -- staff_users.id
  created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_dapp_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ------------------------------------------------------------
-- 18. distributor_sales — commission tracking per billing entity
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS distributor_sales (
  id                  INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  distributor_id      INT UNSIGNED NOT NULL,
  billing_entity_id   INT UNSIGNED NOT NULL,
  license_purchase_id INT UNSIGNED NOT NULL,
  invoice_amount      DECIMAL(10,2) NOT NULL,
  commission_rate     DECIMAL(5,2) NOT NULL,
  commission_earned   DECIMAL(10,2) NOT NULL,
  status              ENUM('pending','paid','processing') NOT NULL DEFAULT 'pending',
  created_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (distributor_id) REFERENCES distributors(id) ON DELETE RESTRICT,
  FOREIGN KEY (billing_entity_id) REFERENCES billing_entities(id) ON DELETE RESTRICT,
  FOREIGN KEY (license_purchase_id) REFERENCES license_purchases(id) ON DELETE RESTRICT,
  INDEX idx_ds_distributor (distributor_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ------------------------------------------------------------
-- 19. distributor_payouts — withdrawal requests
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS distributor_payouts (
  id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  distributor_id  INT UNSIGNED NOT NULL,
  amount          DECIMAL(10,2) NOT NULL,
  status          ENUM('pending','processing','paid','rejected') NOT NULL DEFAULT 'pending',
  utr_number      VARCHAR(30) DEFAULT NULL,
  admin_note      TEXT DEFAULT NULL,
  processed_by    INT UNSIGNED DEFAULT NULL,  -- staff_users.id
  created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (distributor_id) REFERENCES distributors(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ------------------------------------------------------------
-- 20. bcc_requests — email surveillance requests (Option A)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS bcc_requests (
  id                  INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  billing_entity_id   INT UNSIGNED NOT NULL,
  domain_id           INT UNSIGNED NOT NULL,
  ou_path             VARCHAR(255) NOT NULL,
  affected_users      TEXT NOT NULL,            -- JSON: "all" or ["email1","email2"]
  surveillance_email  VARCHAR(150) NOT NULL,
  directions          VARCHAR(255) NOT NULL,    -- JSON array of direction strings
  status              ENUM('pending','in_progress','completed','rejected') NOT NULL DEFAULT 'pending',
  requested_by        INT UNSIGNED NOT NULL,    -- portal_users.id
  completed_by        INT UNSIGNED DEFAULT NULL,  -- staff_users.id
  notes               TEXT DEFAULT NULL,
  requested_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  completed_at        DATETIME DEFAULT NULL,
  FOREIGN KEY (billing_entity_id) REFERENCES billing_entities(id) ON DELETE RESTRICT,
  FOREIGN KEY (domain_id) REFERENCES domains(id) ON DELETE RESTRICT,
  INDEX idx_bcc_status (status),
  INDEX idx_bcc_billing (billing_entity_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ------------------------------------------------------------
-- 21. admin_config — key-value settings (super_admin only)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS admin_config (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `key`       VARCHAR(60) NOT NULL UNIQUE,
  value       TEXT NOT NULL,
  updated_by  INT UNSIGNED DEFAULT NULL,
  updated_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- seed default config
INSERT IGNORE INTO admin_config (`key`, value) VALUES
  ('referral_enabled', '0'),
  ('gst_percent', '18'),
  ('support_email', 'support@letsdoitsmartly.com');

-- ------------------------------------------------------------
-- seed plans
-- ------------------------------------------------------------
INSERT IGNORE INTO plans (slug, name, price_per_year, ou_suffix, color_hex) VALUES
  ('basic',      'Basic',      3600.00,  'b',   '#6366f1'),
  ('pro',        'Pro',        7200.00,  'p',   '#0ea5e9'),
  ('enterprise', 'Enterprise', 14400.00, 'e',   '#8b5cf6'),
  ('premium',    'Premium',    24000.00, 'pre', '#f59e0b');

-- ------------------------------------------------------------
-- shared_drives — cache table, populated by nightly cron
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS shared_drives (
  id             VARCHAR(64)  NOT NULL PRIMARY KEY,
  name           VARCHAR(255) NOT NULL,
  creator_email  VARCHAR(255) DEFAULT NULL,
  domain         VARCHAR(255) DEFAULT NULL,
  member_count   INT UNSIGNED NOT NULL DEFAULT 0,
  members_json   MEDIUMTEXT   DEFAULT NULL,
  storage_mb     BIGINT UNSIGNED NOT NULL DEFAULT 0,
  created_at     DATETIME     DEFAULT NULL,
  last_synced_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_sd_domain (domain),
  INDEX idx_sd_synced (last_synced_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

SET FOREIGN_KEY_CHECKS = 1;
