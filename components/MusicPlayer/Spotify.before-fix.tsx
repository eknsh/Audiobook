"use client";

import { useEffect, useRef, useState } from "react";

declare global {
  interface Window {
    Spotify?: {
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
  activateElement(): Promise<void>;

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
    const accessToken = sessionStorage.getItem(
      "spotify_access_token"
    );

    if (!accessToken) {
      setError("Please login with Spotify first.");
      return;
    }

    setToken(accessToken);

    const initializePlayer = (accessToken: string) => {
      if (!window.Spotify) {
        setError("Spotify SDK is not available.");
        return;
      }

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

      // --------------------------------
      // DEVICE READY
      // --------------------------------

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

      // --------------------------------
      // DEVICE NOT READY
      // --------------------------------

      player.addListener(
        "not_ready",
        ({ device_id }: { device_id: string }) => {
          console.log(
            "Spotify device went offline:",
            device_id
          );

          if (deviceIdRef.current === device_id) {
            deviceIdRef.current = null;
          }

          setConnected(false);
        }
      );

      // --------------------------------
      // PLAYER STATE
      // --------------------------------

      player.addListener(
        "player_state_changed",
        (state: any) => {
          if (!state) {
            return;
          }

          setPlaying(!state.paused);

          if (state.duration > 0) {
            setProgress(
              (state.position / state.duration) * 100
            );
          }

          const currentTrack =
            state.track_window?.current_track;

          if (currentTrack) {
            setTrack(currentTrack);
          }
        }
      );

      // --------------------------------
      // INITIALIZATION ERROR
      // --------------------------------

      player.addListener(
        "initialization_error",
        ({ message }: { message: string }) => {
          console.error(
            "Spotify initialization error:",
            message
          );

          setError(
            `Spotify initialization error: ${message}`
          );
        }
      );

      // --------------------------------
      // AUTHENTICATION ERROR
      // --------------------------------

      player.addListener(
        "authentication_error",
        ({ message }: { message: string }) => {
          console.error(
            "Spotify authentication error:",
            message
          );

          sessionStorage.removeItem(
            "spotify_access_token"
          );

          setError(
            "Spotify authentication expired. Please login again."
          );
        }
      );

      // --------------------------------
      // ACCOUNT ERROR
      // --------------------------------

      player.addListener(
        "account_error",
        ({ message }: { message: string }) => {
          console.error(
            "Spotify account error:",
            message
          );

          setError(
            "Spotify Premium is required for Web Playback."
          );
        }
      );

      // --------------------------------
      // PLAYBACK ERROR
      // --------------------------------

      player.addListener(
        "playback_error",
        ({ message }: { message: string }) => {
          console.error(
            "Spotify playback error:",
            message
          );

          setError(
            `Spotify playback error: ${message}`
          );
        }
      );

      // --------------------------------
      // AUTOPLAY
      // --------------------------------

      player.addListener(
        "autoplay_failed",
        () => {
          console.log(
            "Spotify autoplay blocked by browser."
          );

          setError(
            "Browser blocked autoplay. Press Play again."
          );
        }
      );

      // --------------------------------
      // CONNECT
      // --------------------------------

      player
        .connect()
        .then((success) => {
          console.log(
            "Spotify player connection:",
            success
          );

          if (!success) {
            setConnected(false);
            setError(
              "Unable to connect Spotify Web Playback."
            );
          }
        })
        .catch((error) => {
          console.error(
            "Spotify connection error:",
            error
          );

          setError(
            "Spotify Web Playback connection failed."
          );
        });
    };

    const loadSpotifySDK = () => {
      // SDK already loaded
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

        script.onload = () => {
          console.log(
            "Spotify Web Playback SDK loaded."
          );
        };

        script.onerror = () => {
          setError(
            "Unable to load Spotify Web Playback SDK."
          );
        };

        document.body.appendChild(script);
      }
    };

    loadSpotifySDK();

    return () => {
      if (playerRef.current) {
        playerRef.current.disconnect();
        playerRef.current = null;
      }

      deviceIdRef.current = null;
    };
  }, []);

  // --------------------------------
  // PLAY SPOTIFY TRACK
  // --------------------------------

  const playSpotifyTrack = async () => {
    if (!token) {
      setError("Spotify access token is missing.");
      return;
    }

    if (!playerRef.current) {
      setError("Spotify player is not initialized.");
      return;
    }

    if (!deviceIdRef.current) {
      setError(
        "Spotify player device is not ready. Wait a moment and try again."
      );
      return;
    }

    try {
      console.log(
        "Activating Spotify audio..."
      );

      // Allow browser audio playback
      try {
        await playerRef.current.activateElement();
      } catch (error) {
        console.log(
          "activateElement:",
          error
        );
      }

      const deviceId =
        deviceIdRef.current;

      // --------------------------------
      // TRANSFER PLAYBACK
      // --------------------------------

      console.log(
        "Transferring playback to Chai Tapri:",
        deviceId
      );

      const transferResponse =
        await fetch(
          "https://api.spotify.com/v1/me/player",
          {
            method: "PUT",

            headers: {
              Authorization:
                `Bearer ${token}`,
              "Content-Type":
                "application/json",
            },

            body: JSON.stringify({
              device_ids: [deviceId],
              play: false,
            }),
          }
        );

      if (
        !transferResponse.ok &&
        transferResponse.status !== 204
      ) {
        const data =
          await transferResponse
            .json()
            .catch(() => ({}));

        console.error(
          "Spotify transfer error:",
          transferResponse.status,
          data
        );

        setError(
          data.error?.message ||
            `Playback transfer failed (${transferResponse.status})`
        );

        return;
      }

      console.log(
        "Playback transferred successfully."
      );

      // --------------------------------
      // START TRACK
      // --------------------------------

      const playResponse =
        await fetch(
          `https://api.spotify.com/v1/me/player/play?device_id=${encodeURIComponent(
            deviceId
          )}`,
          {
            method: "PUT",

            headers: {
              Authorization:
                `Bearer ${token}`,
              "Content-Type":
                "application/json",
            },

            body: JSON.stringify({
              uris: [
                "spotify:track:4uLU6hMCjMI75M1A2tKUQC",
              ],
              position_ms: 0,
            }),
          }
        );

      if (
        !playResponse.ok &&
        playResponse.status !== 204
      ) {
        const data =
          await playResponse
            .json()
            .catch(() => ({}));

        console.error(
          "Spotify play error:",
          playResponse.status,
          data
        );

        setError(
          data.error?.message ||
            `Unable to start playback (${playResponse.status})`
        );

        return;
      }

      console.log(
        "Spotify playback started successfully."
      );

      setError("");

      // --------------------------------
      // RESUME SDK
      // --------------------------------

      try {
        await playerRef.current.resume();
      } catch (error) {
        console.log(
          "Resume error:",
          error
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

  // --------------------------------
  // TOGGLE PLAY
  // --------------------------------

  const togglePlay = async () => {
    if (!playerRef.current) {
      setError("Spotify player is not ready.");
      return;
    }

    try {
      await playerRef.current.activateElement();

      await playerRef.current.togglePlay();

      setError("");
    } catch (error) {
      console.error(
        "Toggle playback error:",
        error
      );

      setError(
        "Unable to control Spotify playback."
      );
    }
  };

  // --------------------------------
  // NEXT
  // --------------------------------

  const nextTrack = async () => {
    if (!playerRef.current) {
      return;
    }

    try {
      await playerRef.current.nextTrack();
    } catch (error) {
      console.error(
        "Next track error:",
        error
      );
    }
  };

  // --------------------------------
  // PREVIOUS
  // --------------------------------

  const previousTrack = async () => {
    if (!playerRef.current) {
      return;
    }

    try {
      await playerRef.current.previousTrack();
    } catch (error) {
      console.error(
        "Previous track error:",
        error
      );
    }
  };

  // --------------------------------
  // VOLUME
  // --------------------------------

  const handleVolume = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const value = Number(
      event.target.value
    );

    setVolume(value);

    if (!playerRef.current) {
      return;
    }

    try {
      await playerRef.current.setVolume(
        value
      );
    } catch (error) {
      console.error(
        "Volume error:",
        error
      );
    }
  };

  // --------------------------------
  // SEEK
  // --------------------------------

  const handleSeek = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    if (!playerRef.current) {
      return;
    }

    if (!track) {
      return;
    }

    const value = Number(
      event.target.value
    );

    const position =
      (value / 100) *
      track.duration_ms;

    try {
      await playerRef.current.seek(
        position
      );

      setProgress(value);
    } catch (error) {
      console.error(
        "Seek error:",
        error
      );
    }
  };

  // --------------------------------
  // UI
  // --------------------------------

  return (
    <div className="w-full max-w-md rounded-2xl border border-white/10 bg-black/70 p-5 text-white shadow-2xl backdrop-blur-xl">

      {/* HEADER */}

      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold">
            Chai Tapri
          </h2>

          <p className="text-xs text-white/50">
            Spotify Web Player
          </p>
        </div>

        <div
          className={`flex items-center gap-2 text-xs ${
            connected
              ? "text-green-400"
              : "text-red-400"
          }`}
        >
          <span
            className={`h-2 w-2 rounded-full ${
              connected
                ? "bg-green-400"
                : "bg-red-400"
            }`}
          />

          {connected
            ? "Connected"
            : "Disconnected"}
        </div>
      </div>

      {/* TRACK */}

      <div className="mb-5 flex items-center gap-4">

        {track?.album?.images?.[0]?.url ? (
          <img
            src={
              track.album.images[0].url
            }
            alt={track.name}
            className="h-16 w-16 rounded-xl object-cover"
          />
        ) : (
          <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-white/10 text-2xl">
            ☕
          </div>
        )}

        <div className="min-w-0 flex-1">

          <p className="truncate font-semibold">
            {track?.name ||
              "No song playing"}
          </p>

          <p className="truncate text-sm text-white/50">
            {track?.artists
              ?.map(
                (artist) =>
                  artist.name
              )
              .join(", ") ||
              "Spotify"}
          </p>

        </div>
      </div>

      {/* ERROR */}

      {error && (
        <div className="mb-4 rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-xs text-red-300">
          {error}
        </div>
      )}

      {/* PROGRESS */}

      <div className="mb-3">

        <input
          type="range"
          min="0"
          max="100"
          step="0.1"
          value={progress}
          onChange={handleSeek}
          className="w-full cursor-pointer accent-green-500"
        />

      </div>

      {/* CONTROLS */}

      <div className="mb-5 flex items-center justify-center gap-5">

        <button
          onClick={previousTrack}
          disabled={!connected}
          className="text-xl transition hover:scale-110 disabled:opacity-30"
        >
          ⏮
        </button>

        <button
          onClick={playSpotifyTrack}
          disabled={!connected}
          className="flex h-12 w-12 items-center justify-center rounded-full bg-green-500 text-xl font-bold text-black transition hover:scale-105 hover:bg-green-400 disabled:cursor-not-allowed disabled:opacity-30"
        >
          ▶
        </button>

        <button
          onClick={togglePlay}
          disabled={!connected}
          className="flex h-12 w-12 items-center justify-center rounded-full border border-white/20 text-xl transition hover:scale-105 hover:bg-white/10 disabled:opacity-30"
        >
          {playing ? "⏸" : "▶"}
        </button>

        <button
          onClick={nextTrack}
          disabled={!connected}
          className="text-xl transition hover:scale-110 disabled:opacity-30"
        >
          ⏭
        </button>

      </div>

      {/* VOLUME */}

      <div className="flex items-center gap-3">

        <span className="text-sm">
          🔊
        </span>

        <input
          type="range"
          min="0"
          max="1"
          step="0.01"
          value={volume}
          onChange={handleVolume}
          className="w-full cursor-pointer accent-green-500"
        />

      </div>

      {/* LOGIN / STATUS */}

      {!token && (
        <p className="mt-4 text-center text-sm text-white/50">
          Login with Spotify to start playback.
        </p>
      )}

    </div>
  );
}