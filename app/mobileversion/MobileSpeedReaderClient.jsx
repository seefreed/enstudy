"use client";

import React, { useCallback, useEffect, useRef, useState, useTransition } from "react";
import {
  Crosshair,
  Moon,
  Pause,
  Play,
  RotateCcw,
  Sun,
  Type,
  Upload,
  Link
} from "lucide-react";
import { getDisplayMode, updateDisplayMode } from "../speedReader/actions";

const MobileSpeedReaderClient = ({ defaultText, textFiles = [] }) => {
  const [inputText, setInputText] = useState(defaultText);
  const [words, setWords] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [wpm, setWpm] = useState(240);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [showAnchors, setShowAnchors] = useState(true);
  const [showInput, setShowInput] = useState(false);
  const [sourceUrl, setSourceUrl] = useState("");
  const [isFetchingUrl, setIsFetchingUrl] = useState(false);
  const [urlError, setUrlError] = useState("");
  const [selectedTextFile, setSelectedTextFile] = useState("");
  const [isLoadingTextFile, setIsLoadingTextFile] = useState(false);
  const [textFileError, setTextFileError] = useState("");
  const [, startTransition] = useTransition();

  const timerRef = useRef(null);
  const fileInputRef = useRef(null);
  const isDarkModeRef = useRef(isDarkMode);
  const didRequestThemeRef = useRef(false);
  const didToggleThemeRef = useRef(false);

  const persistTheme = (displayMode) => {
    startTransition(async () => {
      try {
        await updateDisplayMode(displayMode);
      } catch (error) {
        // No-op: keep UI responsive if persistence fails.
      }
    });
  };

  useEffect(() => {
    const cleanWords = inputText
      .trim()
      .split(/\s+/)
      .filter((word) => word.length > 0);
    setWords(cleanWords);
    setCurrentIndex(0);
    setIsPlaying(false);
  }, [inputText]);

  const delay = 60000 / wpm;

  const stopReader = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    setIsPlaying(false);
  }, []);

  const tick = useCallback(() => {
    setCurrentIndex((prev) => {
      if (prev >= words.length - 1) {
        stopReader();
        return prev;
      }
      return prev + 1;
    });
  }, [stopReader, words.length]);

  useEffect(() => {
    if (isPlaying) {
      timerRef.current = setInterval(tick, delay);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [delay, isPlaying, tick]);

  const togglePlay = useCallback(() => {
    if (currentIndex >= words.length - 1) {
      setCurrentIndex(0);
    }
    setIsPlaying((prev) => !prev);
    if (!isPlaying && showInput) setShowInput(false);
  }, [currentIndex, isPlaying, showInput, words.length]);

  const darkModeFunc = () => {
    const nextIsDark = !isDarkModeRef.current;
    isDarkModeRef.current = nextIsDark;
    didToggleThemeRef.current = true;
    setIsDarkMode(nextIsDark);
    persistTheme(nextIsDark ? "dark" : "light");
  };

  useEffect(() => {
    if (didRequestThemeRef.current) return;
    didRequestThemeRef.current = true;

    startTransition(async () => {
      try {
        const displayMode = await getDisplayMode();
        if (didToggleThemeRef.current) return;
        if (displayMode === "dark" || displayMode === "light") {
          const nextIsDark = displayMode === "dark";
          isDarkModeRef.current = nextIsDark;
          setIsDarkMode(nextIsDark);
        }
      } catch (error) {
        // No-op: keep default theme if fetch fails.
      }
    });
  }, [startTransition]);

  useEffect(() => {
    isDarkModeRef.current = isDarkMode;
  }, [isDarkMode]);

  useEffect(() => {
    document.documentElement.dataset.theme = isDarkMode ? "dark" : "light";
  }, [isDarkMode]);

  const handleReset = () => {
    setIsPlaying(false);
    setCurrentIndex(0);
  };

  const handleSliderChange = useCallback((event) => {
    setCurrentIndex(Number(event.target.value));
  }, []);

  const handleTextChange = (event) => {
    setInputText(event.target.value);
  };

  const handleSelectTextFile = async (event) => {
    const nextFile = event.target.value;
    setSelectedTextFile(nextFile);
    setTextFileError("");

    if (!nextFile) return;

    setIsLoadingTextFile(true);
    try {
      const response = await fetch(`/${encodeURI(nextFile)}`, { cache: "no-store" });
      if (!response.ok) {
        setTextFileError("Could not load that file. Pick another file.");
        return;
      }
      const text = await response.text();
      setInputText(text);
      setCurrentIndex(0);
      setIsPlaying(false);
    } catch (error) {
      setTextFileError("Failed to load the selected file. Try again.");
    } finally {
      setIsLoadingTextFile(false);
    }
  };

  const clearText = () => {
    setInputText("");
    setWords([]);
    setCurrentIndex(0);
    setIsPlaying(false);
  };

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (loadEvent) => {
      setInputText(loadEvent.target.result || "");
      setCurrentIndex(0);
      setIsPlaying(false);
    };
    reader.readAsText(file);
    event.target.value = null;
  };

  const triggerFileUpload = () => {
    fileInputRef.current?.click();
  };

  const handleFetchUrl = async () => {
    const trimmed = sourceUrl.trim();
    if (!trimmed) {
      setUrlError("Please enter a URL.");
      return;
    }

    setIsFetchingUrl(true);
    setUrlError("");

    try {
      const response = await fetch("/api/fetch-text", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: trimmed })
      });

      const data = await response.json();

      if (!response.ok) {
        setUrlError(data?.error || "Failed to fetch URL. Check the link & try again.");
        return;
      }

      setInputText(data.text || "");
      setCurrentIndex(0);
      setIsPlaying(false);
    } catch (error) {
      setUrlError("Could not reach the URL fetch service. Try again later.");
    } finally {
      setIsFetchingUrl(false);
    }
  };

  const currentWord = words[currentIndex] || "";
  const progress = words.length > 1 ? Math.round((currentIndex / (words.length - 1)) * 100) : 0;
  const estimatedMinutes = words.length > 0 ? Math.ceil(words.length / wpm) : 0;

  const splitWord = (word) => {
    const match = word.match(/^(\W*)([\w']+)(\W*)$/);
    if (!match) return { lead: "", core: word, tail: "" };
    return { lead: match[1], core: match[2], tail: match[3] };
  };

  const renderWord = (word) => {
    if (!word) return null;
    const { lead, core, tail } = splitWord(word);
    const pivotIndex = Math.max(1, Math.ceil(core.length * 0.35)) - 1;
    const leftText = core.slice(0, pivotIndex);
    const rightText = core.slice(pivotIndex + 1);

    return (
      <span className="grid w-full grid-cols-[1fr_auto_1fr] items-baseline break-words font-mono">
        <span className="text-right">
          {lead ? <span className="text-slate-400/70">{lead}</span> : null}
          {leftText}
        </span>
        <span className={showAnchors ? "text-rose-400 drop-shadow-[0_0_12px_rgba(248,113,113,0.45)]" : "text-slate-900"}>
          {core.charAt(pivotIndex) || ""}
        </span>
        <span className="text-left">
          {rightText}
          {tail ? <span className="text-slate-400/70">{tail}</span> : null}
        </span>
      </span>
    );
  };

  return (
    <div
      data-theme={isDarkMode ? "dark" : "light"}
      className="relative min-h-[100dvh] overflow-hidden px-5 text-slate-100 touch-manipulation md:hidden"
      style={{
        background: isDarkMode
          ? "radial-gradient(120% 120% at 10% 0%, #2b3a56 0%, #141823 52%, #0d1118 100%)"
          : "radial-gradient(140% 140% at 20% 0%, #fff1d6 0%, #f6ebda 50%, #efe4cf 100%)",
        paddingTop: "max(1.5rem, env(safe-area-inset-top))",
        paddingBottom: "max(7rem, env(safe-area-inset-bottom))",
        WebkitTapHighlightColor: "transparent"
      }}
    >
      <div className="pointer-events-none absolute -top-20 right-0 h-64 w-64 rounded-full bg-rose-400/20 blur-3xl" />
      <div className="pointer-events-none absolute bottom-12 left-0 h-60 w-60 rounded-full bg-emerald-300/20 blur-3xl" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(255,255,255,0.12),_transparent_60%)] opacity-60" />

      <a
        href="#reader"
        className="sr-only focus-visible:not-sr-only focus-visible:absolute focus-visible:left-5 focus-visible:top-4 focus-visible:z-50 focus-visible:rounded-full focus-visible:bg-rose-500 focus-visible:px-4 focus-visible:py-2 focus-visible:text-xs focus-visible:text-white focus-visible:outline-none"
      >
        Skip to Reader
      </a>

      <header className="relative z-10 flex items-center justify-between">
        <div>
          <p className={`text-[10px] uppercase tracking-[0.4em] ${isDarkMode ? "text-slate-400" : "text-slate-600"}`}>
            Mobile Focus
          </p>
          <h1
            className="text-2xl font-semibold"
            style={{ fontFamily: "var(--font-display)", textWrap: "balance" }}
          >
            Pulse Reader
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowAnchors((prev) => !prev)}
            aria-label={showAnchors ? "Hide Anchor Guides" : "Show Anchor Guides"}
            className={`rounded-full border px-3 py-2 text-xs font-semibold transition-colors focus-visible:ring-2 focus-visible:ring-rose-300/70 focus-visible:outline-none ${
              isDarkMode ? "border-slate-700/70 text-slate-200 hover:border-rose-300/70" : "border-slate-200 text-slate-600 hover:border-rose-400/70"
            }`}
          >
            <Crosshair size={16} aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={darkModeFunc}
            aria-label={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
            className={`rounded-full border px-3 py-2 text-xs font-semibold transition-colors focus-visible:ring-2 focus-visible:ring-rose-300/70 focus-visible:outline-none ${
              isDarkMode ? "border-slate-700/70 text-amber-200 hover:border-amber-300/70" : "border-slate-200 text-slate-600 hover:border-amber-400/70"
            }`}
          >
            {isDarkMode ? <Sun size={16} aria-hidden="true" /> : <Moon size={16} aria-hidden="true" />}
          </button>
        </div>
      </header>

      <main id="reader" className="relative z-10 mt-6 grid gap-5">
        <section
          className={`rounded-[28px] border p-4 shadow-[0_20px_60px_rgba(8,12,18,0.35)] backdrop-blur ${
            isDarkMode ? "border-white/10 bg-white/5" : "border-slate-200 bg-white/80"
          }`}
        >
          <div className={`flex items-center justify-between text-xs uppercase tracking-[0.3em] ${isDarkMode ? "text-slate-400" : "text-slate-600"}`}>
            <span>Progress</span>
            <span className="font-mono tabular-nums">
              {currentIndex + 1}/{words.length || 0}
            </span>
          </div>

          <div
            className={`relative mt-4 flex min-h-[190px] items-center justify-center rounded-[24px] border px-4 ${
              isDarkMode
                ? "border-white/10 bg-gradient-to-br from-white/8 via-transparent to-rose-200/10"
                : "border-slate-200 bg-gradient-to-br from-white via-transparent to-rose-50"
            }`}
          >
            {showAnchors ? (
              <>
                <div className={`absolute left-4 right-4 top-6 h-px opacity-20 ${isDarkMode ? "bg-white" : "bg-black"}`} />
                <div className={`absolute bottom-6 left-4 right-4 h-px opacity-20 ${isDarkMode ? "bg-white" : "bg-black"}`} />
                <div className="absolute left-1/2 top-6 bottom-6 w-px -translate-x-1/2 bg-rose-400/40" />
              </>
            ) : null}

            <div className="text-center">
              {words.length > 0 ? (
                <div className="text-4xl font-semibold tracking-wide" style={{ fontFamily: "var(--font-display)" }}>
                  {renderWord(currentWord)}
                </div>
              ) : (
                <p className={`${isDarkMode ? "text-slate-400" : "text-slate-600"}`}>
                  Paste or load text to begin.
                </p>
              )}
            </div>
          </div>

          <div className="mt-5">
            <div className={`flex items-center justify-between text-[11px] uppercase tracking-[0.3em] ${isDarkMode ? "text-slate-400" : "text-slate-600"}`}>
              <span>{progress}%</span>
              <span>{estimatedMinutes ? `${estimatedMinutes} min` : "0 min"}</span>
            </div>
            <input
              type="range"
              min="0"
              max={words.length > 0 ? words.length - 1 : 0}
              value={currentIndex}
              onChange={handleSliderChange}
              name="progressRange"
              aria-label="Reading Progress"
              className="range-slider mt-3 w-full"
            />
          </div>
        </section>

        <section
          className={`rounded-[24px] border p-4 backdrop-blur ${
            isDarkMode ? "border-white/10 bg-white/5" : "border-slate-200 bg-white/80"
          }`}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className={`text-xs uppercase tracking-[0.3em] ${isDarkMode ? "text-slate-400" : "text-slate-600"}`}>Speed</p>
              <p className={`text-2xl font-semibold tabular-nums ${isDarkMode ? "text-emerald-300" : "text-emerald-700"}`}>
                {wpm} WPM
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setWpm((prev) => Math.max(100, prev - 25))}
                aria-label="Decrease speed"
                className={`rounded-full border px-3 py-2 text-sm font-semibold transition-colors focus-visible:ring-2 focus-visible:ring-emerald-300/70 focus-visible:outline-none ${
                  isDarkMode ? "border-emerald-300/40 text-emerald-200 hover:border-emerald-300" : "border-emerald-400/60 text-emerald-700 hover:border-emerald-500"
                }`}
              >
                -
              </button>
              <button
                type="button"
                onClick={() => setWpm((prev) => Math.min(1000, prev + 25))}
                aria-label="Increase speed"
                className={`rounded-full border px-3 py-2 text-sm font-semibold transition-colors focus-visible:ring-2 focus-visible:ring-emerald-300/70 focus-visible:outline-none ${
                  isDarkMode ? "border-emerald-300/40 text-emerald-200 hover:border-emerald-300" : "border-emerald-400/60 text-emerald-700 hover:border-emerald-500"
                }`}
              >
                +
              </button>
            </div>
          </div>
          <input
            type="range"
            min="100"
            max="1000"
            step="25"
            value={wpm}
            onChange={(event) => setWpm(Number(event.target.value))}
            name="speedRange"
            aria-label="Reading Speed"
            className="range-slider mt-4 w-full"
          />
        </section>

        <section
          className={`rounded-[24px] border p-4 backdrop-blur ${
            isDarkMode ? "border-white/10 bg-white/5" : "border-slate-200 bg-white/80"
          }`}
        >
          <p className={`text-xs uppercase tracking-[0.3em] ${isDarkMode ? "text-slate-400" : "text-slate-600"}`}>Source</p>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setShowInput(true)}
              className={`rounded-2xl px-4 py-3 text-sm font-semibold transition-colors focus-visible:ring-2 focus-visible:ring-rose-300/70 focus-visible:outline-none ${
                isDarkMode ? "bg-rose-500/20 text-rose-200 hover:bg-rose-500/30" : "bg-rose-100 text-rose-700 hover:bg-rose-200"
              }`}
            >
              Open Text
            </button>
            <button
              type="button"
              onClick={triggerFileUpload}
              className={`rounded-2xl px-4 py-3 text-sm font-semibold transition-colors focus-visible:ring-2 focus-visible:ring-rose-300/70 focus-visible:outline-none ${
                isDarkMode ? "bg-white/10 text-slate-100 hover:bg-white/20" : "bg-white text-slate-700 hover:bg-slate-100"
              }`}
            >
              Upload File
            </button>
          </div>
          <div className={`mt-3 flex items-center justify-between text-xs ${isDarkMode ? "text-slate-400" : "text-slate-600"}`}>
            <span>{words.length} words</span>
            <button
              type="button"
              onClick={clearText}
              className="text-rose-300 underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-300/70 focus-visible:rounded-full"
            >
              Clear
            </button>
          </div>
        </section>
      </main>

      <footer className="fixed bottom-0 left-0 right-0 z-20 px-5 pb-6">
        <div
          className={`flex items-center justify-between rounded-[28px] border p-4 shadow-[0_12px_40px_rgba(8,12,18,0.35)] backdrop-blur ${
            isDarkMode ? "border-white/10 bg-black/40" : "border-slate-200 bg-white/85"
          }`}
        >
          <button
            type="button"
            onClick={handleReset}
            aria-label="Restart Reading"
            className={`rounded-full border px-3 py-2 text-sm font-semibold transition-colors focus-visible:ring-2 focus-visible:ring-rose-300/70 focus-visible:outline-none ${
              isDarkMode ? "border-slate-600 text-slate-200 hover:border-rose-300/70" : "border-slate-200 text-slate-600 hover:border-rose-400/70"
            }`}
          >
            <RotateCcw size={18} aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={togglePlay}
            aria-label={isPlaying ? "Pause Reading" : "Start Reading"}
            className={`flex h-14 w-14 items-center justify-center rounded-full text-white shadow-lg transition-transform hover:scale-[1.03] focus-visible:ring-2 focus-visible:ring-rose-300/70 focus-visible:outline-none active:scale-95 ${
              isPlaying ? "bg-rose-500" : "bg-indigo-600"
            }`}
          >
            {isPlaying ? <Pause fill="currentColor" size={24} aria-hidden="true" /> : <Play fill="currentColor" size={24} className="ml-0.5" aria-hidden="true" />}
          </button>
          <button
            type="button"
            onClick={() => setShowInput(true)}
            aria-label="Open Source Text"
            className={`rounded-full border px-3 py-2 text-sm font-semibold transition-colors focus-visible:ring-2 focus-visible:ring-rose-300/70 focus-visible:outline-none ${
              isDarkMode ? "border-slate-600 text-slate-200 hover:border-rose-300/70" : "border-slate-200 text-slate-600 hover:border-rose-400/70"
            }`}
          >
            <Type size={18} aria-hidden="true" />
          </button>
        </div>
      </footer>

      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileUpload}
        accept=".txt,.md"
        name="textUpload"
        aria-label="Upload Text File"
        autoComplete="off"
        className="hidden"
      />

      {showInput ? (
        <div className="fixed inset-0 z-50">
          <button
            type="button"
            aria-label="Close Source Text"
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setShowInput(false)}
          />
          <div
            className={`absolute bottom-0 left-0 right-0 rounded-t-[28px] border px-5 pb-8 pt-6 shadow-[0_-20px_60px_rgba(8,12,18,0.5)] overscroll-contain ${
              isDarkMode ? "border-white/10 bg-slate-950/95" : "border-slate-200 bg-white"
            }`}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-[10px] uppercase tracking-[0.3em] ${isDarkMode ? "text-slate-400" : "text-slate-600"}`}>
                  Source Text
                </p>
                <h2 className="text-lg font-semibold" style={{ textWrap: "balance" }}>
                  Edit & Load
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setShowInput(false)}
                aria-label="Close Source Text"
                className={`rounded-full border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-rose-300/70 focus-visible:outline-none ${
                  isDarkMode ? "border-slate-700 text-slate-200 hover:border-rose-300/70" : "border-slate-200 text-slate-600 hover:border-rose-400/70"
                }`}
              >
                <Type size={18} aria-hidden="true" />
              </button>
            </div>

            <label htmlFor="sourceTextMobile" className="sr-only">
              Source Text
            </label>
            <textarea
              value={inputText}
              onChange={handleTextChange}
              placeholder="Paste the text you want to read here…"
              id="sourceTextMobile"
              name="sourceTextMobile"
              aria-label="Source Text"
              autoComplete="off"
              className={`mt-4 h-40 w-full rounded-2xl border p-4 text-base leading-relaxed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-300/70 ${
                isDarkMode ? "border-white/10 bg-slate-900/80 text-slate-200" : "border-slate-200 bg-white text-slate-800"
              }`}
            />
            <p className={`mt-2 text-xs ${isDarkMode ? "text-slate-400" : "text-slate-600"}`}>
              {words.length} words detected. Estimated time: {estimatedMinutes} min.
            </p>

            <div className="mt-5 grid gap-3">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={triggerFileUpload}
                  className={`flex-1 rounded-2xl border px-4 py-3 text-sm font-semibold focus-visible:ring-2 focus-visible:ring-rose-300/70 focus-visible:outline-none ${
                    isDarkMode
                      ? "border-white/10 bg-white/5 text-slate-200 hover:bg-white/10"
                      : "border-slate-200 bg-slate-100 text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  <Upload size={16} aria-hidden="true" /> Upload .txt/.md
                </button>
                <button
                  type="button"
                  onClick={clearText}
                  className={`rounded-2xl border px-4 py-3 text-sm font-semibold focus-visible:ring-2 focus-visible:ring-rose-300/70 focus-visible:outline-none ${
                    isDarkMode ? "border-rose-500/40 text-rose-300 hover:border-rose-300/80" : "border-rose-400 text-rose-600 hover:border-rose-500"
                  }`}
                >
                  Clear
                </button>
              </div>

              <select
                id="textFileSelectMobile"
                name="textFileSelectMobile"
                value={selectedTextFile}
                onChange={handleSelectTextFile}
                disabled={textFiles.length === 0 || isLoadingTextFile}
                className={`h-12 w-full rounded-2xl border px-4 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-300/70 ${
                  textFiles.length === 0 || isLoadingTextFile ? "opacity-60 cursor-not-allowed" : ""
                } ${isDarkMode ? "border-white/10 bg-slate-900/80 text-slate-200" : "border-slate-200 bg-white text-slate-700"}`}
              >
                <option value="">
                  {textFiles.length === 0 ? "No text files available" : "Select a text file…"}
                </option>
                {textFiles.map((file) => (
                  <option key={file} value={file}>
                    {file}
                  </option>
                ))}
              </select>
              {textFileError ? (
                <p className={`text-xs ${isDarkMode ? "text-rose-300" : "text-rose-600"}`} aria-live="polite">
                  {textFileError}
                </p>
              ) : null}

              <div className="grid gap-3">
                <label htmlFor="sourceUrlMobile" className="sr-only">
                  Article URL
                </label>
                <div
                  className={`flex items-center gap-3 rounded-2xl border px-3 ${
                    isDarkMode ? "border-white/10 bg-slate-900/80" : "border-slate-200 bg-white"
                  }`}
                >
                  <Link size={16} aria-hidden="true" className={isDarkMode ? "text-slate-400" : "text-slate-500"} />
                  <input
                    type="url"
                    value={sourceUrl}
                    onChange={(event) => setSourceUrl(event.target.value)}
                    placeholder="https://example.com/article…"
                    id="sourceUrlMobile"
                    name="sourceUrlMobile"
                    inputMode="url"
                    autoComplete="url"
                    spellCheck={false}
                    aria-label="Article URL"
                    className={`h-12 w-full bg-transparent text-base focus-visible:outline-none ${
                      isDarkMode ? "text-slate-200" : "text-slate-700"
                    }`}
                  />
                </div>
                <button
                  type="button"
                  onClick={handleFetchUrl}
                  disabled={isFetchingUrl}
                  className={`h-12 w-full rounded-2xl text-sm font-semibold text-white transition-colors focus-visible:ring-2 focus-visible:ring-rose-300/70 focus-visible:outline-none ${
                    isFetchingUrl ? "bg-slate-700/80 cursor-not-allowed" : "bg-rose-500 hover:bg-rose-400"
                  }`}
                >
                  {isFetchingUrl ? "Fetching…" : "Fetch Article"}
                </button>
              </div>
              {urlError ? (
                <p className={`text-xs ${isDarkMode ? "text-rose-300" : "text-rose-600"}`} aria-live="polite">
                  {urlError}
                </p>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}

      <div className="hidden md:flex min-h-screen items-center justify-center bg-slate-900 text-slate-100">
        <div className="max-w-md rounded-3xl border border-slate-800 bg-slate-950/80 p-8 text-center">
          <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Mobile Only</p>
          <h2 className="mt-3 text-2xl font-semibold" style={{ textWrap: "balance" }}>
            Open this page on a phone
          </h2>
          <p className="mt-2 text-sm text-slate-400">
            This version is tuned for touch-first reading. Try it on a mobile device for the full experience.
          </p>
        </div>
      </div>
    </div>
  );
};

export default MobileSpeedReaderClient;
