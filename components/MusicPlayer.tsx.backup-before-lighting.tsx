"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type Song = {
  id: string;
  title: string;
  channel: string;
  thumbnail: string;
  position: number;
};

type YouTubeMessage = {
  event?: string;
  info?: {
    currentTime?: number;
    duration?: number;
    playerState?: number;
  };
};

export default function MusicPlayer() {
  const playerRef = useRef<HTMLIFrameElement | null>(null);
  const currentIndexRef = useRef(0);
  const playRequestRef = useRef(0);
  const loadedRef = useRef(false);

  const [songs, setSongs] = useState<Song[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [playlistOpen, setPlaylistOpen] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [time, setTime] = useState("");

  const currentSong = songs[currentIndex];

  /* ----------------------------------------------------------
     CLOCK
  ---------------------------------------------------------- */

  useEffect(() => {
    const updateClock = () => {
      const now = new Date();

      setTime(
        now.toLocaleTimeString("en-IN", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
        })
      );
    };

    updateClock();

    const timer = window.setInterval(updateClock, 1000);

    return () => window.clearInterval(timer);
  }, []);

  /* ----------------------------------------------------------
     LOAD PLAYLIST
  ---------------------------------------------------------- */

  useEffect(() => {
    let cancelled = false;

    const loadPlaylist = async () => {
      try {
        const response = await fetch("/api/youtube", {
          cache: "no-store",
        });

        if (!response.ok) {
          throw new Error(`Playlist request failed: ${response.status}`);
        }

        const data = await response.json();

        if (!cancelled && Array.isArray(data.songs)) {
          setSongs(data.songs);

          if (data.songs.length > 0) {
            currentIndexRef.current = 0;
            setCurrentIndex(0);
          }
        }
      } catch (error) {
        console.error("Failed to load YouTube playlist:", error);
      }
    };

    loadPlaylist();

    return () => {
      cancelled = true;
    };
  }, []);

  /* ----------------------------------------------------------
     KEEP INDEX REF SYNCHRONIZED
  ---------------------------------------------------------- */

  useEffect(() => {
    currentIndexRef.current = currentIndex;
  }, [currentIndex]);

  /* ----------------------------------------------------------
     SEND COMMAND TO YOUTUBE
  ---------------------------------------------------------- */

  const sendCommand = useCallback(
    (command: string, args: unknown[] = []) => {
      const target = playerRef.current?.contentWindow;

      if (!target) return false;

      target.postMessage(
        JSON.stringify({
          event: "command",
          func: command,
          args,
        }),
        "*"
      );

      return true;
    },
    []
  );

  /* ----------------------------------------------------------
     INITIALIZE YOUTUBE IFRAME
  ---------------------------------------------------------- */

  const initializeYouTubePlayer = useCallback(() => {
    const target = playerRef.current?.contentWindow;

    if (!target) return;

    loadedRef.current = true;

    target.postMessage(
      JSON.stringify({
        event: "listening",
        id: 1,
        channel: "channel",
      }),
      "*"
    );

    target.postMessage(
      JSON.stringify({
        event: "command",
        func: "addEventListener",
        args: ["onStateChange"],
      }),
      "*"
    );

    target.postMessage(
      JSON.stringify({
        event: "command",
        func: "addEventListener",
        args: ["infoDelivery"],
      }),
      "*"
    );

    target.postMessage(
      JSON.stringify({
        event: "command",
        func: "setVolume",
        args: [70],
      }),
      "*"
    );
  }, []);

  /* ----------------------------------------------------------
     PLAY SPECIFIC SONG
  ---------------------------------------------------------- */

  const playSong = useCallback(
    (index: number) => {
      const song = songs[index];

      if (!song) return;

      const requestId = ++playRequestRef.current;

      currentIndexRef.current = index;
      setCurrentIndex(index);
      setPlaying(true);

      const loadAndPlay = () => {
        if (requestId !== playRequestRef.current) return;

        const target = playerRef.current?.contentWindow;

        if (!target) return;

        /* Load the requested video */
        target.postMessage(
          JSON.stringify({
            event: "command",
            func: "loadVideoById",
            args: [song.id],
          }),
          "*"
        );

        /* Explicitly start it after loading */
        window.setTimeout(() => {
          if (requestId !== playRequestRef.current) return;

          target.postMessage(
            JSON.stringify({
              event: "command",
              func: "playVideo",
              args: [],
            }),
            "*"
          );
        }, 400);
      };

      loadAndPlay();

      /*
       * Retry because the iframe may still be initializing/loading.
       */
      window.setTimeout(() => {
        if (requestId !== playRequestRef.current) return;

        if (!loadedRef.current) return;

        loadAndPlay();
      }, 1000);
    },
    [songs]
  );

  /* ----------------------------------------------------------
     YOUTUBE EVENTS
  ---------------------------------------------------------- */

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (!event.data) return;

      /*
       * Ignore messages that are not from YouTube.
       */
      if (
        typeof event.origin === "string" &&
        !event.origin.includes("youtube.com") &&
        !event.origin.includes("youtube-nocookie.com")
      ) {
        return;
      }

      let data: YouTubeMessage;

      try {
        data =
          typeof event.data === "string"
            ? JSON.parse(event.data)
            : event.data;
      } catch {
        return;
      }

      if (!data || data.event !== "infoDelivery") return;

      const info = data.info;

      if (!info) return;

      /*
       * PLAYING
       */
      if (typeof info.currentTime === "number") {
        setProgress(info.currentTime);
      }

      if (typeof info.duration === "number" && info.duration > 0) {
        setDuration(info.duration);
      }

      if (info.playerState === 1) {
        setPlaying(true);
      }

      /*
       * PAUSED
       */
      if (info.playerState === 2) {
        setPlaying(false);
      }

      /*
       * ENDED
       *
       * Immediately move to the next playlist item.
       */
      if (info.playerState === 0) {
        const total = songs.length;

        if (total <= 0) return;

        const current = currentIndexRef.current;

        const nextIndex =
          current >= total - 1 ? 0 : current + 1;

        /*
         * playSong explicitly loads AND plays the next song.
         */
        playSong(nextIndex);
      }
    };

    window.addEventListener("message", handleMessage);

    return () => {
      window.removeEventListener("message", handleMessage);
    };
  }, [songs, playSong]);

  /* ----------------------------------------------------------
     PLAY / PAUSE
  ---------------------------------------------------------- */

  const togglePlay = () => {
    if (!currentSong) return;

    if (playing) {
      sendCommand("pauseVideo");
      setPlaying(false);
    } else {
      setPlaying(true);

      const sent = sendCommand("playVideo");

      /*
       * If YouTube has not initialized yet, explicitly load
       * the current song and then play it.
       */
      if (!sent) {
        playSong(currentIndexRef.current);
      }
    }
  };

  /* ----------------------------------------------------------
     NEXT
  ---------------------------------------------------------- */

  const nextTrack = () => {
    if (!songs.length) return;

    const current = currentIndexRef.current;

    const nextIndex =
      current >= songs.length - 1 ? 0 : current + 1;

    playSong(nextIndex);
  };

  /* ----------------------------------------------------------
     PREVIOUS
  ---------------------------------------------------------- */

  const previousTrack = () => {
    if (!songs.length) return;

    const current = currentIndexRef.current;

    const previousIndex =
      current <= 0 ? songs.length - 1 : current - 1;

    playSong(previousIndex);
  };

  /* ----------------------------------------------------------
     YOUTUBE IFRAME URL
  ---------------------------------------------------------- */

  const youtubeSrc = currentSong
    ? `https://www.youtube.com/embed/${currentSong.id}?enablejsapi=1&autoplay=0&controls=0&playsinline=1&rel=0&origin=${encodeURIComponent(
        typeof window !== "undefined" ? window.location.origin : ""
      )}`
    : "";

  const formatTime = (seconds: number) => {
    if (!Number.isFinite(seconds) || seconds <= 0) {
      return "0:00";
    }

    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);

    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };
  /* ----------------------------------------------------------
     UI
  ---------------------------------------------------------- */

  return (
    <>
      {/* TOP LEFT CLOCK */}
      <div className="fixed left-5 top-5 z-[70]">
        <div className="font-mono text-sm tracking-widest text-white/80 drop-shadow-lg sm:text-base">
          {time}
        </div>
      </div>

      {/* TOP CENTER STATUS */}
      <div className="fixed left-1/2 top-5 z-[70] -translate-x-1/2">
        <div className="flex items-center gap-2 rounded-full border border-white/10 bg-black/25 px-3 py-1.5 backdrop-blur-lg">
          <span className="relative flex h-2 w-2">
            <span
              className={`absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75 ${
                playing ? "animate-ping" : ""
              }`}
            />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-green-400" />
          </span>

          <span className="text-[10px] tracking-widest text-white/60 sm:text-xs">
            {playing ? "PLAYING" : songs.length ? "READY" : "LOADING"}
          </span>
        </div>
      </div>

      {/* HIDDEN YOUTUBE PLAYER */}
      <div className="pointer-events-none fixed left-0 top-0 z-[-1] h-px w-px overflow-hidden opacity-0">
        {currentSong && (
          <iframe
            key={currentSong.id}
            ref={playerRef}
            onLoad={initializeYouTubePlayer}
            src={youtubeSrc}
            title="YouTube Music Player"
            allow="autoplay; encrypted-media"
            className="h-px w-px"
          />
        )}
      </div>

      {/* PLAYER */}
      <div className="fixed bottom-5 left-1/2 z-[60] w-[calc(100%-24px)] max-w-[560px] -translate-x-1/2">

        {/* PLAYLIST */}
        {playlistOpen && songs.length > 0 && (
          <div className="mb-2 max-h-[300px] overflow-y-auto rounded-[20px] border border-white/[0.11] bg-black/[0.08] p-2 shadow-[0_12px_50px_rgba(0,0,0,0.25)] backdrop-blur-lg">

            <div className="px-2 pb-2 pt-1 text-[9px] uppercase tracking-[0.2em] text-white/30">
              Playlist · {songs.length} songs
            </div>

            <div className="space-y-1">
              {songs.map((song, index) => (
                <button
                  key={`${song.id}-${index}`}
                  type="button"
                  onClick={() => playSong(index)}
                  className={`group flex w-full items-center gap-3 rounded-xl p-2 text-left transition-all ${
                    index === currentIndex
                      ? "bg-white/[0.12]"
                      : "hover:bg-white/[0.07]"
                  }`}
                >
                  <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-white/10">
                    <img
                      src={song.thumbnail}
                      alt=""
                      className="h-full w-full object-cover"
                    />

                    {index === currentIndex && playing && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/45">
                        <div className="flex items-end gap-[2px]">
                          <span className="h-2 w-[2px] animate-pulse bg-white" />
                          <span className="h-4 w-[2px] animate-pulse bg-white" />
                          <span className="h-3 w-[2px] animate-pulse bg-white" />
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[11px] font-medium text-white/85">
                      {song.title}
                    </p>

                    <p className="mt-0.5 truncate text-[9px] text-white/35">
                      {song.channel || "YouTube Music"}
                    </p>
                  </div>

                  <span className="px-1 text-[9px] text-white/20">
                    {index + 1}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* GLASS MUSIC PLAYER */}
        <div className="rounded-[22px] border border-white/[0.08] bg-white/[0.008] px-3 py-3 shadow-[0_12px_50px_rgba(0,0,0,0.20)] backdrop-blur-lg sm:px-4">

          <div className="flex items-center gap-3">

            {/* ARTWORK */}
            <div className="h-11 w-11 shrink-0 overflow-hidden rounded-lg border border-white/10 bg-white/[0.06] shadow-lg sm:h-12 sm:w-12">
              {currentSong?.thumbnail ? (
                <img
                  src={currentSong.thumbnail}
                  alt=""
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-lg text-white/60">
                  ?
                </div>
              )}
            </div>

            {/* SONG INFO */}
            <button
              type="button"
              onClick={() => setPlaylistOpen((prev) => !prev)}
              className="min-w-0 flex-1 cursor-pointer text-left transition-opacity hover:opacity-75"
              aria-label="Toggle playlist"
            >
              <p className="truncate text-[12px] font-medium tracking-wide text-white sm:text-[13px]">
                {currentSong?.title || "Chai Tapri"}
              </p>

              <p className="mt-0.5 truncate text-[10px] text-white/40 sm:text-[11px]">
                {currentSong?.channel || "YouTube Music"}
              </p>
            </button>

            {/* PREVIOUS */}
            <button
              type="button"
              onClick={previousTrack}
              disabled={!songs.length}
              className="group flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/[0.07] bg-white/[0.008] text-white/45 shadow-[0_4px_20px_rgba(0,0,0,0.18)] backdrop-blur-md transition-all duration-200 hover:-translate-x-0.5 hover:border-white/[0.14] hover:bg-white/[0.07] hover:text-white active:scale-90 disabled:pointer-events-none disabled:opacity-20"
              aria-label="Previous song"
            >
              <svg
                viewBox="0 0 24 24"
                className="h-[17px] w-[17px]"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M19 5v14" />
                <path
                  d="m15 8-5 4 5 4V8Z"
                  fill="currentColor"
                  stroke="none"
                />
                <path
                  d="m10 8-5 4 5 4V8Z"
                  fill="currentColor"
                  stroke="none"
                />
              </svg>
            </button>

            {/* PLAY / PAUSE */}
            <button
              type="button"
              onClick={togglePlay}
              disabled={!currentSong}
              className="group flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white text-black shadow-[0_6px_25px_rgba(255,255,255,0.16)] transition-all duration-200 hover:scale-105 hover:bg-white/90 active:scale-90 disabled:pointer-events-none disabled:opacity-30"
              aria-label={playing ? "Pause" : "Play"}
            >
              {playing ? (
                <svg
                  viewBox="0 0 24 24"
                  className="h-[16px] w-[16px]"
                  fill="currentColor"
                >
                  <rect x="6" y="5" width="4" height="14" rx="1" />
                  <rect x="14" y="5" width="4" height="14" rx="1" />
                </svg>
              ) : (
                <svg
                  viewBox="0 0 24 24"
                  className="ml-0.5 h-[16px] w-[16px]"
                  fill="currentColor"
                >
                  <path d="M8 5.5v13a1 1 0 0 0 1.53.85l9.5-6.5a1 1 0 0 0 0-1.7l-9.5-6.5A1 1 0 0 0 8 5.5Z" />
                </svg>
              )}
            </button>

            {/* NEXT */}
            <button
              type="button"
              onClick={nextTrack}
              disabled={!songs.length}
              className="group flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/[0.07] bg-white/[0.008] text-white/45 shadow-[0_4px_20px_rgba(0,0,0,0.18)] backdrop-blur-md transition-all duration-200 hover:translate-x-0.5 hover:border-white/[0.14] hover:bg-white/[0.07] hover:text-white active:scale-90 disabled:pointer-events-none disabled:opacity-20"
              aria-label="Next song"
            >
              <svg
                viewBox="0 0 24 24"
                className="h-[17px] w-[17px]"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M5 5v14" />
                <path
                  d="m9 8 5 4-5 4V8Z"
                  fill="currentColor"
                  stroke="none"
                />
                <path
                  d="m14 8 5 4-5 4V8Z"
                  fill="currentColor"
                  stroke="none"
                />
              </svg>
            </button>

            {/* PLAYLIST */}
            <button
              type="button"
              onClick={() => setPlaylistOpen((prev) => !prev)}
              className="group flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/[0.07] bg-white/[0.008] text-white/40 shadow-[0_4px_20px_rgba(0,0,0,0.18)] backdrop-blur-md transition-all duration-200 hover:scale-105 hover:border-white/[0.14] hover:bg-white/[0.07] hover:text-white active:scale-90"
              aria-label="Toggle playlist"
            >
              <span className="flex w-[16px] flex-col gap-[3.5px]">
                <span className="h-[1.5px] w-full rounded-full bg-current transition-all duration-200 group-hover:w-[11px]" />
                <span className="h-[1.5px] w-full rounded-full bg-current" />
                <span className="h-[1.5px] w-[10px] rounded-full bg-current transition-all duration-200 group-hover:w-full" />
              </span>
            </button>

          </div>

          {/* TIME / DURATION */}
          <div className="mt-1.5 flex items-center justify-between px-1 text-[8px] font-mono tracking-wider text-white/30">
            <span>{formatTime(progress)}</span>

            

            <span>{formatTime(duration)}</span>
          </div>

        </div>
      </div>
    </>
  );
}


