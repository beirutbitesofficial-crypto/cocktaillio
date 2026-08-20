PRAGMA foreign_keys = ON;

CREATE TABLE `sessions` (
  `id` text PRIMARY KEY NOT NULL,
  `user_id` text NOT NULL REFERENCES `users`(`id`) ON DELETE CASCADE,
  `token_hash` text NOT NULL,
  `expires_at` text NOT NULL,
  `created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
CREATE UNIQUE INDEX `uq_sessions_token_hash` ON `sessions` (`token_hash`);
CREATE INDEX `idx_sessions_user` ON `sessions` (`user_id`);

ALTER TABLE `menu_items` ADD COLUMN `customizable` integer DEFAULT 1 NOT NULL;

CREATE TABLE `menu_addons` (
  `id` text PRIMARY KEY NOT NULL,
  `name` text NOT NULL,
  `price_cents` integer DEFAULT 0 NOT NULL CHECK (`price_cents` >= 0),
  `emoji` text DEFAULT '✦' NOT NULL,
  `available` integer DEFAULT 1 NOT NULL,
  `created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
  `updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
CREATE UNIQUE INDEX `uq_menu_addons_name` ON `menu_addons` (`name`);

ALTER TABLE `orders` ADD COLUMN `customer_name` text;
ALTER TABLE `orders` ADD COLUMN `customer_phone` text;
ALTER TABLE `orders` ADD COLUMN `delivery_address` text;
ALTER TABLE `orders` ADD COLUMN `driver_name` text;

CREATE TABLE `order_item_addons` (
  `id` text PRIMARY KEY NOT NULL,
  `order_item_id` text NOT NULL REFERENCES `order_items`(`id`) ON DELETE CASCADE,
  `addon_id` text REFERENCES `menu_addons`(`id`) ON DELETE SET NULL,
  `name_snapshot` text NOT NULL,
  `price_cents_snapshot` integer NOT NULL CHECK (`price_cents_snapshot` >= 0),
  `created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
CREATE INDEX `idx_order_item_addons_item` ON `order_item_addons` (`order_item_id`);

INSERT OR IGNORE INTO `users` (`id`,`username`,`password_hash`,`display_name`,`role`,`active`) VALUES
  ('manager-1','manager','pbkdf2:100000:d8ade21dc3fa8c642621b27d62865b33:3e3f6c9ef8772c87a46fa9ce424874e353d5b16750ba4d45a056fa8006c02322','Alex Daher','admin',1),
  ('cashier-1','cashier','pbkdf2:100000:c9d3628c5c9d02053f04fb925c8f4cae:175dae8953dfd7b73811cd153986990d4c158f2ff6a653f74fe8edb166af0b69','Jamie D.','cashier',1),
  ('cashier-2','maya','pbkdf2:100000:c9d3628c5c9d02053f04fb925c8f4cae:175dae8953dfd7b73811cd153986990d4c158f2ff6a653f74fe8edb166af0b69','Maya Khalil','cashier',1),
  ('cashier-3','sam','pbkdf2:100000:c9d3628c5c9d02053f04fb925c8f4cae:175dae8953dfd7b73811cd153986990d4c158f2ff6a653f74fe8edb166af0b69','Sam Rami','cashier',1);

INSERT OR IGNORE INTO `menu_categories` (`id`,`name`,`sort_order`) VALUES
  ('burger-sandwich','Burger sandwich',10),('sandwich','Sandwich',20),('appetizers','Appetizers',30),('salad','Salad',40),('platter','Platter',50);

INSERT OR IGNORE INTO `menu_addons` (`id`,`name`,`price_cents`,`emoji`,`available`) VALUES
  ('topping-double-apple','Double Apple',0,'🍎',1),
  ('topping-mint','Mint',0,'🌿',1),
  ('topping-grape','Grape',0,'🍇',1),
  ('topping-lemon-mint','Lemon Mint',0,'🍋',1),
  ('cheese-extra','Extra cheese',100,'🧀',1),
  ('topping-fries','Extra fries',200,'🍟',1);

INSERT OR IGNORE INTO `restaurant_tables` (`id`,`name`,`capacity`,`current_guests`,`status`) VALUES
  ('table-1','Table 1',4,0,'available'),('table-2','Table 2',4,0,'available'),
  ('table-3','Table 3',6,0,'available'),('table-4','Table 4',2,0,'available'),
  ('table-5','Table 5',8,0,'available'),('table-6','Table 6',4,0,'available');

PRAGMA optimize;
