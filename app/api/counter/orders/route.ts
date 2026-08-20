import { NextResponse } from "next/server";
import { bearer, verifyToken } from "@/lib/hostinger-auth";
import { hostingerAddons, hostingerMenu } from "@/lib/hostinger-menu-catalog";
import { mutatePosState, StoredCheckLine, StoredReceipt, StoredTicket } from "@/lib/hostinger-pos-store";

type OrderType="takeaway"|"delivery"|"self_service";
type InputLine={menuItemId?:string;quantity?:number;addons?:Array<{addonId?:string;quantity?:number}>;note?:string};
const addonPriceLbp=(id:string)=>{const n=Number(id.match(/(\d+)$/)?.[1]??0);return n>=1&&n<=9?100000:n>=10&&n<=16?80000:0};

export async function POST(request:Request){
 const user=verifyToken(bearer(request));
 if(!user) return NextResponse.json({error:"Authentication required."},{status:401});
 if(user.role==="waiter") return NextResponse.json({error:"Counter orders are cashier/manager only."},{status:403});
 const body=await request.json().catch(()=>null) as {orderType?:OrderType;items?:InputLine[];usdCents?:number;lbpAmount?:number;exchangeRateLbpPerUsd?:number;customerName?:string;phone?:string;address?:string}|null;
 if(!body?.orderType||!Array.isArray(body.items)||!body.items.length) return NextResponse.json({error:"Order type and items are required."},{status:400});
 if(body.orderType==="delivery"&&(!body.customerName?.trim()||!body.phone?.trim()||!body.address?.trim())) return NextResponse.json({error:"Delivery requires customer name, phone and address."},{status:400});
 try{
  const result=await mutatePosState((state)=>{
   const now=new Date().toISOString(); const orderNumber=state.next_order_number++;
   const lines:StoredCheckLine[]=[];
   for(const raw of body.items!){
    const qty=Math.floor(Number(raw.quantity??0)); const menu=hostingerMenu.find(x=>x.id===raw.menuItemId&&x.available===1);
    if(!menu||qty<1||qty>100) throw new Error("Invalid menu item or quantity.");
    const addons=menu.addons_enabled?(raw.addons??[]).flatMap(sel=>{const a=hostingerAddons.find(x=>x.id===sel.addonId&&x.available===1);return a?[{addon_id:a.id,name_en:a.name_en,name_ar:a.name_ar,quantity:Math.max(1,Math.floor(Number(sel.quantity??1))),price_lbp:addonPriceLbp(a.id)}]:[]}):[];
    lines.push({id:`line-${crypto.randomUUID()}`,menu_item_id:menu.id,name_en:menu.name_en,name_ar:menu.name_ar,unit_price_cents:menu.price_cents,quantity:qty,line_total_cents:menu.price_cents*qty,station:menu.station,addons,note:raw.note?.trim()||null});
   }
   const subtotalCents=lines.reduce((s,l)=>s+l.line_total_cents,0);
   const subtotalLbp=lines.reduce((s,l)=>s+l.addons.reduce((a,x)=>a+x.price_lbp*x.quantity*l.quantity,0),0);
   const rate=Math.max(1,Math.floor(Number(body.exchangeRateLbpPerUsd??89500)));
   const totalEquivalentCents=subtotalCents+Math.round(subtotalLbp/rate*100);
   const usdPaid=Math.max(0,Math.floor(Number(body.usdCents??0))); const lbpPaid=Math.max(0,Math.floor(Number(body.lbpAmount??0)));
   const paidEquivalentCents=usdPaid+Math.round(lbpPaid/rate*100);
   if(paidEquivalentCents<totalEquivalentCents) throw new Error("Payment is less than the order total.");
   const label=body.orderType==="takeaway"?`Takeaway #${orderNumber}`:body.orderType==="delivery"?`Delivery #${orderNumber}`:`Self Service #${orderNumber}`;
   const syntheticCheckId=`counter-${crypto.randomUUID()}`;
   for(const station of ["bar","kitchen"] as const){
    const stationLines=lines.filter(l=>l.station===station); if(!stationLines.length) continue;
    const ticket:StoredTicket={id:`ticket-${crypto.randomUUID()}`,check_id:syntheticCheckId,table_id:"counter",table_name:label,station,station_ar:station==="bar"?"البار":"المطبخ",waiter_name:user.name,kind:"NEW",status:"new",created_at:now,updated_at:now,lines:stationLines.map(l=>({name_ar:l.name_ar,quantity:l.quantity,addons:l.addons.map(a=>({name_ar:a.name_ar,quantity:a.quantity})),note:l.note}))};
    state.tickets.push(ticket);
   }
   const receipt:StoredReceipt={id:`receipt-${crypto.randomUUID()}`,order_number:orderNumber,check_id:syntheticCheckId,table_id:"counter",table_name:label,cashier:user.name,subtotal_cents:subtotalCents,subtotal_lbp:subtotalLbp,total_equivalent_cents:totalEquivalentCents,usd_paid_cents:usdPaid,lbp_paid:lbpPaid,exchange_rate_lbp_per_usd:rate,change_usd_cents:Math.max(0,paidEquivalentCents-totalEquivalentCents),created_at:now,items:lines};
   state.receipts.push(receipt);
   return {receipt,orderType:body.orderType,customer:{name:body.customerName?.trim()||null,phone:body.phone?.trim()||null,address:body.address?.trim()||null}};
  });
  return NextResponse.json(result,{status:201,headers:{"Cache-Control":"no-store"}});
 }catch(error){return NextResponse.json({error:error instanceof Error?error.message:"Could not complete order."},{status:400});}
}
