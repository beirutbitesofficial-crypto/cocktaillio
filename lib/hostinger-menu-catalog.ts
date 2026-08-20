export type ProductionStation = "bar" | "kitchen";

export type HostingerMenuItem = {
  id: string;
  name: string;
  name_en: string;
  name_ar: string;
  description: string;
  price_cents: number;
  image_url: null;
  available: 1;
  customizable: 0 | 1;
  addons_enabled: boolean;
  category: string;
  station: ProductionStation;
};

export const hostingerCategories = [
  { id: "hot-dessert", name: "Hot Dessert / حلويات ساخنة", name_en: "Hot Dessert", name_ar: "حلويات ساخنة", station: "bar" as const, sort_order: 10 },
  { id: "cold-dessert", name: "Cold Dessert / حلويات باردة", name_en: "Cold Dessert", name_ar: "حلويات باردة", station: "bar" as const, sort_order: 20 },
];

const hot = "Hot Dessert / حلويات ساخنة";
const cold = "Cold Dessert / حلويات باردة";
const splitName = (name: string) => { const [en, ...rest] = name.split(" / "); return { en: en.trim(), ar: rest.join(" / ").trim() || en.trim() }; };
const item = (id: string, name: string, price_cents: number, category: string, customizable: 0 | 1 = 0): HostingerMenuItem => {
  const names = splitName(name);
  const addonsEnabled = id.includes("crepe") || id.includes("waffle") || id.includes("pancake");
  return { id, name, name_en: names.en, name_ar: names.ar, description: "", price_cents, image_url: null, available: 1, customizable, addons_enabled: addonsEnabled, category, station: "bar" };
};

