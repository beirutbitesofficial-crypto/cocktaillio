PRAGMA foreign_keys = ON;

-- Hide the previous menu without deleting rows referenced by historical orders.
UPDATE menu_items
SET available=0,image_key=NULL,image_url=NULL,updated_at=CURRENT_TIMESTAMP;
UPDATE menu_categories
SET active=0,updated_at=CURRENT_TIMESTAMP;

-- First visible category.
INSERT OR REPLACE INTO menu_categories(id,name,sort_order,active,created_at,updated_at)
VALUES ('hot-dessert','Hot Dessert / حلويات ساخنة',10,1,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP);

-- Crepe / Waffle / Pancake menu imported from the approved bilingual Excel file.
INSERT OR REPLACE INTO menu_items(id,category_id,name,description,price_cents,image_key,image_url,available,customizable,created_at,updated_at) VALUES
('dessert-crepe-chocolate','hot-dessert','Crepe - Chocolate / كريب - شوكولا','',500,NULL,NULL,1,1,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
('dessert-waffle-chocolate','hot-dessert','Waffle - Chocolate / وافل - شوكولا','',600,NULL,NULL,1,1,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
('dessert-pancake6-chocolate','hot-dessert','Pancake 6 pcs - Chocolate / بان كيك ٦ قطع - شوكولا','',350,NULL,NULL,1,1,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
('dessert-pancake12-chocolate','hot-dessert','Pancake 12 pcs - Chocolate / بان كيك ١٢ قطعة - شوكولا','',700,NULL,NULL,1,1,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
('dessert-crepe-nutella','hot-dessert','Crepe - Nutella / كريب - نوتيلا','',600,NULL,NULL,1,1,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
('dessert-waffle-nutella','hot-dessert','Waffle - Nutella / وافل - نوتيلا','',700,NULL,NULL,1,1,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
('dessert-pancake6-nutella','hot-dessert','Pancake 6 pcs - Nutella / بان كيك ٦ قطع - نوتيلا','',400,NULL,NULL,1,1,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
('dessert-pancake12-nutella','hot-dessert','Pancake 12 pcs - Nutella / بان كيك ١٢ قطعة - نوتيلا','',800,NULL,NULL,1,1,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
('dessert-crepe-lotus','hot-dessert','Crepe - Lotus / كريب - لوتس','',600,NULL,NULL,1,1,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
('dessert-waffle-lotus','hot-dessert','Waffle - Lotus / وافل - لوتس','',700,NULL,NULL,1,1,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
('dessert-pancake6-lotus','hot-dessert','Pancake 6 pcs - Lotus / بان كيك ٦ قطع - لوتس','',400,NULL,NULL,1,1,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
('dessert-pancake12-lotus','hot-dessert','Pancake 12 pcs - Lotus / بان كيك ١٢ قطعة - لوتس','',800,NULL,NULL,1,1,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
('dessert-crepe-white-chocolate','hot-dessert','Crepe - White Chocolate / كريب - شوكولا بيضاء','',600,NULL,NULL,1,1,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
('dessert-waffle-white-chocolate','hot-dessert','Waffle - White Chocolate / وافل - شوكولا بيضاء','',700,NULL,NULL,1,1,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
('dessert-pancake6-white-chocolate','hot-dessert','Pancake 6 pcs - White Chocolate / بان كيك ٦ قطع - شوكولا بيضاء','',400,NULL,NULL,1,1,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
('dessert-pancake12-white-chocolate','hot-dessert','Pancake 12 pcs - White Chocolate / بان كيك ١٢ قطعة - شوكولا بيضاء','',800,NULL,NULL,1,1,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
('dessert-crepe-dark-chocolate','hot-dessert','Crepe - Dark Chocolate / كريب - شوكولا داكنة','',500,NULL,NULL,1,1,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
('dessert-waffle-dark-chocolate','hot-dessert','Waffle - Dark Chocolate / وافل - شوكولا داكنة','',600,NULL,NULL,1,1,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
('dessert-pancake6-dark-chocolate','hot-dessert','Pancake 6 pcs - Dark Chocolate / بان كيك ٦ قطع - شوكولا داكنة','',350,NULL,NULL,1,1,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
('dessert-pancake12-dark-chocolate','hot-dessert','Pancake 12 pcs - Dark Chocolate / بان كيك ١٢ قطعة - شوكولا داكنة','',700,NULL,NULL,1,1,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
('dessert-crepe-kinder','hot-dessert','Crepe - Kinder / كريب - كيندر','',600,NULL,NULL,1,1,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
('dessert-waffle-kinder','hot-dessert','Waffle - Kinder / وافل - كيندر','',700,NULL,NULL,1,1,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
('dessert-pancake6-kinder','hot-dessert','Pancake 6 pcs - Kinder / بان كيك ٦ قطع - كيندر','',400,NULL,NULL,1,1,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
('dessert-pancake12-kinder','hot-dessert','Pancake 12 pcs - Kinder / بان كيك ١٢ قطعة - كيندر','',800,NULL,NULL,1,1,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
('dessert-crepe-oreo','hot-dessert','Crepe - Oreo / كريب - أوريو','',600,NULL,NULL,1,1,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
('dessert-waffle-oreo','hot-dessert','Waffle - Oreo / وافل - أوريو','',700,NULL,NULL,1,1,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
('dessert-pancake6-oreo','hot-dessert','Pancake 6 pcs - Oreo / بان كيك ٦ قطع - أوريو','',400,NULL,NULL,1,1,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
('dessert-pancake12-oreo','hot-dessert','Pancake 12 pcs - Oreo / بان كيك ١٢ قطعة - أوريو','',800,NULL,NULL,1,1,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
('dessert-crepe-marshmallow','hot-dessert','Crepe - Marshmallow / كريب - مارشميلو','',600,NULL,NULL,1,1,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
('dessert-waffle-marshmallow','hot-dessert','Waffle - Marshmallow / وافل - مارشميلو','',700,NULL,NULL,1,1,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
('dessert-pancake6-marshmallow','hot-dessert','Pancake 6 pcs - Marshmallow / بان كيك ٦ قطع - مارشميلو','',400,NULL,NULL,1,1,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
('dessert-pancake12-marshmallow','hot-dessert','Pancake 12 pcs - Marshmallow / بان كيك ١٢ قطعة - مارشميلو','',800,NULL,NULL,1,1,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
('dessert-crepe-pistachio','hot-dessert','Crepe - Pistachio / كريب - فستق','',700,NULL,NULL,1,1,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
('dessert-waffle-pistachio','hot-dessert','Waffle - Pistachio / وافل - فستق','',800,NULL,NULL,1,1,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
('dessert-pancake6-pistachio','hot-dessert','Pancake 6 pcs - Pistachio / بان كيك ٦ قطع - فستق','',450,NULL,NULL,1,1,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
('dessert-pancake12-pistachio','hot-dessert','Pancake 12 pcs - Pistachio / بان كيك ١٢ قطعة - فستق','',900,NULL,NULL,1,1,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
('dessert-crepe-belgian-chocolate','hot-dessert','Crepe - Belgian Chocolate / كريب - شوكولا بلجيكية','',700,NULL,NULL,1,1,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
('dessert-waffle-belgian-chocolate','hot-dessert','Waffle - Belgian Chocolate / وافل - شوكولا بلجيكية','',800,NULL,NULL,1,1,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
('dessert-pancake6-belgian-chocolate','hot-dessert','Pancake 6 pcs - Belgian Chocolate / بان كيك ٦ قطع - شوكولا بلجيكية','',450,NULL,NULL,1,1,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
('dessert-pancake12-belgian-chocolate','hot-dessert','Pancake 12 pcs - Belgian Chocolate / بان كيك ١٢ قطعة - شوكولا بلجيكية','',900,NULL,NULL,1,1,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
('dessert-crepe-ferrero','hot-dessert','Crepe - Ferrero / كريب - فيريرو','',700,NULL,NULL,1,1,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
('dessert-waffle-ferrero','hot-dessert','Waffle - Ferrero / وافل - فيريرو','',800,NULL,NULL,1,1,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
('dessert-pancake6-ferrero','hot-dessert','Pancake 6 pcs - Ferrero / بان كيك ٦ قطع - فيريرو','',450,NULL,NULL,1,1,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
('dessert-pancake12-ferrero','hot-dessert','Pancake 12 pcs - Ferrero / بان كيك ١٢ قطعة - فيريرو','',900,NULL,NULL,1,1,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
('dessert-crepe-fettuccine','hot-dessert','Crepe - Fettuccine / كريب - فيتوتشيني','',1200,NULL,NULL,1,1,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
('dessert-crepe-sushi','hot-dessert','Crepe - Sushi / كريب - سوشي','',800,NULL,NULL,1,1,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
('dessert-crepe-roll','hot-dessert','Crepe - Roll Crepe / كريب - رول كريب','',800,NULL,NULL,1,1,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
('dessert-pancake12-mix','hot-dessert','Pancake 12 pcs - Mix / بان كيك ١٢ قطعة - ميكس','',1000,NULL,NULL,1,1,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP);

-- Add-on prices in the Excel are LBP, so keep them as LBP rather than guessing an exchange rate.
ALTER TABLE menu_addons ADD COLUMN price_lbp integer NOT NULL DEFAULT 0;
UPDATE menu_addons SET available=0,price_cents=0,price_lbp=0,updated_at=CURRENT_TIMESTAMP;
INSERT OR REPLACE INTO menu_addons(id,name,price_cents,price_lbp,emoji,available,created_at,updated_at) VALUES
('dessert-addon-01','Nutella / نوتيلا',0,100000,'✦',1,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
('dessert-addon-02','Lotus / لوتس',0,100000,'✦',1,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
('dessert-addon-03','Ice Cream / آيس كريم',0,100000,'✦',1,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
('dessert-addon-04','Milka / ميلكا',0,100000,'✦',1,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
('dessert-addon-05','White Chocolate / شوكولا بيضاء',0,100000,'✦',1,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
('dessert-addon-06','Kinder / كيندر',0,100000,'✦',1,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
('dessert-addon-07','Oreo / أوريو',0,100000,'✦',1,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
('dessert-addon-08','Marshmallow / مارشميلو',0,100000,'✦',1,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
('dessert-addon-09','Caramel / كراميل',0,100000,'✦',1,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
('dessert-addon-10','Banana / موز',0,80000,'✦',1,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
('dessert-addon-11','Strawberry / فراولة',0,80000,'✦',1,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
('dessert-addon-12','Pineapple / أناناس',0,80000,'✦',1,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
('dessert-addon-13','Mango / مانغا',0,80000,'✦',1,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
('dessert-addon-14','Nuts / مكسرات',0,80000,'✦',1,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
('dessert-addon-15','Kiwi / كيوي',0,80000,'✦',1,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
('dessert-addon-16','Cotton Candy / غزل البنات',0,80000,'✦',1,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP);

PRAGMA optimize;
