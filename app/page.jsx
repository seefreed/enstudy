"use client";

import { useEffect, useMemo, useRef, useState } from "react";
const DEFAULT_TEXT = "Paste text, upload a file, or fetch a URL to begin.";

function extractWords(text) {
  const normalized = text
    .replace(/\s+/g, " ")
    .replace(/\u00a0/g, " ")
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
  const [wpm, setWpm] = useState(320);
  const [index, setIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [status, setStatus] = useState("Ready.");
  const [urlInput, setUrlInput] = useState("");
  const [groupSize, setGroupSize] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const timerRef = useRef(null);

  const words = useMemo(() => extractWords(rawText), [rawText]);
  const total = words.length;
  const currentChunk = words.slice(index, index + groupSize);

  useEffect(() => {
    if (!isPlaying || total === 0) {
      return;
    }

    const delay = Math.max(60, Math.round(60000 / wpm));
    timerRef.current = setInterval(() => {
      setIndex((prev) => {
        const next = prev + groupSize;
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
  }, [isPlaying, wpm, total, groupSize]);

  useEffect(() => {
    if (index >= total && total > 0) {
      setIndex(0);
      setIsPlaying(false);
    }
  }, [total, index]);

  const handleText = (text) => {
    setRawText(text);
    setIndex(0);
    setIsPlaying(false);
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
  };

  const renderWord = (word) => {
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
    <main className="page">
      <header className="hero">
        <div className="hero-text">
          <p className="eyebrow">Speed Reader Studio</p>
          <h1>
            Read faster without losing the rhythm. Upload, tune, and flow.
          </h1>
          <p className="lede">
            Drop in a text file, a PDF, or pull in a web article. Control the
            tempo, group words, and stay in the zone.
          </p>
        </div>
        <div className="hero-card">
          <div className="card-head">
            <h2>Source</h2>
            <span className={`status ${isLoading ? "pulse" : ""}`}>{status}</span>
          </div>
          <div className="input-grid">
            <label className="file-input">
              <input
                type="file"
                accept=".txt,.pdf,text/plain,application/pdf"
                onChange={handleFile}
                disabled={isLoading}
              />
              <span>Upload file</span>
            </label>
            <div className="url-input">
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
          </div>
          <textarea
            className="text-area"
            placeholder={DEFAULT_TEXT}
            value={rawText}
            onChange={(event) => setRawText(event.target.value)}
            rows={6}
          />
          <div className="card-actions">
            <button type="button" onClick={handlePaste} disabled={isLoading}>
              Use pasted text
            </button>
            <div className="meta">
              <span>{total} words</span>
              <span>{Math.max(index, 0) + 1} / {Math.max(total, 1)}</span>
            </div>
          </div>
        </div>
      </header>

      <section className="reader-panel">
        <div className="reader">
          <div className="reader-window">
            {currentChunk.length ? (
              <div className="word-stack">
                {currentChunk.map((word, idx) => (
                  <div className="word-line" key={`${word}-${idx}`}>
                    {renderWord(word)}
                  </div>
                ))}
              </div>
            ) : (
              <p className="placeholder">Load text to start reading.</p>
            )}
          </div>
          <div className="controls">
            <div className="control-group">
              <label>
                WPM
                <input
                  type="range"
                  min="120"
                  max="800"
                  step="10"
                  value={wpm}
                  onChange={(event) => setWpm(Number(event.target.value))}
                />
              </label>
              <span className="control-value">{wpm}</span>
            </div>
            <div className="control-group">
              <label>
                Group size
                <input
                  type="range"
                  min="1"
                  max="4"
                  step="1"
                  value={groupSize}
                  onChange={(event) => setGroupSize(Number(event.target.value))}
                />
              </label>
              <span className="control-value">{groupSize}</span>
            </div>
            <div className="control-buttons">
              <button type="button" onClick={togglePlay}>
                {isPlaying ? "Pause" : "Play"}
              </button>
              <button type="button" onClick={reset}>
                Reset
              </button>
            </div>
          </div>
          <div className="progress">
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
        <aside className="notes">
          <h3>Flow tips</h3>
          <ul>
            <li>Start slow, then climb 50 WPM at a time.</li>
            <li>Use group size 2-3 for familiar material.</li>
            <li>Reset to revisit tricky paragraphs.</li>
          </ul>
          <div className="mini">
            <p>Preview</p>
            <p className="preview-text">
              {rawText.trim()
                ? rawText.trim().slice(0, 240) + (rawText.length > 240 ? "..." : "")
                : DEFAULT_TEXT}
            </p>
          </div>
        </aside>
      </section>
    </main>
  );
}
