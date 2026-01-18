"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

const DEFAULT_TEXT = "Paste text, upload a file, or fetch a URL to begin.";

function extractWords(text) {
  const normalized = text
    .replace(/\u00a0/g, " ")
    .replace(/[#()]/g, " ")
    .replace(/[^A-Za-z'\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const parts = normalized ? normalized.split(" ") : [];
  return parts.filter((word) => /[A-Za-z]/.test(word));
}

function splitWord(word) {
  const match = word.match(/^(\W*)([\w']+)(\W*)$/);
  if (!match) {
    return { lead: "", core: word, tail: "" };
  }
  return { lead: match[1], core: match[2], tail: match[3] };
}

function formatTime(seconds) {
  if (!Number.isFinite(seconds)) return "0:00";
  const minutes = Math.floor(seconds / 60);
  const remaining = Math.floor(seconds % 60);
  return `${minutes}:${remaining.toString().padStart(2, "0")}`;
}

function findWordIndex(time, alignment) {
  if (!alignment.length) return 0;
  let low = 0;
  let high = alignment.length - 1;
  let result = 0;

  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    const current = alignment[mid];

    if (time < current.start) {
      high = mid - 1;
    } else if (time > current.end) {
      result = mid;
      low = mid + 1;
    } else {
      return mid;
    }
  }

  return Math.min(result, alignment.length - 1);
}

export default function HomePage() {
  const [rawText, setRawText] = useState("");
  const [alignment, setAlignment] = useState([]);
  const [audioUrl, setAudioUrl] = useState("/output_audio.mp3");
  const [index, setIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [status, setStatus] = useState("Ready.");
  const [isLoading, setIsLoading] = useState(false);
  const [showReader, setShowReader] = useState(false);
  const [theme, setTheme] = useState("dark");
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [isLooping, setIsLooping] = useState(false);
  const audioRef = useRef(null);
  const audioUrlRef = useRef(null);

  const words = useMemo(
    () => (alignment.length ? alignment.map((item) => item.word) : extractWords(rawText)),
    [alignment, rawText]
  );
  const alignmentText = useMemo(
    () => (alignment.length ? alignment.map((item) => item.word).join(" ") : ""),
    [alignment]
  );
  const total = words.length;
  const currentWord = words[index];

  const applyAlignment = useCallback((items) => {
    setAlignment(items);
    setIndex(0);
    setRawText((prev) => (prev.trim() ? prev : items.map((item) => item.word).join(" ")));
  }, []);

  useEffect(() => {
    if (index >= total && total > 0) {
      setIndex(0);
      setIsPlaying(false);
    }
  }, [total, index]);

  useEffect(() => {
    const saved = localStorage.getItem("theme");
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    if (saved === "light" || saved === "dark") {
      setTheme(saved);
    } else {
      setTheme(prefersDark ? "dark" : "light");
    }
  }, []);

  useEffect(() => {
    if (theme === "light") {
      document.documentElement.setAttribute("data-theme", "light");
    } else {
      document.documentElement.removeAttribute("data-theme");
    }
    localStorage.setItem("theme", theme);
  }, [theme]);

  useEffect(() => {
    let isMounted = true;

    const loadAlignment = async () => {
      try {
        setStatus("Loading audio alignment...");
        const response = await fetch("/words_alignment.json");
        if (!response.ok) {
          throw new Error("Alignment not found.");
        }
        const data = await response.json();
        if (!Array.isArray(data)) {
          throw new Error("Alignment format invalid.");
        }
        const cleaned = data
          .filter((item) => item && typeof item.word === "string")
          .map((item) => ({
            word: item.word.trim(),
            start: Number(item.start) || 0,
            end: Number(item.end) || 0
          }))
          .filter((item) => item.word.length);

        if (!isMounted) return;
        applyAlignment(cleaned);
        setStatus("Audio alignment ready.");
      } catch (error) {
        if (!isMounted) return;
        setStatus("Audio alignment failed to load.");
      }
    };

    loadAlignment();
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    return () => {
      if (audioUrlRef.current && audioUrlRef.current.startsWith("blob:")) {
        URL.revokeObjectURL(audioUrlRef.current);
      }
    };
  }, []);

  const updateFromTime = useCallback(
    (time) => {
      setCurrentTime(time);
      if (!alignment.length) return;
      const nextIndex = findWordIndex(time, alignment);
      setIndex((prev) => (prev === nextIndex ? prev : nextIndex));
    },
    [alignment]
  );

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleLoadedMetadata = () => setDuration(Number.isFinite(audio.duration) ? audio.duration : 0);
    const handleSeeked = () => updateFromTime(audio.currentTime || 0);
    const handleTimeUpdate = () => {
      if (!audio.paused) return;
      updateFromTime(audio.currentTime || 0);
    };
    const handleEnded = () => {
      if (isLooping) {
        const restartTime = alignment[0]?.start || 0;
        audio.currentTime = restartTime;
        updateFromTime(restartTime);
        audio.play();
        return;
      }
      setIsPlaying(false);
      updateFromTime(audio.duration || audio.currentTime || 0);
    };

    audio.addEventListener("play", handlePlay);
    audio.addEventListener("pause", handlePause);
    audio.addEventListener("loadedmetadata", handleLoadedMetadata);
    audio.addEventListener("seeked", handleSeeked);
    audio.addEventListener("timeupdate", handleTimeUpdate);
    audio.addEventListener("ended", handleEnded);

    return () => {
      audio.removeEventListener("play", handlePlay);
      audio.removeEventListener("pause", handlePause);
      audio.removeEventListener("loadedmetadata", handleLoadedMetadata);
      audio.removeEventListener("seeked", handleSeeked);
      audio.removeEventListener("timeupdate", handleTimeUpdate);
      audio.removeEventListener("ended", handleEnded);
    };
  }, [alignment, isLooping, updateFromTime]);

  useEffect(() => {
    if (!isPlaying) return;
    let rafId = 0;

    const tick = () => {
      if (audioRef.current) {
        updateFromTime(audioRef.current.currentTime || 0);
      }
      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [isPlaying, updateFromTime]);


  const handleText = (text) => {
    setRawText(text);
    setIndex(0);
    setIsPlaying(false);
    setShowReader(true);
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setCurrentTime(0);
    }
  };

  const handleAudioFile = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    setStatus("Loading audio...");

    try {
      if (!file.type.startsWith("audio/")) {
        throw new Error("Not an audio file.");
      }
      const nextUrl = URL.createObjectURL(file);
      if (audioUrlRef.current && audioUrlRef.current.startsWith("blob:")) {
        URL.revokeObjectURL(audioUrlRef.current);
      }
      audioUrlRef.current = nextUrl;
      setAudioUrl(nextUrl);

      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
        setCurrentTime(0);
      }

      setStatus("Loaded audio file.");
    } catch (error) {
      setStatus("Could not read that audio file.");
    } finally {
      setIsLoading(false);
      event.target.value = "";
    }
  };

  const handleAlignmentFile = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    setStatus("Loading alignment...");

    try {
      if (
        file.type !== "application/json" &&
        !file.name.toLowerCase().endsWith(".json")
      ) {
        throw new Error("Not a JSON file.");
      }
      const text = await file.text();
      const data = JSON.parse(text);
      if (!Array.isArray(data)) {
        throw new Error("Alignment JSON must be an array.");
      }
      const cleaned = data
        .filter((item) => item && typeof item.word === "string")
        .map((item) => ({
          word: item.word.trim(),
          start: Number(item.start) || 0,
          end: Number(item.end) || 0
        }))
        .filter((item) => item.word.length);
      applyAlignment(cleaned);
      setStatus("Loaded alignment file.");
    } catch (error) {
      setStatus("Could not read that alignment file.");
    } finally {
      setIsLoading(false);
      event.target.value = "";
    }
  };

  const handlePaste = () => {
    if (!rawText.trim()) {
      setStatus("Paste or type some text to begin.");
      return;
    }
    setIndex(0);
    setIsPlaying(false);
    setStatus("Text ready.");
    setShowReader(true);
  };

  const togglePlay = () => {
    if (!total) {
      setStatus("Load text first.");
      return;
    }
    if (!audioRef.current) {
      setStatus("Audio not ready.");
      return;
    }
    if (audioRef.current.paused) {
      audioRef.current.play();
    } else {
      audioRef.current.pause();
    }
  };

  const restart = () => {
    if (!total) {
      setStatus("Load text first.");
      return;
    }
    setIndex(0);
    if (!audioRef.current) return;
    audioRef.current.currentTime = alignment[0]?.start || 0;
    audioRef.current.play();
  };

  const reset = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    setIndex(0);
    setIsPlaying(false);
    setCurrentTime(0);
    setRawText("");
    setStatus("Ready.");
    setShowReader(false);
  };

  const toggleTheme = () => {
    setTheme((prev) => (prev === "light" ? "dark" : "light"));
  };

  const toggleLoop = () => {
    setIsLooping((prev) => !prev);
  };

  const renderWord = (word) => {
    if (!word) return null;
    const { lead, core, tail } = splitWord(word);
    const pivotIndex = Math.max(1, Math.ceil(core.length * 0.35)) - 1;
    const leftText = core.slice(0, pivotIndex);
    const rightText = core.slice(pivotIndex + 1);
    return (
      <span className="grid w-full grid-cols-[1fr_auto_1fr] items-baseline font-display">
        <span className="text-right">
          {lead ? <span className="text-muted">{lead}</span> : null}
          {leftText}
        </span>
        <span className="text-accent drop-shadow-[0_0_12px_rgba(243,92,74,0.35)]">
          {core.charAt(pivotIndex) || ""}
        </span>
        <span className="text-left">
          {rightText}
          {tail ? <span className="text-muted">{tail}</span> : null}
        </span>
      </span>
    );
  };

  return (
    <main className="min-h-screen">
      <section
        className={`fixed inset-0 flex items-center justify-center px-6 py-10 transition-all duration-300 ${
          showReader ? "pointer-events-none scale-[0.98] opacity-0" : "opacity-100"
        }`}
      >
        <div className="mx-auto grid w-full max-w-5xl grid-cols-1 gap-10 md:grid-cols-[1.1fr_1fr] md:items-center">
          <div className="grid gap-5">
            <p className="text-xs uppercase tracking-[0.32em] text-muted">
              Speed Reader
            </p>
            <h1 className="font-display text-4xl leading-tight text-ink md:text-6xl">
              Focus on one word at a time.
            </h1>
            <p className="max-w-xl text-base text-muted">
              Upload audio and its word alignment JSON, or paste text. Clean,
              direct, and ready for reading.
            </p>
          </div>
          <div className="grid gap-6 rounded-2xl border border-line bg-panel p-8 shadow-halo">
            <div className="flex items-center justify-between font-display">
              <h2 className="text-xl">Upload</h2>
              <span className={`text-sm text-muted ${isLoading ? "animate-pulse" : ""}`}>
                {status}
              </span>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <label className="group relative grid cursor-pointer gap-2 rounded-xl border border-dashed border-line bg-soft px-6 py-6 text-center transition hover:border-accent hover:bg-[rgba(243,92,74,0.12)]">
                <input
                  type="file"
                  accept="audio/*"
                  onChange={handleAudioFile}
                  disabled={isLoading}
                  className="absolute inset-0 cursor-pointer opacity-0"
                />
                <div className="mx-auto grid h-14 w-14 place-items-center rounded-full border border-line text-2xl text-accent">
                  +
                </div>
                <p className="text-sm text-muted">
                  Upload audio<br />
                  .mp3 .wav
                </p>
              </label>
              <label className="group relative grid cursor-pointer gap-2 rounded-xl border border-dashed border-line bg-soft px-6 py-6 text-center transition hover:border-accent hover:bg-[rgba(243,92,74,0.12)]">
                <input
                  type="file"
                  accept="application/json,.json"
                  onChange={handleAlignmentFile}
                  disabled={isLoading}
                  className="absolute inset-0 cursor-pointer opacity-0"
                />
                <div className="mx-auto grid h-14 w-14 place-items-center rounded-full border border-line text-2xl text-accent">
                  +
                </div>
                <p className="text-sm text-muted">
                  Upload alignment<br />
                  .json
                </p>
              </label>
            </div>
            <textarea
              className="min-h-[120px] w-full resize-y rounded-xl border border-line bg-soft px-4 py-3 text-sm text-ink placeholder:text-muted"
              placeholder={DEFAULT_TEXT}
              value={rawText}
              onChange={(event) => setRawText(event.target.value)}
              rows={5}
            />
            <p className="text-xs text-muted">
              Audio sync uses the transcript JSON with word timestamps.
            </p>
            <div className="flex flex-wrap items-center justify-between gap-4">
              <button
                type="button"
                onClick={handlePaste}
                disabled={isLoading}
                className="rounded-full border border-accent px-6 py-2 text-sm font-semibold text-accent transition hover:border-ink hover:text-ink disabled:opacity-60"
              >
                Start reading
              </button>
              <div className="flex gap-4 text-sm text-muted">
                <span>{total} words</span>
                <span>
                  {Math.max(index, 0) + 1} / {Math.max(total, 1)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section
        className={`fixed inset-0 flex flex-col transition-opacity duration-300 ${
          showReader ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
        }`}
      >
        <div className="absolute left-6 top-6 grid gap-1 text-xs uppercase tracking-[0.12em] text-muted">
          <span>Word</span>
          <span className="text-base font-medium normal-case text-ink">
            {Math.min(index + 1, Math.max(total, 1))} / {Math.max(total, 1)}
          </span>
        </div>
        <div className="relative flex flex-1 items-center justify-center px-6 py-10">
          <div className="pointer-events-none absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-line opacity-50" />
          <div className="w-full max-w-4xl text-5xl leading-none text-ink sm:text-7xl md:text-8xl">
            {currentWord ? renderWord(currentWord) : (
              <p className="text-center text-base italic text-muted">Load text to start reading.</p>
            )}
          </div>
        </div>
        <div className="grid gap-6 border-t border-line bg-panel px-6 py-6 md:px-12">
          <div className="flex flex-wrap items-center gap-5">
            <button
              type="button"
              className="grid h-14 w-14 place-items-center rounded-full border border-ink text-ink transition hover:bg-ink hover:text-[color:var(--base)]"
              onClick={togglePlay}
              aria-label={isPlaying ? "Pause" : "Play"}
            >
              {isPlaying ? (
                <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" className="h-5 w-5 stroke-current">
                  <rect x="6" y="4" width="4" height="16" />
                  <rect x="14" y="4" width="4" height="16" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" className="h-5 w-5 stroke-current">
                  <polygon points="5 3 19 12 5 21 5 3" />
                </svg>
              )}
            </button>
            <div className="flex min-w-[260px] flex-1 items-center gap-4">
              <span className="text-xs uppercase tracking-[0.12em] text-muted">Audio</span>
              <div className="flex flex-1 items-center justify-between text-sm text-muted">
                <span>{formatTime(currentTime)}</span>
                <span className="text-accent">{formatTime(duration)}</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="group grid h-10 w-10 place-items-center rounded-full border border-line text-muted transition hover:border-ink hover:text-ink"
                onClick={restart}
                aria-label="Restart"
                title="Restart"
              >
                <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" className="h-4 w-4 stroke-current">
                  <path d="M3 12a9 9 0 1 0 3-6.7" />
                  <path d="M3 4v4h4" />
                </svg>
              </button>
              <button
                type="button"
                className="group grid h-10 w-10 place-items-center rounded-full border border-line text-muted transition hover:border-ink hover:text-ink"
                onClick={reset}
                aria-label="Reset"
                title="Reset"
              >
                <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" className="h-4 w-4 stroke-current">
                  <path d="M4 4h16" />
                  <path d="M10 4V2h4v2" />
                  <path d="M6 4l1 16a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-16" />
                </svg>
              </button>
              <button
                type="button"
                className="grid h-10 w-10 place-items-center rounded-full border border-line text-muted transition hover:border-ink hover:text-ink"
                onClick={toggleTheme}
                aria-label="Toggle theme"
                title="Toggle theme"
              >
                {theme === "light" ? (
                  <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" className="h-4 w-4 stroke-current">
                    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                  </svg>
                ) : (
                  <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" className="h-4 w-4 stroke-current">
                    <circle cx="12" cy="12" r="5" />
                    <line x1="12" y1="1" x2="12" y2="3" />
                    <line x1="12" y1="21" x2="12" y2="23" />
                    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                    <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                    <line x1="1" y1="12" x2="3" y2="12" />
                    <line x1="21" y1="12" x2="23" y2="12" />
                    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
                    <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
                  </svg>
                )}
              </button>
              <button
                type="button"
                className={`grid h-10 w-10 place-items-center rounded-full border transition hover:border-ink hover:text-ink ${
                  isLooping ? "border-accent text-accent" : "border-line text-muted"
                }`}
                onClick={toggleLoop}
                aria-label="Toggle loop"
                title="Loop"
              >
                <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" className="h-4 w-4 stroke-current">
                  <path d="M17 2l4 4-4 4" />
                  <path d="M3 11V9a4 4 0 0 1 4-4h14" />
                  <path d="M7 22l-4-4 4-4" />
                  <path d="M21 13v2a4 4 0 0 1-4 4H3" />
                </svg>
              </button>
            </div>
          </div>
          <input
            type="range"
            min="0"
            max={Math.max(total - 1, 0)}
            value={Math.min(index, Math.max(total - 1, 0))}
            onChange={(event) => {
              const nextIndex = Number(event.target.value);
              setIndex(nextIndex);
              if (audioRef.current && alignment.length) {
                const nextTime = alignment[nextIndex]?.start || 0;
                audioRef.current.currentTime = nextTime;
                setCurrentTime(nextTime);
              }
            }}
            disabled={!total}
            className="range-slider w-full"
          />
        </div>
      </section>

      <audio ref={audioRef} src={audioUrl} preload="metadata" loop={isLooping} />
    </main>
  );
}
