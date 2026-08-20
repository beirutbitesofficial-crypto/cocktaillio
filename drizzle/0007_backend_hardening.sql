PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS `login_throttle` (
  `identifier` text PRIMARY KEY NOT NULL,
  `failures` integer NOT NULL DEFAULT 0 CHECK (`failures` >= 0),
  `blocked_until` text,
  `updated_at` text NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS `idx_login_throttle_updated` ON `login_throttle` (`updated_at`);

-- Text-only menu policy: remove any legacy image references without deleting files
-- that may still be referenced by historical backups.
UPDATE `menu_items` SET `image_key`=NULL,`image_url`=NULL,`updated_at`=CURRENT_TIMESTAMP
WHERE `image_key` IS NOT NULL OR `image_url` IS NOT NULL;

PRAGMA optimize;
