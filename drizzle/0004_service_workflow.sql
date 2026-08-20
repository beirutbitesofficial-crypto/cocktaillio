PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS `service_checks` (
  `id` text PRIMARY KEY NOT NULL,
  `table_id` text NOT NULL REFERENCES `restaurant_tables`(`id`),
  `opened_by` text NOT NULL REFERENCES `users`(`id`),
  `status` text NOT NULL DEFAULT 'open' CHECK (`status` IN ('open','paid','cancelled')),
  `notes` text,
  `subtotal_cents` integer NOT NULL DEFAULT 0,
  `opened_at` text NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` text NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `closed_at` text
);
CREATE UNIQUE INDEX IF NOT EXISTS `uq_service_checks_open_table` ON `service_checks` (`table_id`) WHERE `status`='open';
CREATE INDEX IF NOT EXISTS `idx_service_checks_status` ON `service_checks` (`status`,`opened_at`);

CREATE TABLE IF NOT EXISTS `service_check_items` (
  `id` text PRIMARY KEY NOT NULL,
  `check_id` text NOT NULL REFERENCES `service_checks`(`id`) ON DELETE CASCADE,
  `menu_item_id` text NOT NULL REFERENCES `menu_items`(`id`),
  `name_snapshot` text NOT NULL,
  `unit_price_cents` integer NOT NULL,
  `quantity` integer NOT NULL CHECK (`quantity` > 0),
  `line_total_cents` integer NOT NULL,
  `created_at` text NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` text NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS `idx_service_check_items_check` ON `service_check_items` (`check_id`);

CREATE TABLE IF NOT EXISTS `service_payments` (
  `id` text PRIMARY KEY NOT NULL,
  `check_id` text NOT NULL REFERENCES `service_checks`(`id`),
  `currency` text NOT NULL CHECK (`currency` IN ('USD','LBP')),
  `amount_minor` integer NOT NULL CHECK (`amount_minor` >= 0),
  `usd_equivalent_cents` integer NOT NULL CHECK (`usd_equivalent_cents` >= 0),
  `exchange_rate_lbp_per_usd` integer,
  `received_by` text NOT NULL REFERENCES `users`(`id`),
  `created_at` text NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS `idx_service_payments_check` ON `service_payments` (`check_id`);

-- Default waiter account for first deployment. Change the password immediately in production.
-- Password hash matches the existing temporary cashier password and is intentionally only a bootstrap credential.
INSERT OR IGNORE INTO `users` (`id`,`username`,`password_hash`,`display_name`,`role`,`active`) VALUES
('waiter-1','waiter','pbkdf2:100000:c9d3628c5c9d02053f04fb925c8f4cae:175dae8953dfd7b73811cd153986990d4c158f2ff6a653f74fe8edb166af0b69','Waiter','waiter',1);

PRAGMA optimize;
