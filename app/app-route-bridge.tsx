"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";

const normalize=(value:string)=>value.replace(/\s+/g," ").trim().toLowerCase();

export default function AppRouteBridge(){
  const pathname=usePathname();
  const router=useRouter();
  useEffect(()=>{
    if(pathname!=="/") return;
    const onClick=(event:MouseEvent)=>{
      const target=event.target as HTMLElement|null;
      const clickable=target?.closest("button,a") as HTMLElement|null;
      if(!clickable) return;
      const text=normalize(clickable.textContent||"");
      if(text.includes("new order")){
        event.preventDefault();event.stopPropagation();router.push("/service");return;
      }
      if(text==="menu"||text.includes("menu management")){
        event.preventDefault();event.stopPropagation();router.push("/catalog");return;
      }
    };
    document.addEventListener("click",onClick,true);
    return()=>document.removeEventListener("click",onClick,true);
  },[pathname,router]);
  return null;
}
