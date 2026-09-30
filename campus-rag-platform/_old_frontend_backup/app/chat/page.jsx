"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function ChatRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/assistant");
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-[50vh]">
      <p className="text-slate-500 text-sm">Redirecting to AI Assistant...</p>
    </div>
  );
}
