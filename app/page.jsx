"use client";

import { useEffect, useMemo, useRef, useState } from "react";

const DEFAULT_TEXT = "Paste text, upload a file, or fetch a URL to begin.";

function extractWords(text) {
  const normalized = text
    .replace(/\u00a0/g, " ")
    .replace(/[#()\-]/g, " ")
    .replace(/[^A-Za-z'\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return normalized ? normalized.split(" ") : [];
}

function splitWord(word) {
  const match = word.match(/^(\W*)([\w']+)(\W*)$/);
  if (!match) {
    return { lead: "", core: word, tail: "" };
  }
  return { lead: match[1], core: match[2], tail: match[3] };
}

export default function HomePage() {
  const [rawText, setRawText] = useState("");
  const [wpm, setWpm] = useState(200);
  const [index, setIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [status, setStatus] = useState("Ready.");
  const [urlInput, setUrlInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showReader, setShowReader] = useState(false);
  const [theme, setTheme] = useState("dark");
  const timerRef = useRef(null);

  const words = useMemo(() => extractWords(rawText), [rawText]);
  const total = words.length;
  const currentWord = words[index];

  useEffect(() => {
    if (!isPlaying || total === 0) {
      return;
    }

    const delay = Math.max(60, Math.round(60000 / wpm));
    timerRef.current = setInterval(() => {
      setIndex((prev) => {
        const next = prev + 1;
        if (next >= total) {
          setIsPlaying(false);
          return prev;
        }
        return next;
      });
    }, delay);

    return () => {
      clearInterval(timerRef.current);
    };
  }, [isPlaying, wpm, total]);

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

  const handleText = (text) => {
    setRawText(text);
    setIndex(0);
    setIsPlaying(false);
    setShowReader(true);
  };

  const handleFile = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    setStatus("Reading file...");

    try {
      if (file.type === "application/pdf" || file.name.endsWith(".pdf")) {
        const pdfjsLib = await import("pdfjs-dist/legacy/build/pdf");
        const workerUrl = (await import(
          "pdfjs-dist/legacy/build/pdf.worker.min.mjs?url"
        )).default;
        pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl;
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        let text = "";

        for (let i = 1; i <= pdf.numPages; i += 1) {
          const page = await pdf.getPage(i);
          const content = await page.getTextContent();
          const strings = content.items.map((item) => item.str);
          text += strings.join(" ") + " ";
        }

        handleText(text);
        setStatus(`Loaded PDF with ${pdf.numPages} pages.`);
      } else {
        const text = await file.text();
        handleText(text);
        setStatus("Loaded text file.");
      }
    } catch (error) {
      setStatus("Could not read that file. Try another format.");
    } finally {
      setIsLoading(false);
      event.target.value = "";
    }
  };

  const fetchUrl = async () => {
    if (!urlInput.trim()) {
      setStatus("Paste a URL first.");
      return;
    }

    setIsLoading(true);
    setStatus("Fetching URL...");

    try {
      const response = await fetch("/api/fetch-text", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: urlInput.trim() })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Fetch failed");
      }

      const data = await response.json();
      handleText(data.text);
      setStatus("URL loaded.");
    } catch (error) {
      setStatus("URL fetch failed. Try a different page.");
    } finally {
      setIsLoading(false);
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
    setIsPlaying((prev) => !prev);
  };

  const reset = () => {
    setIndex(0);
    setIsPlaying(false);
    setShowReader(false);
  };

  const toggleTheme = () => {
    setTheme((prev) => (prev === "light" ? "dark" : "light"));
  };

  const renderWord = (word) => {
    if (!word) return null;
    const { lead, core, tail } = splitWord(word);
    const pivotIndex = Math.max(1, Math.ceil(core.length * 0.35)) - 1;
    return (
      <span className="word">
        <span className="word-lead">{lead}</span>
        <span className="word-core">{core.slice(0, pivotIndex)}</span>
        <span className="word-pivot">{core.charAt(pivotIndex) || ""}</span>
        <span className="word-core">{core.slice(pivotIndex + 1)}</span>
        <span className="word-tail">{tail}</span>
      </span>
    );
  };

  return (
    <main className="app">
      <section className={`upload-screen ${showReader ? "hidden" : ""}`}>
        <div className="upload-inner">
          <div className="brand">
            <p className="brand-label">Speed Reader</p>
            <h1>Focus on one word at a time.</h1>
            <p className="brand-subtitle">
              Upload a file, paste text, or fetch a URL. Clean, direct, and ready
              for reading.
            </p>
          </div>
          <div className="upload-panel">
            <div className="upload-header">
              <h2>Upload</h2>
              <span className={`status ${isLoading ? "pulse" : ""}`}>{status}</span>
            </div>
            <label className="upload-zone">
              <input
                type="file"
                accept=".txt,.pdf,.md,text/plain,application/pdf,text/markdown"
                onChange={handleFile}
                disabled={isLoading}
              />
              <div className="upload-icon">
                <span>+</span>
              </div>
              <p>
                Click to upload or drop a file<br />
                .txt .md .pdf
              </p>
            </label>
            <div className="upload-row">
              <input
                type="url"
                placeholder="https://example.com/article"
                value={urlInput}
                onChange={(event) => setUrlInput(event.target.value)}
                disabled={isLoading}
              />
              <button type="button" onClick={fetchUrl} disabled={isLoading}>
                Fetch URL
              </button>
            </div>
            <textarea
              className="text-area"
              placeholder={DEFAULT_TEXT}
              value={rawText}
              onChange={(event) => setRawText(event.target.value)}
              rows={5}
            />
            <div className="upload-actions">
              <button type="button" onClick={handlePaste} disabled={isLoading}>
                Start reading
              </button>
              <div className="meta">
                <span>{total} words</span>
                <span>
                  {Math.max(index, 0) + 1} / {Math.max(total, 1)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className={`reader-screen ${showReader ? "active" : ""}`}>
        <div className="word-container">
          <div className="word-display">
            {currentWord ? renderWord(currentWord) : (
              <p className="placeholder">Load text to start reading.</p>
            )}
          </div>
        </div>
        <div className="controls">
          <div className="progress-bar">
            <div
              className="progress-fill"
              style={{
                width: total ? `${(index / total) * 100}%` : "0%"
              }}
            />
          </div>
          <div className="controls-row">
            <button
              type="button"
              className="play-button"
              onClick={togglePlay}
              aria-label={isPlaying ? "Pause" : "Play"}
            >
              {isPlaying ? (
                <svg viewBox="0 0 24 24" fill="none" strokeWidth="2">
                  <rect x="6" y="4" width="4" height="16" />
                  <rect x="14" y="4" width="4" height="16" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" fill="none" strokeWidth="2">
                  <polygon points="5 3 19 12 5 21 5 3" />
                </svg>
              )}
            </button>
            <div className="speed-control">
              <span className="speed-label">Speed</span>
              <input
                type="range"
                className="speed-slider"
                min="120"
                max="800"
                step="10"
                value={wpm}
                onChange={(event) => setWpm(Number(event.target.value))}
              />
              <span className="speed-value">{wpm} WPM</span>
            </div>
            <div className="stats">
              <div className="stat-item">
                <span className="stat-label">Word</span>
                <span className="stat-value">
                  {Math.min(index + 1, Math.max(total, 1))} / {Math.max(total, 1)}
                </span>
              </div>
            </div>
            <button type="button" className="reset-button" onClick={reset}>
              New file
            </button>
            <button
              type="button"
              className="theme-toggle"
              onClick={toggleTheme}
              aria-label="Toggle theme"
            >
              {theme === "light" ? (
                <svg viewBox="0 0 24 24" fill="none" strokeWidth="2">
                  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" fill="none" strokeWidth="2">
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
          </div>
          <div className="scrub">
            <input
              type="range"
              min="0"
              max={Math.max(total - 1, 0)}
              value={Math.min(index, Math.max(total - 1, 0))}
              onChange={(event) => setIndex(Number(event.target.value))}
              disabled={!total}
            />
          </div>
        </div>
      </section>
    </main>
  );
}
