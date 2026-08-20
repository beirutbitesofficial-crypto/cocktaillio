"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

const TOKEN_KEY="cocktaillio-session";
function role(){
 try{const token=localStorage.getItem(TOKEN_KEY);const payload=token?.split(".")[0];if(!payload)return null;const normalized=payload.replace(/-/g,"+").replace(/_/g,"/");const padded=normalized+"=".repeat((4-normalized.length%4)%4);return JSON.parse(atob(padded)).role as string}catch{return null}
}
export default function RoleUiGuard(){
 const path=usePathname();
 useEffect(()=>{
  const apply=()=>{document.body.classList.remove("role-waiter","role-cashier-manager");const r=role();if(r==="waiter")document.body.classList.add("role-waiter");else if(r==="manager"||r==="cashier")document.body.classList.add("role-cashier-manager")};
  apply();const t=setInterval(apply,800);return()=>{clearInterval(t);document.body.classList.remove("role-waiter","role-cashier-manager")};
 },[path]);
 return <style jsx global>{`
  body.role-cashier-manager .app .menu{display:none!important}
  body.role-cashier-manager .app .layout{display:block!important;max-width:760px!important;margin:0 auto!important}
  body.role-cashier-manager .app aside{position:static!important;width:100%!important}
  body.role-cashier-manager .app aside>.primary{display:none!important}
  body.role-waiter .app header nav a[href="/kitchen"],body.role-waiter .app header nav a[href="/bar"]{display:none!important}
 `}</style>;
}
