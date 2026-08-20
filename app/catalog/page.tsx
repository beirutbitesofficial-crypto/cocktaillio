import Link from "next/link";
import { hostingerCategories, hostingerMenu } from "@/lib/hostinger-menu-catalog";

const money=(c:number)=>`$${(c/100).toFixed(2)}`;

export default function CatalogPage(){
  return <main className="catalog">
    <header><div><Link href="/">← Dashboard</Link><h1>Menu</h1><p>{hostingerMenu.length} items · {hostingerCategories.length} categories · no images</p></div><div className="quick"><Link href="/service">New Order</Link><Link href="/bar">Bar</Link><Link href="/kitchen">Kitchen</Link></div></header>
    {hostingerCategories.map(cat=>{
      const items=hostingerMenu.filter(i=>i.category===cat.name);
      return <section key={cat.id}><div className="sectionTitle"><div><h2>{cat.name_en}</h2><span>{cat.name_ar}</span></div><b>{items.length}</b></div><div className="grid">{items.map(item=><button type="button" key={item.id} className="item"><span><strong>{item.name_en}</strong><small dir="rtl">{item.name_ar}</small></span><b>{money(item.price_cents)}</b>{item.addons_enabled&&<em>Add-ons</em>}</button>)}</div></section>
    })}
    <style>{`*{box-sizing:border-box}.catalog{min-height:100vh;background:#f7f3ea;color:#173326;padding:0 0 40px;font-family:Arial,sans-serif}.catalog header{background:#123f2b;color:#fff;padding:18px 22px;display:flex;align-items:end;justify-content:space-between;gap:15px;position:sticky;top:0;z-index:5}.catalog header h1{margin:6px 0 0;font-size:30px}.catalog header p{margin:4px 0 0;opacity:.8}.catalog a{color:inherit;text-decoration:none}.quick{display:flex;gap:8px}.quick a{border:1px solid #ffffff44;border-radius:10px;padding:9px 11px}.catalog section{padding:20px 22px 0}.sectionTitle{display:flex;justify-content:space-between;align-items:end;margin-bottom:10px}.sectionTitle h2{margin:0;font-size:23px}.sectionTitle span{color:#69786e}.sectionTitle>b{background:#e5eee8;padding:6px 10px;border-radius:20px}.grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px}.item{border:1px solid #d8ded7;background:#fff;border-radius:13px;padding:13px;min-height:92px;text-align:left;display:flex;justify-content:space-between;gap:10px;position:relative;color:#173326}.item strong,.item small{display:block}.item small{margin-top:5px;color:#6f7d73}.item>b{white-space:nowrap}.item em{position:absolute;right:10px;bottom:9px;font-size:10px;font-style:normal;background:#edf5ef;padding:4px 6px;border-radius:8px}@media(max-width:800px){.catalog header{align-items:flex-start;flex-direction:column}.grid{grid-template-columns:repeat(2,minmax(0,1fr))}.catalog section{padding-left:12px;padding-right:12px}.quick{width:100%;overflow:auto}.quick a{white-space:nowrap}}`}</style>
  </main>;
}
