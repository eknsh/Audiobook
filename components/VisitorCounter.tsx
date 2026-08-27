"use client";

import { useEffect, useState } from "react";

export default function VisitorCounter() {
  const [online, setOnline] = useState<number | null>(null);

  useEffect(() => {
    let active = true;

    const connect = async () => {
      try {
        const response = await fetch("/api/visitors", {
          method: "POST",
          cache: "no-store",
        });

        if (!response.ok) return;

        const data = await response.json();

        if (active) {
          setOnline(data.online);
        }
      } catch (error) {
        console.error("Visitor counter error:", error);
      }
    };

    connect();

    const interval = setInterval(async () => {
      try {
        const response = await fetch("/api/visitors", {
          cache: "no-store",
        });

        if (!response.ok) return;

        const data = await response.json();

        if (active) {
          setOnline(data.online);
        }
      } catch {
        // Ignore temporary polling errors.
      }
    }, 5000);

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, []);

  if (online === null) return null;

  return (
    <div className="fixed left-1/2 top-5 z-[70] -translate-x-1/2">
      <div className="flex items-center gap-2 rounded-full border border-white/[0.10] bg-black/[0.35] px-3 py-1.5 text-xs text-white/60 shadow-lg backdrop-blur-xl">
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-green-400 shadow-[0_0_8px_rgba(74,222,128,0.8)]" />
        <span>{online} online</span>
      </div>
    </div>
  );
}
