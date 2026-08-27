"use client";

import MusicLinks from "@/components/MusicPlayer/MusicLinks";
import MusicPlayer from "@/components/MusicPlayer";

export default function Home() {
  return (
    <main className="relative min-h-screen overflow-hidden">
      {/* CHAI TAPRI BACKGROUND */}
      <div
        className="fixed inset-0 -z-10 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: 'url("/chai-tapri.png")',
        }}
      />

      {/* DARK OVERLAY */}
      <div className="fixed inset-0 -z-[5] bg-black/20" />

      <MusicLinks />
      <MusicPlayer />
    </main>
  );
}
