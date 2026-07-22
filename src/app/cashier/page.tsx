"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function RedirectToCheckout() {
  const router = useRouter();
  
  useEffect(() => {
    router.replace("/checkout");
  }, [router]);

  return (
    <div className="min-h-screen bg-[#09090B] flex items-center justify-center">
      <div className="w-6 h-6 rounded-full border-t-2 border-[#C5A880] animate-spin" />
    </div>
  );
}
