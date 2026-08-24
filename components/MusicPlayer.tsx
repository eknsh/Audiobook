"use client";

import { useEffect, useRef, useState } from "react";

type Track = {
  title: string;
  artist: string;
  src: string;
};

const tracks: Track[] = [
  {
    title: "Chai Tapri Vibes",
    artist: "Chai Tapri",
    src: "/music/chai-vibes.mp3",
  },
  {
    title: "Indian Streets",
    artist: "Chai Tapri",
    src: "/music/indian-streets.mp3",
  },
  {
    title: "Late Night Chai",
    artist: "Chai Tapri",
    src: "/music/late-night-chai.mp3",
  },
];

export default function MusicPlayer() {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const [currentTrack, setCurrentTrack] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [volume, setVolume] = useState(0.7);
  const [progress, setProgress] = useState(0);

  const track = tracks[currentTrack];

  // Play / pause / volume
  useEffect(() => {
    const audio = audioRef.current;

    if (!audio) return;

    audio.volume = volume;

    if (playing) {
      audio.play().catch(() => {
        setPlaying(false);
      });
    } else {
      audio.pause();
    }
  }, [playing, currentTrack, volume]);

  // Track progress and auto-next
  useEffect(() => {
    const audio = audioRef.current;

    if (!audio) return;

    const updateProgress = () => {
      if (!audio.duration || isNaN(audio.duration)) return;

      setProgress((audio.currentTime / audio.duration) * 100);
    };

    const handleEnded = () => {
      setProgress(0);
      setCurrentTrack((prev) => (prev + 1) % tracks.length);
    };

    audio.addEventListener("timeupdate", updateProgress);
    audio.addEventListener("ended", handleEnded);

    return () => {
      audio.removeEventListener("timeupdate", updateProgress);
      audio.removeEventListener("ended", handleEnded);
    };
  }, []);

  const togglePlay = () => {
    setPlaying((prev) => !prev);
  };

  const nextTrack = () => {
    setProgress(0);
    setCurrentTrack((prev) => (prev + 1) % tracks.length);
  };

  const previousTrack = () => {
    setProgress(0);

    setCurrentTrack((prev) =>
      prev === 0 ? tracks.length - 1 : prev - 1
    );
  };

  const handleProgress = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const audio = audioRef.current;

    if (!audio || !audio.duration) return;

    const value = Number(event.target.value);

    audio.currentTime = (value / 100) * audio.duration;

    setProgress(value);
  };

  const handleVolume = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const value = Number(event.target.value);

    setVolume(value);

    if (audioRef.current) {
      audioRef.current.volume = value;
    }
  };

  return (
    <div className="fixed bottom-5 left-1/2 z-50 w-[92%] max-w-md -translate-x-1/2">
      <div className="rounded-2xl border border-white/10 bg-black/80 p-4 shadow-2xl backdrop-blur-xl">

        {/* Audio */}
        <audio
          ref={audioRef}
          src={track.src}
          preload="metadata"
        />

        {/* Track information */}
        <div className="mb-3 flex items-center gap-3">

          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-orange-500 text-xl shadow-lg">
            ☕
          </div>

          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-white">
              {track.title}
            </p>

            <p className="truncate text-xs text-white/50">
              {track.artist}
            </p>
          </div>

          <div className="text-xs text-white/40">
            {currentTrack + 1}/{tracks.length}
          </div>

        </div>

        {/* Progress bar */}
        <input
          type="range"
          min="0"
          max="100"
          step="0.1"
          value={progress}
          onChange={handleProgress}
          className="mb-3 h-1 w-full cursor-pointer accent-orange-500"
          aria-label="Music progress"
        />

        {/* Controls */}
        <div className="flex items-center justify-between">

          {/* Previous */}
          <button
            onClick={previousTrack}
            className="flex h-9 w-9 items-center justify-center rounded-full text-lg text-white/70 transition hover:bg-white/10 hover:text-white"
            aria-label="Previous track"
          >
            ⏮
          </button>

          {/* Play / Pause */}
          <button
            onClick={togglePlay}
            className="flex h-12 w-12 items-center justify-center rounded-full bg-orange-500 text-xl text-white shadow-lg transition hover:scale-105 hover:bg-orange-400"
            aria-label={playing ? "Pause" : "Play"}
          >
            {playing ? "❚❚" : "▶"}
          </button>

          {/* Next */}
          <button
            onClick={nextTrack}
            className="flex h-9 w-9 items-center justify-center rounded-full text-lg text-white/70 transition hover:bg-white/10 hover:text-white"
            aria-label="Next track"
          >
            ⏭
          </button>

          {/* Volume */}
          <div className="ml-2 flex items-center gap-2">
            <span className="text-sm">
              {volume === 0 ? "🔇" : "🔊"}
            </span>

            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={volume}
              onChange={handleVolume}
              className="w-16 cursor-pointer accent-orange-500"
              aria-label="Volume"
            />
          </div>

        </div>
      </div>
    </div>
  );
}