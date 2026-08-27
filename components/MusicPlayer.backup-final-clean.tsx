"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type Song = {
  id: string;
  title: string;
  channel: string;
  thumbnail: string;
  position: number;
};

export default function MusicPlayer() {
  const playerRef = useRef<HTMLIFrameElement | null>(null);
  const songsRef = useRef<Song[]>([]);
  const indexRef = useRef(0);
  const playingRef = useRef(false);
  const volumeRef = useRef(70);
  const switchingRef = useRef(false);
  const playerLoadedRef = useRef(false);
  const pendingIndexRef = useRef<number | null>(null);

  const [songs, setSongs] = useState<Song[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [playlistOpen, setPlaylistOpen] = useState(false);
  const [time, setTime] = useState("");

  const currentSong = songs[currentIndex];

  /* -------------------------------------------------------
     SYNCHRONIZE REFS
  ------------------------------------------------------- */

  useEffect(() => {
    songsRef.current = songs;
  }, [songs]);

  useEffect(() => {
    indexRef.current = currentIndex;
  }, [currentIndex]);

  useEffect(() => {
    playingRef.current = playing;
  }, [playing]);

  /* -------------------------------------------------------
     CLOCK
  ------------------------------------------------------- */

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

  /* -------------------------------------------------------
     LOAD PLAYLIST
  ------------------------------------------------------- */

  useEffect(() => {
    let cancelled = false;

    const loadPlaylist = async () => {
      try {
        const response = await fetch("/api/youtube", {
          cache: "no-store",
        });

        if (!response.ok) {
          throw new Error(
            `YouTube playlist request failed: ${response.status}`
          );
        }

        const data = await response.json();

        if (cancelled) return;

        if (Array.isArray(data.songs)) {
          const validSongs = data.songs.filter(
            (song: Song) =>
              song &&
              typeof song.id === "string" &&
              song.id.trim().length > 0
          );

          songsRef.current = validSongs;
          setSongs(validSongs);
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

  /* -------------------------------------------------------
     SEND YOUTUBE COMMAND
  ------------------------------------------------------- */

  const sendCommand = useCallback(
    (command: string, args: unknown[] = []) => {
      const iframe = playerRef.current;

      if (!iframe?.contentWindow) return;

      try {
        iframe.contentWindow.postMessage(
          JSON.stringify({
            event: "command",
            func: command,
            args,
          }),
          "*"
        );
      } catch (error) {
        console.error("YouTube command failed:", error);
      }
    },
    []
  );

  /* -------------------------------------------------------
     PLAY SONG
  ------------------------------------------------------- */

  const playSong = useCallback(
    (requestedIndex: number) => {
      const playlist = songsRef.current;

      if (!playlist.length) return;

      let index = requestedIndex;

      if (index < 0) {
        index = playlist.length - 1;
      }

      if (index >= playlist.length) {
        index = 0;
      }

      const song = playlist[index];

      if (!song?.id) return;

      indexRef.current = index;
      setCurrentIndex(index);

      switchingRef.current = true;
      playingRef.current = true;
      setPlaying(true);

      /*
       * Player has not loaded yet.
       * Store the requested song and let initialization
       * start it when the iframe becomes ready.
       */
      if (!playerRef.current?.contentWindow || !playerLoadedRef.current) {
        pendingIndexRef.current = index;
        return;
      }

      try {
        sendCommand("loadVideoById", [song.id]);

        window.setTimeout(() => {
          sendCommand("setVolume", [volumeRef.current]);
          sendCommand("playVideo");

          switchingRef.current = false;
          playingRef.current = true;
          setPlaying(true);
        }, 120);
      } catch (error) {
        console.error("YouTube playback error:", error);

        switchingRef.current = false;
        playingRef.current = false;
        setPlaying(false);
      }
    },
    [sendCommand]
  );

  /* -------------------------------------------------------
     NEXT
  ------------------------------------------------------- */

  const nextTrack = useCallback(() => {
    const playlist = songsRef.current;

    if (!playlist.length) return;

    const nextIndex =
      indexRef.current + 1 >= playlist.length
        ? 0
        : indexRef.current + 1;

    playSong(nextIndex);
  }, [playSong]);

  /* -------------------------------------------------------
     PREVIOUS
  ------------------------------------------------------- */

  const previousTrack = useCallback(() => {
    const playlist = songsRef.current;

    if (!playlist.length) return;

    const previousIndex =
      indexRef.current <= 0
        ? playlist.length - 1
        : indexRef.current - 1;

    playSong(previousIndex);
  }, [playSong]);

  /* -------------------------------------------------------
     INITIALIZE YOUTUBE IFRAME
  ------------------------------------------------------- */

  const initializeYouTubePlayer = useCallback(() => {
    const iframe = playerRef.current?.contentWindow;

    if (!iframe) return;

    playerLoadedRef.current = true;

    try {
      iframe.postMessage(
        JSON.stringify({
          event: "listening",
          id: 1,
          channel: "channel",
        }),
        "*"
      );

      iframe.postMessage(
        JSON.stringify({
          event: "command",
          func: "addEventListener",
          args: ["onStateChange"],
        }),
        "*"
      );

      iframe.postMessage(
        JSON.stringify({
          event: "command",
          func: "addEventListener",
          args: ["infoDelivery"],
        }),
        "*"
      );

      iframe.postMessage(
        JSON.stringify({
          event: "command",
          func: "setVolume",
          args: [volumeRef.current],
        }),
        "*"
      );

      const pending = pendingIndexRef.current;

      if (pending !== null) {
        pendingIndexRef.current = null;

        window.setTimeout(() => {
          playSong(pending);
        }, 150);
      }
    } catch (error) {
      console.error("YouTube initialization error:", error);
    }
  }, [playSong]);

  /* -------------------------------------------------------
     YOUTUBE EVENTS
  ------------------------------------------------------- */

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (!event.data) return;

      if (
        typeof event.origin === "string" &&
        !event.origin.includes("youtube.com") &&
        !event.origin.includes("youtube-nocookie.com")
      ) {
        return;
      }

      let data = event.data;

      try {
        if (typeof data === "string") {
          data = JSON.parse(data);
        }
      } catch {
        return;
      }

      if (!data || typeof data !== "object") return;

      if (data.event !== "infoDelivery") return;

      const info = data.info;

      if (!info) return;

      /* PLAYING */
      if (info.playerState === 1) {
        switchingRef.current = false;
        playingRef.current = true;
        setPlaying(true);
      }

      /* PAUSED */
      if (info.playerState === 2) {
        if (!switchingRef.current) {
          playingRef.current = false;
          setPlaying(false);
        }
      }

      /* ENDED */
      if (info.playerState === 0) {
        if (switchingRef.current) return;

        switchingRef.current = true;

        const playlist = songsRef.current;

        if (!playlist.length) {
          switchingRef.current = false;
          playingRef.current = false;
          setPlaying(false);
          return;
        }

        const nextIndex =
          indexRef.current + 1 >= playlist.length
            ? 0
            : indexRef.current + 1;

        window.setTimeout(() => {
          playSong(nextIndex);
        }, 100);
      }
    };

    window.addEventListener("message", handleMessage);

    return () => {
      window.removeEventListener("message", handleMessage);
    };
  }, [playSong]);

  /* -------------------------------------------------------
     PLAY / PAUSE
  ------------------------------------------------------- */

  const togglePlay = useCallback(() => {
    if (!songsRef.current.length) return;

    if (playingRef.current) {
      sendCommand("pauseVideo");

      playingRef.current = false;
      setPlaying(false);
    } else {
      sendCommand("setVolume", [volumeRef.current]);
      sendCommand("playVideo");

      playingRef.current = true;
      setPlaying(true);
    }
  }, [sendCommand]);

  /* -------------------------------------------------------
     UI
  ------------------------------------------------------- */

  return (
    <>
      <style jsx global>{`
        .music-player-button {
          -webkit-tap-highlight-color: transparent;
        }

        .music-player-button:focus-visible {
          outline: 1px solid rgba(255, 255, 255, 0.4);
          outline-offset: 2px;
        }
      `}</style>

      {/* CLOCK */}
      <div className="fixed left-5 top-5 z-[70]">
        <div className="font-mono text-sm tracking-widest text-white/80 drop-shadow-lg sm:text-base">
          {time}
        </div>
      </div>

      {/* STATUS */}
      <div className="fixed left-1/2 top-5 z-[70] -translate-x-1/2">
        <div className="flex items-center gap-2 rounded-full border border-white/10 bg-black/25 px-3 py-1.5 backdrop-blur-xl">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-green-400" />
          </span>

          <span className="text-[10px] tracking-widest text-white/60 sm:text-xs">
            {songs.length > 0 ? "MUSIC" : "LOADING"}
          </span>
        </div>
      </div>

      {/* HIDDEN YOUTUBE PLAYER */}
      <div className="pointer-events-none fixed left-0 top-0 z-[-1] h-px w-px overflow-hidden opacity-0">
        {currentSong && (
          <iframe
            ref={playerRef}
            onLoad={initializeYouTubePlayer}
            src={`https://www.youtube.com/embed/${currentSong.id}?enablejsapi=1&autoplay=0&controls=0&playsinline=1&rel=0&modestbranding=1&origin=${encodeURIComponent(
              typeof window !== "undefined"
                ? window.location.origin
                : ""
            )}`}
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
          <div className="mb-2 max-h-[300px] overflow-y-auto rounded-[20px] border border-white/[0.11] bg-black/[0.52] p-2 shadow-[0_12px_50px_rgba(0,0,0,0.5)] backdrop-blur-2xl">

            <div className="px-2 pb-2 pt-1 text-[9px] uppercase tracking-[0.2em] text-white/30">
              Playlist · {songs.length} songs
            </div>

            <div className="space-y-1">
              {songs.map((song, index) => (
                <button
                  key={`${song.id}-${index}`}
                  onClick={() => playSong(index)}
                  className={`music-player-button group flex w-full items-center gap-3 rounded-xl p-2 text-left transition-all ${
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

        {/* GLASS PLAYER */}
        <div className="rounded-[22px] border border-white/[0.10] bg-black/[0.38] p-2.5 shadow-[0_12px_50px_rgba(0,0,0,0.42)] backdrop-blur-2xl">

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
              onClick={() => setPlaylistOpen((prev) => !prev)}
              className="music-player-button min-w-0 flex-1 cursor-pointer text-left transition-opacity hover:opacity-75"
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
              onClick={previousTrack}
              disabled={!songs.length}
              className="music-player-button group flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/[0.07] bg-white/[0.025] text-white/45 shadow-[0_4px_20px_rgba(0,0,0,0.18)] backdrop-blur-md transition-all duration-200 hover:-translate-x-0.5 hover:border-white/[0.14] hover:bg-white/[0.07] hover:text-white active:scale-90 disabled:pointer-events-none disabled:opacity-20"
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

            {/* PLAY */}
            <button
              onClick={togglePlay}
              disabled={!currentSong}
              className="music-player-button group flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white text-black shadow-[0_6px_25px_rgba(255,255,255,0.16)] transition-all duration-200 hover:scale-105 hover:bg-white/90 active:scale-90 disabled:pointer-events-none disabled:opacity-30"
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
              onClick={nextTrack}
              disabled={!songs.length}
              className="music-player-button group flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/[0.07] bg-white/[0.025] text-white/45 shadow-[0_4px_20px_rgba(0,0,0,0.18)] backdrop-blur-md transition-all duration-200 hover:translate-x-0.5 hover:border-white/[0.14] hover:bg-white/[0.07] hover:text-white active:scale-90 disabled:pointer-events-none disabled:opacity-20"
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

            {/* PLAYLIST BUTTON */}
            <button
              onClick={() => setPlaylistOpen((prev) => !prev)}
              className="music-player-button group flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/[0.07] bg-white/[0.025] text-white/40 shadow-[0_4px_20px_rgba(0,0,0,0.18)] backdrop-blur-md transition-all duration-200 hover:scale-105 hover:border-white/[0.14] hover:bg-white/[0.07] hover:text-white active:scale-90"
              aria-label="Toggle playlist"
            >
              <span className="flex w-[16px] flex-col gap-[3.5px]">
                <span className="h-[1.5px] w-full rounded-full bg-current transition-all duration-200 group-hover:w-[11px]" />
                <span className="h-[1.5px] w-full rounded-full bg-current" />
                <span className="h-[1.5px] w-[10px] rounded-full bg-current transition-all duration-200 group-hover:w-full" />
              </span>
            </button>

          </div>
        </div>
      </div>
    </>
  );
}
