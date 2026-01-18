"use client";

import { useEffect, useMemo, useRef, useState } from "react";

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

const formatTime = (seconds) => {
  if (!Number.isFinite(seconds)) return "0:00.00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  const ms = Math.floor((seconds - Math.floor(seconds)) * 100);
  return `${mins}:${secs.toString().padStart(2, "0")}.${ms.toString().padStart(2, "0")}`;
};

export default function ABLoopPage() {
  const [audioUrl, setAudioUrl] = useState("");
  const [fileName, setFileName] = useState("");
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [aPoint, setAPoint] = useState(0);
  const [bPoint, setBPoint] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLooping, setIsLooping] = useState(true);
  const [playbackRate, setPlaybackRate] = useState(1);
  const audioRef = useRef(null);
  const objectUrlRef = useRef(null);

  const hasAudio = Boolean(audioUrl);
  const loopLength = useMemo(() => Math.max(bPoint - aPoint, 0), [aPoint, bPoint]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.playbackRate = playbackRate;
  }, [playbackRate]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleLoaded = () => {
      const nextDuration = Number.isFinite(audio.duration) ? audio.duration : 0;
      setDuration(nextDuration);
      setBPoint((prev) => (prev > 0 ? clamp(prev, 0, nextDuration) : nextDuration));
      setAPoint((prev) => clamp(prev, 0, nextDuration));
    };

    const handleTimeUpdate = () => {
      const nextTime = audio.currentTime || 0;
      setCurrentTime(nextTime);
      if (isLooping && bPoint > aPoint && nextTime >= bPoint) {
        audio.currentTime = aPoint;
        audio.play();
      }
    };

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);

    audio.addEventListener("loadedmetadata", handleLoaded);
    audio.addEventListener("timeupdate", handleTimeUpdate);
    audio.addEventListener("play", handlePlay);
    audio.addEventListener("pause", handlePause);

    return () => {
      audio.removeEventListener("loadedmetadata", handleLoaded);
      audio.removeEventListener("timeupdate", handleTimeUpdate);
      audio.removeEventListener("play", handlePlay);
      audio.removeEventListener("pause", handlePause);
    };
  }, [aPoint, bPoint, isLooping]);

  useEffect(() => {
    return () => {
      if (objectUrlRef.current?.startsWith("blob:")) {
        URL.revokeObjectURL(objectUrlRef.current);
      }
    };
  }, []);

  const handleUpload = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("audio/")) return;

    if (objectUrlRef.current?.startsWith("blob:")) {
      URL.revokeObjectURL(objectUrlRef.current);
    }

    const nextUrl = URL.createObjectURL(file);
    objectUrlRef.current = nextUrl;
    setAudioUrl(nextUrl);
    setFileName(file.name);
    setCurrentTime(0);
    setAPoint(0);
    setBPoint(0);
    setIsPlaying(false);
    event.target.value = "";
  };

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) {
      audio.play();
    } else {
      audio.pause();
    }
  };

  const updateA = (value) => {
    const next = clamp(value, 0, duration);
    setAPoint(next);
    setBPoint((prev) => (prev < next ? next : prev));
    if (audioRef.current) {
      audioRef.current.currentTime = next;
      setCurrentTime(next);
    }
  };

  const updateB = (value) => {
    const next = clamp(value, 0, duration);
    setBPoint(next);
    setAPoint((prev) => (prev > next ? next : prev));
    if (audioRef.current) {
      audioRef.current.currentTime = next;
      setCurrentTime(next);
    }
  };

  const markA = () => updateA(currentTime);
  const markB = () => updateB(currentTime);

  const nudge = (point, delta) => {
    if (point === "A") {
      updateA(aPoint + delta);
    } else {
      updateB(bPoint + delta);
    }
  };

  return (
    <main className="min-h-screen overflow-hidden bg-ink text-cream">
      <div className="absolute inset-0 bg-gradient-to-br from-ink via-ink to-[#0f1a24]" />
      <div className="pointer-events-none absolute -left-20 top-20 h-72 w-72 rounded-full bg-[#ff784f]/20 blur-3xl" />
      <div className="pointer-events-none absolute -right-20 bottom-10 h-72 w-72 rounded-full bg-[#2dd4bf]/20 blur-3xl" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,#1a2a38_0%,transparent_45%)] opacity-80" />

      <section className="relative mx-auto grid w-full max-w-6xl gap-10 px-6 py-12 lg:grid-cols-[1.05fr_1fr]">
        <div className="flex flex-col gap-6 rounded-[32px] border border-white/10 bg-white/5 p-8 shadow-[0_30px_80px_rgba(0,0,0,0.45)] backdrop-blur-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.4em] text-sand">AB Loop Studio</p>
              <h1 className="mt-4 font-display text-4xl leading-tight text-cream">
                精准卡点，反复听你要的那一段。
              </h1>
            </div>
            <button
              type="button"
              onClick={() => setIsLooping((prev) => !prev)}
              className={`rounded-full border px-4 py-2 text-xs uppercase tracking-[0.2em] transition ${
                isLooping ? "border-accent bg-accent text-ink" : "border-white/20 text-sand"
              }`}
            >
              Loop {isLooping ? "On" : "Off"}
            </button>
          </div>

          <div className="grid gap-4 rounded-2xl border border-white/10 bg-[#0e1620] p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <label className="inline-flex cursor-pointer items-center gap-3 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm text-sand transition hover:border-accent">
                  <input type="file" accept="audio/*" onChange={handleUpload} className="hidden" />
                  Upload Audio
                </label>
                <span className="text-xs text-white/50">
                  {fileName || "No file selected"}
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs uppercase tracking-[0.3em] text-white/40">
                <span>{formatTime(currentTime)}</span>
                <span className="text-accent">/ {formatTime(duration)}</span>
              </div>
            </div>

            <input
              type="range"
              min="0"
              max={Math.max(duration, 0)}
              step="0.01"
              value={Math.min(currentTime, duration)}
              onChange={(event) => {
                const next = Number(event.target.value);
                setCurrentTime(next);
                if (audioRef.current) {
                  audioRef.current.currentTime = next;
                }
              }}
              disabled={!hasAudio}
              className="range"
            />

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={togglePlay}
                disabled={!hasAudio}
                className="rounded-full bg-cream px-6 py-3 text-sm font-semibold text-ink transition hover:translate-y-[-1px] disabled:opacity-40"
              >
                {isPlaying ? "Pause" : "Play"}
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!audioRef.current) return;
                  audioRef.current.currentTime = aPoint;
                  audioRef.current.play();
                }}
                disabled={!hasAudio || loopLength <= 0}
                className="rounded-full border border-white/20 px-6 py-3 text-sm text-sand transition hover:border-accent disabled:opacity-40"
              >
                Play A→B
              </button>
              <div className="ml-auto flex items-center gap-3 rounded-full border border-white/15 bg-white/5 px-4 py-2 text-xs uppercase tracking-[0.3em] text-sand">
                <span>Speed</span>
                <span className="text-accent">{playbackRate.toFixed(2)}x</span>
              </div>
            </div>

            <input
              type="range"
              min="0.5"
              max="2"
              step="0.05"
              value={playbackRate}
              onChange={(event) => setPlaybackRate(Number(event.target.value))}
              className="range range-accent"
            />
          </div>

          <div className="grid gap-4 rounded-2xl border border-white/10 bg-white/5 p-5">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent/20 text-accent">
                  A
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-white/50">Point A</p>
                  <p className="font-display text-2xl">{formatTime(aPoint)}</p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button type="button" onClick={markA} disabled={!hasAudio} className="pill">
                  Set A
                </button>
                <button type="button" onClick={() => nudge("A", -0.25)} disabled={!hasAudio} className="pill">
                  -0.25s
                </button>
                <button type="button" onClick={() => nudge("A", 0.25)} disabled={!hasAudio} className="pill">
                  +0.25s
                </button>
              </div>
            </div>
            <input
              type="range"
              min="0"
              max={Math.max(duration, 0)}
              step="0.01"
              value={Math.min(aPoint, duration)}
              onChange={(event) => updateA(Number(event.target.value))}
              disabled={!hasAudio}
              className="range"
            />
          </div>

          <div className="grid gap-4 rounded-2xl border border-white/10 bg-white/5 p-5">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-mint/20 text-mint">
                  B
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-white/50">Point B</p>
                  <p className="font-display text-2xl">{formatTime(bPoint)}</p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button type="button" onClick={markB} disabled={!hasAudio} className="pill">
                  Set B
                </button>
                <button type="button" onClick={() => nudge("B", -0.25)} disabled={!hasAudio} className="pill">
                  -0.25s
                </button>
                <button type="button" onClick={() => nudge("B", 0.25)} disabled={!hasAudio} className="pill">
                  +0.25s
                </button>
              </div>
            </div>
            <input
              type="range"
              min="0"
              max={Math.max(duration, 0)}
              step="0.01"
              value={Math.min(bPoint, duration)}
              onChange={(event) => updateB(Number(event.target.value))}
              disabled={!hasAudio}
              className="range"
            />
          </div>
        </div>

        <div className="flex flex-col gap-6">
          <div className="rounded-[28px] border border-white/10 bg-gradient-to-br from-[#121b25] via-[#0c141c] to-[#0b0f14] p-8 shadow-[0_40px_120px_rgba(0,0,0,0.55)]">
            <p className="text-xs uppercase tracking-[0.4em] text-white/40">Loop Preview</p>
            <div className="mt-6 grid gap-4">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
                <p className="text-xs uppercase tracking-[0.3em] text-white/50">A to B length</p>
                <p className="mt-2 font-display text-5xl text-accent">
                  {loopLength > 0 ? `${loopLength.toFixed(2)}s` : "--"}
                </p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
                <p className="text-xs uppercase tracking-[0.3em] text-white/50">Flow Tips</p>
                <ul className="mt-3 grid gap-2 text-sm text-sand">
                  <li>拖动进度条到你想听的位置，再点 Set A / Set B。</li>
                  <li>用 -0.25s / +0.25s 微调，让循环卡得更准。</li>
                  <li>速度滑杆可在 0.5x - 2x 之间精细调节。</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="rounded-[28px] border border-white/10 bg-white/5 p-8">
            <p className="text-xs uppercase tracking-[0.4em] text-white/40">Live Markers</p>
            <div className="mt-6 grid gap-4">
              <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-[#0c131a] p-5">
                <span className="text-sm text-sand">Current</span>
                <span className="font-display text-3xl text-cream">{formatTime(currentTime)}</span>
              </div>
              <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-[#0c131a] p-5">
                <span className="text-sm text-sand">Playback rate</span>
                <span className="font-display text-3xl text-mint">{playbackRate.toFixed(2)}x</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <audio ref={audioRef} src={audioUrl} preload="metadata" />

      <style jsx global>{`
        @import url("https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;700&family=IBM+Plex+Sans:wght@300;400;500;600&display=swap");

        :root {
          --ink: #0b0f14;
          --cream: #f6f1e7;
          --sand: #a7b2bc;
          --accent: #ff784f;
          --mint: #2dd4bf;
        }

        body {
          font-family: "IBM Plex Sans", system-ui, -apple-system, sans-serif;
          background: var(--ink);
          color: var(--cream);
        }

        .font-display {
          font-family: "Fraunces", "Times New Roman", serif;
        }

        .text-cream {
          color: var(--cream);
        }

        .text-sand {
          color: var(--sand);
        }

        .text-accent {
          color: var(--accent);
        }

        .text-mint {
          color: var(--mint);
        }

        .bg-ink {
          background-color: var(--ink);
        }

        .bg-accent {
          background-color: var(--accent);
        }

        .bg-mint {
          background-color: var(--mint);
        }

        .pill {
          border-radius: 999px;
          border: 1px solid rgba(255, 255, 255, 0.2);
          padding: 0.45rem 0.9rem;
          font-size: 0.75rem;
          text-transform: uppercase;
          letter-spacing: 0.2em;
          color: var(--sand);
          transition: border-color 0.2s ease, color 0.2s ease;
        }

        .pill:hover {
          border-color: var(--accent);
          color: var(--cream);
        }

        .pill:disabled {
          opacity: 0.4;
        }

        .range {
          appearance: none;
          width: 100%;
          height: 6px;
          border-radius: 999px;
          background: linear-gradient(90deg, rgba(255, 255, 255, 0.12), rgba(255, 255, 255, 0.06));
          outline: none;
        }

        .range::-webkit-slider-thumb {
          appearance: none;
          width: 18px;
          height: 18px;
          border-radius: 50%;
          background: var(--cream);
          border: 2px solid var(--accent);
          box-shadow: 0 0 0 6px rgba(255, 120, 79, 0.15);
          transition: transform 0.2s ease;
        }

        .range::-webkit-slider-thumb:active {
          transform: scale(1.15);
        }

        .range::-moz-range-thumb {
          width: 18px;
          height: 18px;
          border-radius: 50%;
          background: var(--cream);
          border: 2px solid var(--accent);
        }

        .range-accent::-webkit-slider-thumb {
          border-color: var(--mint);
          box-shadow: 0 0 0 6px rgba(45, 212, 191, 0.15);
        }
      `}</style>
    </main>
  );
}
