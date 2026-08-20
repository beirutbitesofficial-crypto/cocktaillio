"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

const TOKEN_KEY="cocktaillio-session";
type Role="manager"|"cashier"|"waiter"|null;
function readRole():Role{
  try{
    const token=localStorage.getItem(TOKEN_KEY); if(!token) return null;
    const payload=token.split(".")[0]; if(!payload) return null;
    const json=JSON.parse(atob(payload.replace(/-/g,"+").replace(/_/g,"/")));
    return json.role??null;
  }catch{return null;}
}

export default function GlobalModuleNav(){
  const path=usePathname(); const[role,setRole]=useState<Role>(null);
  useEffect(()=>{setRole(readRole()); const t=setInterval(()=>setRole(readRole()),1000); return()=>clearInterval(t)},[]);
  if(path==="/"||path.startsWith("/api")||path==="/login") return null;
  const waiter=role==="waiter";
  return <nav className="globalPosNav">
    {!waiter&&<Link href="/">Dashboard</Link>}
    {!waiter&&<Link href="/counter">New Order</Link>}
    <Link href="/service">Tables</Link>
    {!waiter&&<Link href="/catalog">Menu</Link>}
    <Link href="/bar">Bar</Link>
    {!waiter&&<Link href="/kitchen">Kitchen</Link>}
    <style jsx global>{`.globalPosNav{position:sticky;top:0;z-index:999;background:#123f2b;border-bottom:1px solid #ffffff22;padding:8px 10px;display:flex;gap:6px;overflow-x:auto;scrollbar-width:none}.globalPosNav::-webkit-scrollbar{display:none}.globalPosNav a{color:#fff;text-decoration:none;white-space:nowrap;padding:8px 11px;border:1px solid #ffffff2e;border-radius:9px;font-size:13px;font-weight:700}.globalPosNav a:hover{background:#ffffff16}@media(max-width:700px){.globalPosNav{padding:7px 8px}.globalPosNav a{font-size:12px;padding:7px 9px}}`}</style>
  </nav>;
}
