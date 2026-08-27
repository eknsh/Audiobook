"use client";

import { useEffect, useState } from "react";

export default function VisitorCounter() {
  const [online, setOnline] = useState(1);

  useEffect(() => {
    let visitorId = sessionStorage.getItem("chai-tapri-visitor-id");

    if (!visitorId) {
      visitorId = crypto.randomUUID();
      sessionStorage.setItem("chai-tapri-visitor-id", visitorId);
    }

    const update = async () => {
      try {
        const res = await fetch("/api/visitors", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ visitorId }),
          cache: "no-store",
        });

        const data = await res.json();

        if (typeof data.online === "number") {
          setOnline(Math.max(1, data.online));
        }
      } catch (error) {
        console.error("Visitor heartbeat failed:", error);
      }
    };

    update();

    const interval = setInterval(update, 10000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex items-center gap-2 whitespace-nowrap text-xs font-medium tracking-wide text-white/90 sm:text-sm">
      <span className="h-2 w-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.9)]" />
      <span>{online} ONLINE</span>
    </div>
  );
}
