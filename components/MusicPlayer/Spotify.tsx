"use client";

export default function Spotify() {
  const playlistId = "009JmK4avBuLB6fAFJsunz";

  return (
    <section className="w-full max-w-md">
      <div className="overflow-hidden rounded-2xl border border-white/10 bg-black/80 shadow-2xl backdrop-blur-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
          <div>
            <p className="text-[10px] uppercase tracking-[0.3em] text-white/40">
              Chai Tapri
            </p>

            <h2 className="mt-1 text-lg font-bold text-white">
              Chai Vibes ☕
            </h2>
          </div>

          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-green-500" />
            <span className="text-xs text-white/50">
              Spotify
            </span>
          </div>
        </div>

        {/* Spotify Embed */}
        <iframe
          src={`https://open.spotify.com/embed/playlist/${playlistId}?utm_source=generator&theme=0`}
          width="100%"
          height="352"
          frameBorder="0"
          allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
          loading="lazy"
          title="Chai Tapri Spotify Playlist"
          className="block"
        />

        {/* Footer */}
        <div className="border-t border-white/10 px-5 py-3 text-center">
          <p className="text-xs text-white/30">
            Sip chai. Play music. Enjoy the vibe. ☕🎶
          </p>
        </div>
      </div>
    </section>
  );
}