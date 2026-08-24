
"use client";

import { useEffect, useRef, useState } from "react";

declare global {
  interface Window {
    Spotify: {
      Player: new (options: {
        name: string;
        getOAuthToken: (callback: (token: string) => void) => void;
        volume?: number;
        enableMediaSession?: boolean;
      }) => SpotifyPlayer;
    };

    onSpotifyWebPlaybackSDKReady?: () => void;
  }
}

interface SpotifyPlayer {
  connect(): Promise<boolean>;
  disconnect(): void;
  togglePlay(): Promise<void>;
  nextTrack(): Promise<void>;
  previousTrack(): Promise<void>;
  pause(): Promise<void>;
  resume(): Promise<void>;
  seek(positionMs: number): Promise<void>;
  setVolume(volume: number): Promise<void>;

  addListener(
    event: string,
    callback: (data: any) => void
  ): boolean;

  removeListener(
    event: string,
    callback?: (data: any) => void
  ): boolean;
}

type SpotifyTrack = {
  name: string;
  artists: {
    name: string;
  }[];
  album: {
    images: {
      url: string;
    }[];
  };
  duration_ms: number;
};

export default function Spotify() {
  const playerRef = useRef<SpotifyPlayer | null>(null);
  const deviceIdRef = useRef<string | null>(null);

  const [token, setToken] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [track, setTrack] = useState<SpotifyTrack | null>(null);
  const [progress, setProgress] = useState(0);
  const [volume, setVolume] = useState(0.7);
  const [error, setError] = useState("");

  useEffect(() => {
    const accessToken =
      sessionStorage.getItem("spotify_access_token");

    if (!accessToken) {
      return;
    }

    setToken(accessToken);

    const loadSpotifySDK = () => {
      if (window.Spotify) {
        initializePlayer(accessToken);
        return;
      }

      window.onSpotifyWebPlaybackSDKReady = () => {
        initializePlayer(accessToken);
      };

      const existingScript = document.querySelector(
        'script[src="https://sdk.scdn.co/spotify-player.js"]'
      );

      if (!existingScript) {
        const script = document.createElement("script");

        script.src =
          "https://sdk.scdn.co/spotify-player.js";

        script.async = true;

        document.body.appendChild(script);
      }
    };

    const initializePlayer = (accessToken: string) => {
      if (playerRef.current) {
        return;
      }

      const player = new window.Spotify.Player({
        name: "Chai Tapri",
        volume: volume,
        enableMediaSession: true,

        getOAuthToken: (callback) => {
          callback(accessToken);
        },
      });

      playerRef.current = player;

      player.addListener(
        "ready",
        ({ device_id }: { device_id: string }) => {
          console.log(
            "Spotify Web Playback ready:",
            device_id
          );

          deviceIdRef.current = device_id;

          setConnected(true);
          setError("");
        }
      );

      player.addListener(
        "not_ready",
        ({ device_id }: { device_id: string }) => {
          console.log(
            "Spotify device went offline:",
            device_id
          );

          setConnected(false);
        }
      );

      player.addListener(
        "player_state_changed",
        (state: any) => {
          if (!state) {
            return;
          }

          setPlaying(!state.paused);

          setProgress(
            state.position / state.duration * 100
          );

          const currentTrack =
            state.track_window?.current_track;

          if (currentTrack) {
            setTrack(currentTrack);
          }
        }
      );

      player.addListener(
        "initialization_error",
        ({ message }: { message: string }) => {
          console.error(
            "Spotify initialization error:",
            message
          );

          setError(message);
        }
      );

      player.addListener(
        "authentication_error",
        ({ message }: { message: string }) => {
          console.error(
            "Spotify authentication error:",
            message
          );

          setError(
            "Spotify authentication expired. Please login again."
          );
        }
      );

      player.addListener(
        "account_error",
        ({ message }: { message: string }) => {
          console.error(
            "Spotify account error:",
            message
          );

          setError(
            "Spotify Premium is required for web playback."
          );
        }
      );

      player.addListener(
        "playback_error",
        ({ message }: { message: string }) => {
          console.error(
            "Spotify playback error:",
            message
          );

          setError(message);
        }
      );

      player.addListener(
        "autoplay_failed",
        () => {
          console.log(
            "Spotify autoplay blocked by browser."
          );
        }
      );

      player.connect().then((success) => {
        console.log(
          "Spotify player connection:",
          success
        );
      });
    };

    loadSpotifySDK();

    return () => {
      if (playerRef.current) {
        playerRef.current.disconnect();
        playerRef.current = null;
      }
    };
  }, []);

  const playSpotifyTrack = async () => {
    if (!token || !deviceIdRef.current) {
      setError("Spotify player is not ready.");
      return;
    }

    try {
      const response = await fetch(
        `https://api.spotify.com/v1/me/player/play?device_id=${deviceIdRef.current}`,
        {
          method: "PUT",

          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },

          body: JSON.stringify({
            uris: [
              "spotify:track:4uLU6hMCjMI75M1A2tKUQC",
            ],
          }),
        }
      );

      if (!response.ok) {
        const data = await response.json();

        console.error(
          "Spotify play error:",
          data
        );

        setError(
          data.error?.message ||
            "Unable to start Spotify playback."
        );
      }
    } catch (error) {
      console.error(
        "Spotify playback request failed:",
        error
      );

      setError(
        "Unable to communicate with Spotify."
      );
    }
  };

  const togglePlay = async () => {
    if (!playerRef.current) {
      return;
    }

    try {
      await playerRef.current.togglePlay();
    } catch (error) {
      console.error(error);
    }
  };

  const nextTrack = async () => {
    if (!playerRef.current) {
      return;
    }

    await playerRef.current.nextTrack();
  };

  const previousTrack = async () => {
    if (!playerRef.current) {
      return;
    }

    await playerRef.current.previousTrack();
  };

  const handleVolume = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const value = Number(event.target.value);

    setVolume(value);

    if (playerRef.current) {
      await playerRef.current.setVolume(value);
    }
  };

  if (!token) {
    return null;
  }

  return (
    <div className="fixed bottom-5 left-1/2 z-[100] w-[92%] max-w-md -translate-x-1/2">
      <div className="rounded-2xl border border-white/10 bg-black/85 p-4 text-white shadow-2xl backdrop-blur-xl">

        {/* Header */}
        <div className="mb-3 flex items-center gap-3">

          <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-green-500 text-xl text-black">
            {track?.album?.images?.[0]?.url ? (
              <img
                src={track.album.images[0].url}
                alt=""
                className="h-full w-full object-cover"
              />
            ) : (
              "♫"
            )}
          </div>

          <div className="min-w-0 flex-1">

            <p className="truncate text-sm font-semibold">
              {track?.name || "Spotify Connected"}
            </p>

            <p className="truncate text-xs text-white/50">
              {track
                ? track.artists
                    .map((artist) => artist.name)
                    .join(", ")
                : connected
                ? "Chai Tapri Player"
                : "Connecting..."}
            </p>

          </div>

          <div
            className={`h-2 w-2 rounded-full ${
              connected
                ? "bg-green-400"
                : "bg-yellow-400"
            }`}
          />

        </div>

        {/* Error */}
        {error && (
          <p className="mb-3 rounded-lg bg-red-500/10 px-3 py-2 text-xs text-red-300">
            {error}
          </p>
        )}

        {/* Progress */}
        <div className="mb-3">

          <input
            type="range"
            min="0"
            max="100"
            step="0.1"
            value={progress}
            readOnly
            className="h-1 w-full accent-green-500"
          />

        </div>

        {/* Controls */}
        <div className="flex items-center justify-between">

          <button
            onClick={previousTrack}
            className="flex h-9 w-9 items-center justify-center rounded-full text-lg text-white/70 transition hover:bg-white/10 hover:text-white"
          >
            ⏮
          </button>

          <button
            onClick={playSpotifyTrack}
            disabled={!connected}
            className="rounded-full bg-green-500 px-4 py-2 text-sm font-semibold text-black transition hover:scale-105 hover:bg-green-400 disabled:opacity-40"
          >
            Play Spotify
          </button>

          <button
            onClick={togglePlay}
            disabled={!connected}
            className="flex h-12 w-12 items-center justify-center rounded-full bg-green-500 text-xl text-black shadow-lg transition hover:scale-105 hover:bg-green-400 disabled:opacity-40"
          >
            {playing ? "⏸" : "▶"}
          </button>

          <button
            onClick={nextTrack}
            className="flex h-9 w-9 items-center justify-center rounded-full text-lg text-white/70 transition hover:bg-white/10 hover:text-white"
          >
            ⏭
          </button>

          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={volume}
            onChange={handleVolume}
            className="w-16 accent-green-500"
            aria-label="Spotify volume"
          />

        </div>

      </div>
    </div>
  );
}
