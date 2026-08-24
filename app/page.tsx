"use client";

import { useEffect, useState } from "react";

export default function Home() {
const [time, setTime] = useState("");
const [date, setDate] = useState("");
const [playerOpen, setPlayerOpen] = useState(false);

useEffect(() => {
const update = () => {
const now = new Date();


  // Time without seconds
  setTime(
    now.toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    })
  );

  // Date
  setDate(
    now.toLocaleDateString("en-IN", {
      weekday: "long",
      day: "2-digit",
      month: "long",
      year: "numeric",
    })
  );
};

update();

// Update every minute instead of every second
const timer = setInterval(update, 60000);

return () => clearInterval(timer);


}, []);

return ( <main className="relative min-h-screen overflow-hidden bg-black text-white">

```
  {/* ==============================
      PNG BACKGROUND
  ============================== */}

  <div
    className="fixed inset-0 bg-cover bg-center bg-no-repeat"
    style={{
      backgroundImage: "url('/chai-tapri.png')",
    }}
  />

  {/* Very subtle overlay */}
  <div className="fixed inset-0 bg-black/10" />


  {/* ==============================
      DATE - TOP LEFT
  ============================== */}

  <div className="fixed left-5 top-5 z-50">
    <p className="text-xs font-medium tracking-wide text-white/90 drop-shadow-lg sm:text-sm">
      {date}
    </p>
  </div>


  {/* ==============================
      TIME - TOP RIGHT
  ============================== */}

  <div className="fixed right-5 top-5 z-50">
    <p className="text-lg font-semibold tracking-wide text-white/95 drop-shadow-lg sm:text-2xl">
      {time}
    </p>
  </div>


  {/* ==============================
      SPOTIFY EMBED
  ============================== */}

  {playerOpen && (
    <div className="fixed bottom-[100px] left-1/2 z-50 w-[92%] max-w-[380px] -translate-x-1/2 overflow-hidden rounded-2xl border border-white/10 bg-black/80 shadow-2xl backdrop-blur-md">

      <iframe
        src="https://open.spotify.com/embed/playlist/009JmK4avBuLB6fAFJsunz?utm_source=generator&theme=0"
        width="100%"
        height="152"
        frameBorder="0"
        allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
        loading="lazy"
      />

    </div>
  )}


  {/* ==============================
      SMALL MUSIC PLAYER
  ============================== */}

  <div className="fixed bottom-5 left-1/2 z-50 w-[340px] -translate-x-1/2 sm:w-[390px]">

    <div className="flex h-[64px] items-center gap-3 rounded-2xl border border-white/15 bg-black/75 px-3 shadow-2xl backdrop-blur-xl">

      {/* Music button */}

      <button
        type="button"
        onClick={() => setPlayerOpen(!playerOpen)}
        aria-label="Open Spotify player"
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/10 text-xl transition hover:bg-white/20"
      >
        🎵
      </button>


      {/* Music information */}

      <div className="min-w-0 flex-1">

        <p className="truncate text-sm font-semibold">
          Chai Tapri
        </p>

        <p className="truncate text-[11px] text-white/50">
          Spotify Music
        </p>

      </div>


      {/* Open / Close */}

      <button
        type="button"
        onClick={() => setPlayerOpen(!playerOpen)}
        aria-label={playerOpen ? "Close player" : "Open player"}
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-black transition hover:scale-105"
      >
        {playerOpen ? "×" : "▶"}
      </button>

    </div>

  </div>

</main>
);
}