export const hostingerMenu: HostingerMenuItem[] = [
  item("dessert-crepe-chocolate", "Crepe - Chocolate / كريب - شوكولا", 500, hot, 1),
  item("dessert-waffle-chocolate", "Waffle - Chocolate / وافل - شوكولا", 600, hot, 1),
  item("dessert-pancake6-chocolate", "Pancake 6 pcs - Chocolate / بان كيك ٦ قطع - شوكولا", 350, hot, 1),
  item("dessert-pancake12-chocolate", "Pancake 12 pcs - Chocolate / بان كيك ١٢ قطعة - شوكولا", 700, hot, 1),
  item("dessert-crepe-nutella", "Crepe - Nutella / كريب - نوتيلا", 600, hot, 1),
  item("dessert-waffle-nutella", "Waffle - Nutella / وافل - نوتيلا", 700, hot, 1),
  item("dessert-pancake6-nutella", "Pancake 6 pcs - Nutella / بان كيك ٦ قطع - نوتيلا", 400, hot, 1),
  item("dessert-pancake12-nutella", "Pancake 12 pcs - Nutella / بان كيك ١٢ قطعة - نوتيلا", 800, hot, 1),
  item("dessert-crepe-lotus", "Crepe - Lotus / كريب - لوتس", 600, hot, 1),
  item("dessert-waffle-lotus", "Waffle - Lotus / وافل - لوتس", 700, hot, 1),
  item("dessert-pancake6-lotus", "Pancake 6 pcs - Lotus / بان كيك ٦ قطع - لوتس", 400, hot, 1),
  item("dessert-pancake12-lotus", "Pancake 12 pcs - Lotus / بان كيك ١٢ قطعة - لوتس", 800, hot, 1),
  item("dessert-crepe-white-chocolate", "Crepe - White Chocolate / كريب - شوكولا بيضاء", 600, hot, 1),
  item("dessert-waffle-white-chocolate", "Waffle - White Chocolate / وافل - شوكولا بيضاء", 700, hot, 1),
  item("dessert-pancake6-white-chocolate", "Pancake 6 pcs - White Chocolate / بان كيك ٦ قطع - شوكولا بيضاء", 400, hot, 1),
  item("dessert-pancake12-white-chocolate", "Pancake 12 pcs - White Chocolate / بان كيك ١٢ قطعة - شوكولا بيضاء", 800, hot, 1),
  item("dessert-crepe-dark-chocolate", "Crepe - Dark Chocolate / كريب - شوكولا داكنة", 500, hot, 1),
  item("dessert-waffle-dark-chocolate", "Waffle - Dark Chocolate / وافل - شوكولا داكنة", 600, hot, 1),
  item("dessert-pancake6-dark-chocolate", "Pancake 6 pcs - Dark Chocolate / بان كيك ٦ قطع - شوكولا داكنة", 350, hot, 1),
  item("dessert-pancake12-dark-chocolate", "Pancake 12 pcs - Dark Chocolate / بان كيك ١٢ قطعة - شوكولا داكنة", 700, hot, 1),
  item("dessert-crepe-kinder", "Crepe - Kinder / كريب - كيندر", 600, hot, 1),
  item("dessert-waffle-kinder", "Waffle - Kinder / وافل - كيندر", 700, hot, 1),
  item("dessert-pancake6-kinder", "Pancake 6 pcs - Kinder / بان كيك ٦ قطع - كيندر", 400, hot, 1),
  item("dessert-pancake12-kinder", "Pancake 12 pcs - Kinder / بان كيك ١٢ قطعة - كيندر", 800, hot, 1),
  item("dessert-crepe-oreo", "Crepe - Oreo / كريب - أوريو", 600, hot, 1),
  item("dessert-waffle-oreo", "Waffle - Oreo / وافل - أوريو", 700, hot, 1),
  item("dessert-pancake6-oreo", "Pancake 6 pcs - Oreo / بان كيك ٦ قطع - أوريو", 400, hot, 1),
  item("dessert-pancake12-oreo", "Pancake 12 pcs - Oreo / بان كيك ١٢ قطعة - أوريو", 800, hot, 1),
  item("dessert-crepe-marshmallow", "Crepe - Marshmallow / كريب - مارشميلو", 600, hot, 1),
  item("dessert-waffle-marshmallow", "Waffle - Marshmallow / وافل - مارشميلو", 700, hot, 1),
  item("dessert-pancake6-marshmallow", "Pancake 6 pcs - Marshmallow / بان كيك ٦ قطع - مارشميلو", 400, hot, 1),
  item("dessert-pancake12-marshmallow", "Pancake 12 pcs - Marshmallow / بان كيك ١٢ قطعة - مارشميلو", 800, hot, 1),
  item("dessert-crepe-pistachio", "Crepe - Pistachio / كريب - فستق", 700, hot, 1),
  item("dessert-waffle-pistachio", "Waffle - Pistachio / وافل - فستق", 800, hot, 1),
  item("dessert-pancake6-pistachio", "Pancake 6 pcs - Pistachio / بان كيك ٦ قطع - فستق", 450, hot, 1),
  item("dessert-pancake12-pistachio", "Pancake 12 pcs - Pistachio / بان كيك ١٢ قطعة - فستق", 900, hot, 1),
  item("dessert-crepe-belgian-chocolate", "Crepe - Belgian Chocolate / كريب - شوكولا بلجيكية", 700, hot, 1),
  item("dessert-waffle-belgian-chocolate", "Waffle - Belgian Chocolate / وافل - شوكولا بلجيكية", 800, hot, 1),
  item("dessert-pancake6-belgian-chocolate", "Pancake 6 pcs - Belgian Chocolate / بان كيك ٦ قطع - شوكولا بلجيكية", 450, hot, 1),
  item("dessert-pancake12-belgian-chocolate", "Pancake 12 pcs - Belgian Chocolate / بان كيك ١٢ قطعة - شوكولا بلجيكية", 900, hot, 1),
  item("dessert-crepe-ferrero", "Crepe - Ferrero / كريب - فيريرو", 700, hot, 1),
  item("dessert-waffle-ferrero", "Waffle - Ferrero / وافل - فيريرو", 800, hot, 1),
  item("dessert-pancake6-ferrero", "Pancake 6 pcs - Ferrero / بان كيك ٦ قطع - فيريرو", 450, hot, 1),
  item("dessert-pancake12-ferrero", "Pancake 12 pcs - Ferrero / بان كيك ١٢ قطعة - فيريرو", 900, hot, 1),
  item("dessert-crepe-fettuccine", "Crepe - Fettuccine / كريب - فيتوتشيني", 1200, hot, 1),
  item("dessert-crepe-sushi", "Crepe - Sushi / كريب - سوشي", 800, hot, 1),
  item("dessert-crepe-roll", "Crepe - Roll Crepe / كريب - رول كريب", 800, hot, 1),
  item("dessert-pancake12-mix", "Pancake 12 pcs - Mix / بان كيك ١٢ قطعة - ميكس", 1000, hot, 1),
  item("cold-jelly", "Jelly / جيلي", 100, cold), item("cold-moghli", "Moghli / مغلي", 188, cold), item("cold-rice-pudding", "Rice Pudding / رز بحليب", 188, cold), item("cold-custard", "Custard / كاسترد", 188, cold), item("cold-knafeh", "Knafeh / كنافة", 388, cold), item("cold-ice-cream-1kg", "Ice Cream 1 kg / آيس كريم ١ كغ", 1800, cold), item("cold-ice-cream-half-kg", "Ice Cream 1/2 kg / آيس كريم نصف كغ", 900, cold), item("cold-ice-cream-1-ball", "Ice Cream 1 ball / آيس كريم كرة واحدة", 111, cold), item("cold-merry-cream", "Merry Cream / ميري كريم", 200, cold), item("cold-chocolate-mousse", "Chocolate Mousse / موس شوكولا", 633, cold),
];

const addon = (id: string, name: string) => { const names = splitName(name); return { id, name, name_en: names.en, name_ar: names.ar, price_cents: 0, emoji: "✦", available: 1 }; };
export const hostingerAddons = [
  addon("dessert-addon-01", "Nutella / نوتيلا"), addon("dessert-addon-02", "Lotus / لوتس"), addon("dessert-addon-03", "Ice Cream / آيس كريم"), addon("dessert-addon-04", "Milka / ميلكا"), addon("dessert-addon-05", "White Chocolate / شوكولا بيضاء"), addon("dessert-addon-06", "Kinder / كيندر"), addon("dessert-addon-07", "Oreo / أوريو"), addon("dessert-addon-08", "Marshmallow / مارشميلو"), addon("dessert-addon-09", "Caramel / كراميل"), addon("dessert-addon-10", "Banana / موز"), addon("dessert-addon-11", "Strawberry / فراولة"), addon("dessert-addon-12", "Pineapple / أناناس"), addon("dessert-addon-13", "Mango / مانغا"), addon("dessert-addon-14", "Nuts / مكسرات"), addon("dessert-addon-15", "Kiwi / كيوي"), addon("dessert-addon-16", "Cotton Candy / غزل البنات"),
];
