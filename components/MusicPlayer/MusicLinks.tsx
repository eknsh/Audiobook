"use client";

const spotifyUrl =
  "https://open.spotify.com/playlist/009JmK4avBuLB6fAFJsunz";

const youtubeMusicUrl =
  "https://music.youtube.com/playlist?list=PLZtUdS_3rdhM";

function Arrow() {
  return (
    <svg
      viewBox="0 0 16 16"
      className="h-3 w-3 text-white/45 transition-all duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-white/90"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M4 12L12 4M6 4H12V10"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function MusicLinks() {
  return (
    <div className="fixed right-4 top-4 z-[80] flex items-center gap-1.5 sm:right-5 sm:top-5">

      {/* SPOTIFY */}
      <a
        href={spotifyUrl}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Spotify"
        className="group flex h-8 items-center gap-1.5 rounded-full border border-white/20 bg-black/20 px-2.5 shadow-lg backdrop-blur-xl transition-all duration-300 hover:-translate-y-0.5 hover:border-white/30 hover:bg-white/15 sm:h-9 sm:gap-2 sm:px-3"
      >
        <svg
          viewBox="0 0 24 24"
          className="h-4 w-4 shrink-0 sm:h-[17px] sm:w-[17px]"
          aria-hidden="true"
        >
          <circle cx="12" cy="12" r="12" fill="#1DB954" />
          <path
            d="M6.5 9.2c3.7-1.1 7.8-.8 11.1.6"
            fill="none"
            stroke="white"
            strokeWidth="1.6"
            strokeLinecap="round"
          />
          <path
            d="M7.2 12.2c3.1-.8 6.7-.5 9.5.6"
            fill="none"
            stroke="white"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
          <path
            d="M8 15.1c2.3-.5 4.9-.3 7 .5"
            fill="none"
            stroke="white"
            strokeWidth="1.4"
            strokeLinecap="round"
          />
        </svg>

        <span className="text-[10px] font-medium tracking-wide text-white/80 sm:text-[11px]">
          Spotify
        </span>

        <Arrow />
      </a>

      {/* YOUTUBE MUSIC */}
      <a
        href={youtubeMusicUrl}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="YouTube Music"
        className="group flex h-8 items-center gap-1.5 rounded-full border border-white/20 bg-black/20 px-2.5 shadow-lg backdrop-blur-xl transition-all duration-300 hover:-translate-y-0.5 hover:border-white/30 hover:bg-white/15 sm:h-9 sm:gap-2 sm:px-3"
      >
        <svg
          viewBox="0 0 24 24"
          className="h-4 w-4 shrink-0 sm:h-[17px] sm:w-[17px]"
          aria-hidden="true"
        >
          <circle cx="12" cy="12" r="12" fill="#FF0000" />
          <path
            d="M10 8.3L16 12L10 15.7V8.3Z"
            fill="white"
          />
        </svg>

        <span className="text-[10px] font-medium tracking-wide text-white/80 sm:text-[11px]">
          YT Music
        </span>

        <Arrow />
      </a>

    </div>
  );
}
