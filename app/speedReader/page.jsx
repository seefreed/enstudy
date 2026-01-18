"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Play, 
  Pause, 
  RotateCcw, 
  Sun, 
  Moon, 
  Settings, 
  Type, 
  BookOpen,
  XCircle,
  Upload
} from 'lucide-react';

const DEFAULT_TEXT = `Paste your text here to begin speed reading. This technique is called Rapid Serial Visual Presentation (RSVP). By displaying words one by one at a fixed focal point, you can read much faster because your eyes don't need to move across the page. Try adjusting the speed slider to find your comfortable pace!`;

const SpeedReaderApp = () => {
  // --- State ---
  const [inputText, setInputText] = useState(DEFAULT_TEXT);
  const [words, setWords] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [wpm, setWpm] = useState(200); // Words Per Minute
  const [isDarkMode, setIsDarkMode] = useState(true); // Default to dark mode for better reading focus
  const [showInput, setShowInput] = useState(true);

  // --- Refs ---
  const timerRef = useRef(null);
  const fileInputRef = useRef(null);

  // --- Helpers ---
  // Parse text into words, preserving some punctuation logic if needed later
  useEffect(() => {
    const cleanWords = inputText
      .trim()
      .split(/\s+/)
      .filter(w => w.length > 0);
    setWords(cleanWords);
    setCurrentIndex(0);
    setIsPlaying(false);
  }, [inputText]);

  // Calculate delay in ms based on WPM
  const delay = 60000 / wpm;

  // --- Timer Logic ---
  const stopReader = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    setIsPlaying(false);
  }, []);

  const tick = useCallback(() => {
    setCurrentIndex(prev => {
      if (prev >= words.length - 1) {
        stopReader();
        return prev; // Stay at end
      }
      return prev + 1;
    });
  }, [words.length, stopReader]);

  useEffect(() => {
    if (isPlaying) {
      timerRef.current = setInterval(tick, delay);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPlaying, delay, tick]);

  // --- Handlers ---
  const togglePlay = () => {
    if (currentIndex >= words.length - 1) {
      setCurrentIndex(0);
    }
    setIsPlaying(!isPlaying);
    // If we start playing, optionally hide input for better focus
    if (!isPlaying && showInput && window.innerWidth < 768) {
      setShowInput(false);
    }
  };

  const handleReset = () => {
    setIsPlaying(false);
    setCurrentIndex(0);
  };

  const handleSliderChange = (e) => {
    const val = parseInt(e.target.value);
    setCurrentIndex(val);
    if (isPlaying) {
      // Small UX improvement: pause while scrubbing? 
      // keeping it playing feels more responsive for "skipping ahead"
    }
  };

  const handleTextChange = (e) => {
    setInputText(e.target.value);
  };

  const clearText = () => {
    setInputText("");
    setWords([]);
    setCurrentIndex(0);
    setIsPlaying(false);
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      setInputText(event.target.result);
      // Reset state for new content
      setCurrentIndex(0);
      setIsPlaying(false);
    };
    reader.readAsText(file);
    // Reset input value so the same file can be selected again if needed
    e.target.value = null;
  };

  const triggerFileUpload = () => {
    fileInputRef.current?.click();
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.code === 'Space' && document.activeElement.tagName !== 'TEXTAREA') {
        e.preventDefault();
        togglePlay();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [togglePlay]); // dependency on togglePlay needed for closure freshness

  // --- Render Helpers ---
  const currentWord = words[currentIndex] || "";
  
  // Progress Percentage
  const progress = words.length > 0 ? (currentIndex / (words.length - 1)) * 100 : 0;

  return (
    <div className={`min-h-screen transition-colors duration-300 ${isDarkMode ? 'bg-slate-900 text-slate-100' : 'bg-slate-50 text-slate-900'}`}>
      
      {/* Navbar */}
      <header className={`px-6 py-4 flex justify-between items-center border-b ${isDarkMode ? 'border-slate-800' : 'border-slate-200'}`}>
        <div className="flex items-center gap-2">
          <BookOpen className="w-6 h-6 text-indigo-500" />
          <h1 className="text-xl font-bold tracking-tight">FocusReader</h1>
        </div>
        <button
          onClick={() => setIsDarkMode(!isDarkMode)}
          className={`p-2 rounded-full transition-colors ${isDarkMode ? 'hover:bg-slate-800 text-yellow-400' : 'hover:bg-slate-200 text-slate-600'}`}
          title="Toggle Theme"
        >
          {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
        </button>
      </header>

      <main className="container mx-auto max-w-4xl px-4 py-8 flex flex-col gap-8">
        
        {/* READER STAGE */}
        <div className="flex flex-col gap-6">
          <div className={`relative flex items-center justify-center h-64 md:h-80 rounded-2xl shadow-xl transition-all border-2 
            ${isDarkMode 
              ? 'bg-slate-950 border-slate-800 shadow-indigo-900/10' 
              : 'bg-white border-slate-200 shadow-indigo-100'
            }`}
          >
            {/* Visual Guide Lines */}
            <div className={`absolute top-4 left-0 right-0 h-px w-full opacity-10 ${isDarkMode ? 'bg-white' : 'bg-black'}`}></div>
            <div className={`absolute bottom-4 left-0 right-0 h-px w-full opacity-10 ${isDarkMode ? 'bg-white' : 'bg-black'}`}></div>
            
            {/* Center Focal Guides (Optional markers) */}
            <div className="absolute top-0 bottom-0 left-1/2 w-px -translate-x-1/2 opacity-5 bg-red-500 h-full"></div>
            <div className="absolute left-0 right-0 top-1/2 h-px -translate-y-1/2 opacity-5 bg-red-500 w-full"></div>

            {/* The Word */}
            <div className="z-10 text-center select-none w-full px-4">
              {words.length > 0 ? (
                <span className={`font-mono text-5xl md:text-7xl font-semibold tracking-wide ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                  {currentWord}
                </span>
              ) : (
                <span className="text-slate-400 text-xl md:text-2xl">Enter text below to start</span>
              )}
            </div>

            {/* Status Corner */}
            <div className="absolute bottom-4 right-6 text-xs font-mono opacity-50">
              {currentIndex + 1} / {words.length}
            </div>
          </div>

          {/* CONTROLS */}
          <div className={`p-6 rounded-xl border transition-colors flex flex-col gap-6
            ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}
          >
            {/* Top Row: Play/Pause & Progress */}
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
              <div className="flex items-center gap-3 w-full md:w-auto justify-center md:justify-start">
                <button
                  onClick={handleReset}
                  className={`p-3 rounded-full transition-all ${isDarkMode ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-slate-100 text-slate-500'}`}
                  title="Restart"
                >
                  <RotateCcw size={20} />
                </button>

                <button
                  onClick={togglePlay}
                  className={`p-4 rounded-full shadow-lg transition-transform active:scale-95 flex items-center justify-center
                    ${isPlaying 
                      ? 'bg-rose-500 hover:bg-rose-600 text-white' 
                      : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                    }`}
                >
                  {isPlaying ? <Pause fill="currentColor" size={24} /> : <Play fill="currentColor" size={24} className="ml-1" />}
                </button>
              </div>

              {/* Progress Bar */}
              <div className="flex-1 w-full flex items-center gap-3">
                <span className="text-xs font-mono text-slate-500 w-10 text-right">0%</span>
                <input
                  type="range"
                  min="0"
                  max={words.length > 0 ? words.length - 1 : 0}
                  value={currentIndex}
                  onChange={handleSliderChange}
                  className={`w-full h-2 rounded-lg appearance-none cursor-pointer
                    ${isDarkMode ? 'bg-slate-800 accent-indigo-500' : 'bg-slate-200 accent-indigo-600'}`}
                />
                <span className="text-xs font-mono text-slate-500 w-10">100%</span>
              </div>
            </div>

            {/* Bottom Row: Speed Settings */}
            <div className={`flex flex-col md:flex-row items-center justify-between pt-4 border-t gap-4 ${isDarkMode ? 'border-slate-800' : 'border-slate-100'}`}>
              <div className="flex items-center gap-4 w-full md:w-auto">
                <div className="flex items-center gap-2">
                  <Settings size={16} className="text-slate-500" />
                  <span className="text-sm font-medium text-slate-500">Speed</span>
                </div>
                <div className="flex items-center gap-2 flex-1">
                  <input
                    type="range"
                    min="100"
                    max="1000"
                    step="50"
                    value={wpm}
                    onChange={(e) => setWpm(Number(e.target.value))}
                    className={`flex-1 h-1.5 rounded-lg appearance-none cursor-pointer
                      ${isDarkMode ? 'bg-slate-800 accent-emerald-500' : 'bg-slate-200 accent-emerald-600'}`}
                  />
                  <span className={`text-sm font-bold font-mono w-20 text-right ${isDarkMode ? 'text-emerald-400' : 'text-emerald-700'}`}>
                    {wpm} WPM
                  </span>
                </div>
              </div>

              <button 
                onClick={() => setShowInput(!showInput)}
                className={`text-sm flex items-center gap-2 px-3 py-1.5 rounded-md transition-colors
                  ${isDarkMode ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-slate-100 text-slate-600'}`}
              >
                {showInput ? "Hide Text Input" : "Edit Text"}
                <Type size={16} />
              </button>
            </div>
          </div>
        </div>

        {/* INPUT AREA */}
        {showInput && (
          <div className="flex flex-col gap-2 transition-all duration-300 ease-in-out origin-top">
             <div className="flex justify-between items-center">
                <label className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Source Text</label>
                <div className="flex items-center gap-4">
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileUpload}
                    accept=".txt,.md"
                    className="hidden"
                  />
                  <button 
                    onClick={triggerFileUpload}
                    className={`text-xs flex items-center gap-1 font-medium transition-colors ${isDarkMode ? 'text-indigo-400 hover:text-indigo-300' : 'text-indigo-600 hover:text-indigo-700'}`}
                  >
                    <Upload size={14} /> Upload .txt/.md
                  </button>
                  <div className={`w-px h-3 ${isDarkMode ? 'bg-slate-700' : 'bg-slate-300'}`}></div>
                  <button 
                    onClick={clearText}
                    className="text-xs text-rose-500 hover:text-rose-600 flex items-center gap-1 font-medium"
                  >
                    <XCircle size={14} /> Clear
                  </button>
                </div>
             </div>
            <textarea
              value={inputText}
              onChange={handleTextChange}
              placeholder="Paste the text you want to read here..."
              className={`w-full h-48 p-4 rounded-xl border focus:outline-none focus:ring-2 transition-all resize-y font-sans text-base leading-relaxed
                ${isDarkMode 
                  ? 'bg-slate-900 border-slate-800 focus:ring-indigo-900 text-slate-300 placeholder-slate-700' 
                  : 'bg-white border-slate-200 focus:ring-indigo-100 text-slate-700 placeholder-slate-400'
                }`}
            />
             <p className="text-xs text-slate-500">
               {words.length} words detected. Estimated time: {Math.ceil(words.length / wpm)} min.
             </p>
          </div>
        )}

      </main>

      {/* Footer */}
      <footer className={`py-6 text-center text-sm ${isDarkMode ? 'text-slate-600' : 'text-slate-400'}`}>
        <p>Press <kbd className="font-mono bg-slate-200/20 px-1 rounded">Space</kbd> to Play/Pause</p>
      </footer>
    </div>
  );
};

export default SpeedReaderApp;
