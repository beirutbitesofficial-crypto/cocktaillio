PRAGMA foreign_keys = ON;

-- Second visible category, imported from the approved bilingual Cold Dessert Excel file.
INSERT OR REPLACE INTO menu_categories(id,name,sort_order,active,created_at,updated_at)
VALUES ('cold-dessert','Cold Dessert / حلويات باردة',20,1,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP);

-- No menu item images are used. Prices are stored in USD cents exactly as provided in the workbook.
INSERT OR REPLACE INTO menu_items(id,category_id,name,description,price_cents,image_key,image_url,available,customizable,created_at,updated_at) VALUES
('cold-jelly','cold-dessert','Jelly / جيلي','',100,NULL,NULL,1,0,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
('cold-moghli','cold-dessert','Moghli / مغلي','',188,NULL,NULL,1,0,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
('cold-rice-pudding','cold-dessert','Rice Pudding / رز بحليب','',188,NULL,NULL,1,0,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
('cold-custard','cold-dessert','Custard / كاسترد','',188,NULL,NULL,1,0,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
('cold-knafeh','cold-dessert','Knafeh / كنافة','',388,NULL,NULL,1,0,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
('cold-ice-cream-1kg','cold-dessert','Ice Cream 1 kg / آيس كريم ١ كغ','',1800,NULL,NULL,1,0,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
('cold-ice-cream-half-kg','cold-dessert','Ice Cream 1/2 kg / آيس كريم نصف كغ','',900,NULL,NULL,1,0,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
('cold-ice-cream-1-ball','cold-dessert','Ice Cream 1 ball / آيس كريم كرة واحدة','',111,NULL,NULL,1,0,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
('cold-merry-cream','cold-dessert','Merry Cream / ميري كريم','',200,NULL,NULL,1,0,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
('cold-chocolate-mousse','cold-dessert','Chocolate Mousse / موس شوكولا','',633,NULL,NULL,1,0,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP);

PRAGMA optimize;
