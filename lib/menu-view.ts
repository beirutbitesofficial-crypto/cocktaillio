import { hostingerMenu } from "@/lib/hostinger-menu-catalog";

export const posCategories = [
  { id: "crepe", name: "Crepe / كريب", name_en: "Crepe", name_ar: "كريب", station: "bar" as const, sort_order: 10 },
  { id: "waffle", name: "Waffle / وافل", name_en: "Waffle", name_ar: "وافل", station: "bar" as const, sort_order: 20 },
  { id: "pancakes", name: "Pancakes / بان كيك", name_en: "Pancakes", name_ar: "بان كيك", station: "bar" as const, sort_order: 30 },
  { id: "cold-dessert", name: "Cold Dessert / حلويات باردة", name_en: "Cold Dessert", name_ar: "حلويات باردة", station: "bar" as const, sort_order: 40 },
  { id: "ice-cream", name: "Ice Cream / آيس كريم", name_en: "Ice Cream", name_ar: "آيس كريم", station: "bar" as const, sort_order: 50 },
];

function categoryFor(id: string) {
  if (id.includes("crepe")) return posCategories[0].name;
  if (id.includes("waffle")) return posCategories[1].name;
  if (id.includes("pancake")) return posCategories[2].name;
  if (id.includes("ice-cream")) return posCategories[4].name;
  return posCategories[3].name;
}

export const posMenu = hostingerMenu.map((item) => ({
  ...item,
  category: categoryFor(item.id),
}));
