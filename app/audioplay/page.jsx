"use client"
import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, Upload, Youtube, FileAudio, Settings, Rewind, FastForward, Eye, AlignJustify, X } from 'lucide-react';

// --- Demo Data ---
const DEMO_YOUTUBE_ID = "jNQXAC9IVRw"; // "Me at the zoo" - First YT video ever (Short & Iconic)
const DEMO_TRANSCRIPT = "Alright so here we are in front of the elephants the cool thing about these guys is that they have really really really long trunks and that's that's cool and that's pretty much all there is to say";

// --- Helper Components ---

const Button = ({ onClick, children, variant = 'primary', className = '', icon: Icon }) => {
    const baseStyle = "flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-medium transition-all duration-200 active:scale-95";
    const variants = {
        primary: "bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-900/20",
        secondary: "bg-slate-700 hover:bg-slate-600 text-slate-200",
        outline: "border border-slate-600 hover:bg-slate-800 text-slate-300",
        ghost: "hover:bg-slate-800/50 text-slate-400 hover:text-white"
    };

    return (
        <button onClick={onClick} className={`${baseStyle} ${variants[variant]} ${className}`}>
            {Icon && <Icon size={18} />}
            {children}
        </button>
    );
};

const Card = ({ children, className = '' }) => (
    <div className={`bg-slate-900/50 backdrop-blur-md border border-slate-800 rounded-2xl p-6 ${className}`}>
        {children}
    </div>
);

// --- YouTube Embed Helper ---
// This component handles the specific quirkiness of the YouTube Iframe API
const YoutubeEmbed = ({ videoId, playerRef, onReady, onStateChange }) => {
    useEffect(() => {
        const initPlayer = () => {
            if (window.YT && window.YT.Player) {
                // Check if the element exists before creating player
                if (!document.getElementById('yt-player-mount')) return;

                // Clear previous instance if it exists securely
                try {
                     if (playerRef.current && playerRef.current.destroy) {
                        playerRef.current.destroy();
                    }
                } catch (e) {
                    console.log("Cleanup warning", e);
                }
               
                playerRef.current = new window.YT.Player('yt-player-mount', {
                    height: '100%',
                    width: '100%',
                    videoId: videoId,
                    playerVars: {
                        'playsinline': 1,
                        'controls': 0, // Hide default controls
                        'modestbranding': 1,
                        'rel': 0
                    },
                    events: {
                        'onReady': (event) => {
                            const dur = event.target.getDuration();
                            onReady(dur);
                        },
                        'onStateChange': (event) => {
                            onStateChange(event.data);
                        }
                    }
                });
            } else {
                setTimeout(initPlayer, 500); // Retry if API not ready
            }
        };

        initPlayer();

        // Cleanup
        return () => {
            if (playerRef.current && playerRef.current.destroy) {
                // wrapping in try catch as YT API can be flaky on unmount
                try {
                    playerRef.current.destroy();
                } catch(e) {}
            }
        };
    }, [videoId]);

    return <div id="yt-player-mount" className="pointer-events-none w-full h-full"></div>;
};

// --- Main App Component ---

export default function App() {
    // Modes: 'setup' | 'player'
    const [mode, setMode] = useState('setup');
    
    // Media State
    const [mediaType, setMediaType] = useState(null); // 'youtube' | 'file'
    const [mediaSource, setMediaSource] = useState(null); // URL or File Object
    const [transcriptRaw, setTranscriptRaw] = useState('');
    const [words, setWords] = useState([]);
    const [timedWords, setTimedWords] = useState([]);
    const [whisperLoading, setWhisperLoading] = useState(false);
    const [whisperError, setWhisperError] = useState('');
    
    // Player State
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [playbackRate, setPlaybackRate] = useState(1);
    const [currentWordIndex, setCurrentWordIndex] = useState(-1);

    // Refs
    const fileVideoRef = useRef(null);
    const ytPlayerRef = useRef(null);
    const timerRef = useRef(null);

    // --- Logic: Word Synchronization ---

    // Convert raw text into timed word objects based on total duration
    const processTranscript = (text, totalDuration) => {
        if (!text || !totalDuration) return [];
        
        const rawWords = text.replace(/\n/g, ' ').split(' ').filter(w => w.length > 0);
        const timePerWord = totalDuration / rawWords.length;

        return rawWords.map((word, index) => ({
            text: word,
            start: index * timePerWord,
            end: (index + 1) * timePerWord,
            index: index
        }));
    };

    const normalizeTimedWords = (incomingWords) => {
        if (!Array.isArray(incomingWords)) return [];
        return incomingWords
            .filter((item) => item && typeof item.text === 'string')
            .map((item, idx) => ({
                text: item.text.trim(),
                start: Number(item.start ?? 0),
                end: Number(item.end ?? item.start ?? 0),
                index: idx
            }))
            .filter((item) => item.text.length > 0);
    };

    // Main sync loop (runs via requestAnimationFrame or interval)
    useEffect(() => {
        if (!isPlaying) {
            cancelAnimationFrame(timerRef.current);
            return;
        }

        const loop = () => {
            let time = 0;

            if (mediaType === 'file' && fileVideoRef.current) {
                time = fileVideoRef.current.currentTime;
            } else if (mediaType === 'youtube' && ytPlayerRef.current && ytPlayerRef.current.getCurrentTime) {
                time = ytPlayerRef.current.getCurrentTime();
            }

            setCurrentTime(time);

            // Find current word (Linear Search is fine for < 10k words)
            if (words.length > 0) {
                const word = words.find(w => time >= w.start && time < w.end);
                if (word) {
                    setCurrentWordIndex(word.index);
                } else if (time >= words[words.length-1]?.end) {
                     setCurrentWordIndex(words.length); // Ended
                } else {
                     // Before start
                     setCurrentWordIndex(-1);
                }
            }

            timerRef.current = requestAnimationFrame(loop);
        };

        timerRef.current = requestAnimationFrame(loop);
        return () => cancelAnimationFrame(timerRef.current);
    }, [isPlaying, mediaType, words]);


    // --- Handlers: Setup ---

    const handleYoutubeLoad = () => {
        // Load YT API
        if (!window.YT) {
            const tag = document.createElement('script');
            tag.src = "https://www.youtube.com/iframe_api";
            const firstScriptTag = document.getElementsByTagName('script')[0];
            firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
        }
    };

    useEffect(() => {
        handleYoutubeLoad();
    }, []);

    const startDemo = () => {
        setMediaType('youtube');
        setMediaSource(DEMO_YOUTUBE_ID);
        setTranscriptRaw(DEMO_TRANSCRIPT);
        setTimedWords([]);
        setWhisperError('');
        setMode('player');
    };

    const handleFileUpload = (e) => {
        const file = e.target.files[0];
        if (file) {
            const url = URL.createObjectURL(file);
            setMediaType('file');
            setMediaSource(url);
            setTimedWords([]);
            setWhisperError('');
        }
    };

    const handleUrlSubmit = (e) => {
        e.preventDefault();
        const input = e.target.url.value;
        // Basic YT ID extraction
        const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
        const match = input.match(regExp);
        
        if (match && match[2].length === 11) {
            setMediaType('youtube');
            setMediaSource(match[2]);
            setTimedWords([]);
            setWhisperError('');
        } else {
            alert("Please enter a valid YouTube URL");
        }
    };

    const handleStartSession = () => {
        if (!mediaType || !transcriptRaw) {
            alert("Please provide both media and a transcript/text.");
            return;
        }
        
        // If it's a file, we can get duration immediately via loadedmetadata
        // If it's YouTube, we get duration once the player loads. 
        // We will process the transcript inside the Player View once we have duration.
        setMode('player');
    };

    const handleWhisperTranscribe = async () => {
        if (mediaType !== 'file') {
            setWhisperError('Whisper transcription currently supports file uploads only.');
            return;
        }
        if (!fileVideoRef.current) {
            setWhisperError('Upload a file first.');
            return;
        }
        const fileInput = document.getElementById('file-upload');
        const file = fileInput?.files?.[0];
        if (!file) {
            setWhisperError('No file selected.');
            return;
        }
        setWhisperLoading(true);
        setWhisperError('');
        try {
            const payload = new FormData();
            payload.append('file', file);
            const response = await fetch('/api/whisper', {
                method: 'POST',
                body: payload
            });
            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.error || 'Whisper failed.');
            }
            const normalized = normalizeTimedWords(data.words);
            if (!normalized.length) {
                throw new Error('No timed words returned.');
            }
            setTimedWords(normalized);
            setWords(normalized);
            setTranscriptRaw(data.text || normalized.map((w) => w.text).join(' '));
        } catch (error) {
            setWhisperError(error.message || 'Whisper failed.');
        } finally {
            setWhisperLoading(false);
        }
    };


    // --- Render ---

    return (
        <div className="min-h-screen bg-slate-950 text-slate-200 font-sans selection:bg-blue-500/30">
            <style>{`
                .no-scrollbar::-webkit-scrollbar { display: none; }
                .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
                
                @keyframes popIn {
                    0% { transform: scale(0.95); opacity: 0.7; }
                    100% { transform: scale(1); opacity: 1; }
                }
                .animate-pop { animation: popIn 0.1s ease-out forwards; }
                
                .glow-text {
                    text-shadow: 0 0 10px rgba(56, 189, 248, 0.5), 0 0 20px rgba(56, 189, 248, 0.3);
                }
            `}</style>

            {/* Setup View */}
            {mode === 'setup' && (
                <div className="min-h-screen flex items-center justify-center p-4 bg-[url('https://images.unsplash.com/photo-1550745165-9bc0b252726f?q=80&w=2070&auto=format&fit=crop')] bg-cover bg-center bg-no-repeat bg-fixed">
                    <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-sm"></div>
                    
                    <div className="relative z-10 w-full max-w-2xl animate-pop">
                        <div className="text-center mb-8">
                            <h1 className="text-5xl font-extrabold tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-300 mb-2">
                                FocusFlow
                            </h1>
                            <p className="text-slate-400">Immersive Audio Speed Reader</p>
                        </div>

                        <Card>
                            <div className="space-y-8">
                                {/* Source Selection */}
                                <div className="space-y-4">
                                    <label className="text-sm font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                                        <div className="w-1 h-4 bg-blue-500 rounded-full"></div>
                                        1. Choose Source
                                    </label>
                                    
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {/* File Upload */}
                                        <div className={`border-2 border-dashed rounded-xl p-6 flex flex-col items-center justify-center cursor-pointer transition-colors ${mediaType === 'file' ? 'border-blue-500 bg-blue-500/10' : 'border-slate-700 hover:border-slate-500 hover:bg-slate-800/50'}`}>
                                            <input type="file" accept="audio/*,video/*" onChange={handleFileUpload} className="hidden" id="file-upload" />
                                            <label htmlFor="file-upload" className="flex flex-col items-center cursor-pointer w-full h-full">
                                                <FileAudio size={32} className={mediaType === 'file' ? 'text-blue-400' : 'text-slate-500'} />
                                                <span className="mt-2 text-sm font-medium">Upload Audio/Video</span>
                                                {mediaType === 'file' && <span className="text-xs text-blue-400 mt-1">File Selected</span>}
                                            </label>
                                        </div>

                                        {/* YouTube Input */}
                                        <div className={`border-2 rounded-xl p-6 flex flex-col justify-center transition-colors ${mediaType === 'youtube' ? 'border-red-500/50 bg-red-500/5' : 'border-slate-700 bg-slate-800/20'}`}>
                                            <div className="flex items-center gap-2 mb-3 text-slate-400">
                                                <Youtube size={20} className={mediaType === 'youtube' ? 'text-red-500' : ''} />
                                                <span className="text-sm font-medium">YouTube URL</span>
                                            </div>
                                            <form onSubmit={handleUrlSubmit} className="flex gap-2">
                                                <input 
                                                    name="url" 
                                                    placeholder="Paste link here..." 
                                                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                                                    onChange={(e) => {
                                                            if(mediaType === 'file') setMediaType(null);
                                                    }}
                                                />
                                                <button type="submit" className="bg-slate-700 px-3 rounded-lg text-xs hover:bg-slate-600">Set</button>
                                            </form>
                                            {mediaType === 'youtube' && <span className="text-xs text-green-400 mt-2">Video Linked</span>}
                                        </div>
                                    </div>
                                </div>

                                {/* Transcript Input */}
                                <div className="space-y-4">
                                    <div className="flex justify-between items-end">
                                        <label className="text-sm font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                                            <div className="w-1 h-4 bg-purple-500 rounded-full"></div>
                                            2. Paste Transcript
                                        </label>
                                        <span className="text-xs text-slate-500">
                                            {timedWords.length ? 'Whisper aligned' : 'Auto-aligns text to duration'}
                                        </span>
                                    </div>
                                    <div className="flex flex-wrap items-center gap-3">
                                    <Button
                                        onClick={handleWhisperTranscribe}
                                        variant="outline"
                                        icon={Upload}
                                        className="text-xs"
                                        disabled={whisperLoading}
                                    >
                                        {whisperLoading ? 'Transcribing...' : 'Transcribe with Whisper'}
                                    </Button>
                                        {whisperError && (
                                            <span className="text-xs text-red-400">{whisperError}</span>
                                        )}
                                    </div>
                                    <textarea
                                        value={transcriptRaw}
                                        onChange={(e) => {
                                            setTranscriptRaw(e.target.value);
                                            setTimedWords([]);
                                            setWhisperError('');
                                        }}
                                        placeholder="Paste the script or subtitles here. The app will distribute these words evenly across the media duration."
                                        className="w-full h-32 bg-slate-950/50 border border-slate-700 rounded-xl p-4 text-sm focus:outline-none focus:border-purple-500 resize-none no-scrollbar"
                                    />
                                </div>

                                {/* Actions */}
                                <div className="flex gap-4 pt-4 border-t border-slate-800">
                                    <Button onClick={handleStartSession} className="flex-1 py-3 text-lg" icon={Play}>
                                        Start Reader
                                    </Button>
                                    <Button onClick={startDemo} variant="outline" className="flex-1" icon={Eye}>
                                        Try Demo
                                    </Button>
                                </div>
                                
                                <p className="text-xs text-center text-slate-600">
                                    Note: Browsers cannot auto-transcribe files without a backend. This app uses "Linear Alignment" to sync your pasted text with the video.
                                </p>
                            </div>
                        </Card>
                    </div>
                </div>
            )}

            {/* Player View */}
            {mode === 'player' && (
                <div className="h-screen flex flex-col bg-slate-950 overflow-hidden">
                    {/* Header */}
                    <header className="h-16 border-b border-slate-800 bg-slate-900/50 flex items-center justify-between px-6 z-20">
                        <div className="flex items-center gap-2 cursor-pointer" onClick={() => setMode('setup')}>
                            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-cyan-400 rounded-lg flex items-center justify-center font-bold text-slate-900">F</div>
                            <span className="font-bold text-lg tracking-tight">FocusFlow</span>
                        </div>
                        <Button variant="ghost" icon={X} onClick={() => setMode('setup')}>Exit</Button>
                    </header>

                    {/* Main Stage */}
                    <div className="flex-1 relative flex flex-col items-center justify-center p-8">
                        
                        {/* Word Display */}
                        <div className="relative z-10 flex flex-col items-center gap-6 max-w-4xl w-full">
                            
                            {/* Context (Previous/Next) - Faded */}
                            <div className="flex justify-between w-full px-12 text-3xl font-bold text-slate-700 select-none opacity-40">
                                <span>{words[currentWordIndex - 1]?.text || ""}</span>
                                <span>{words[currentWordIndex + 1]?.text || ""}</span>
                            </div>

                            {/* THE FOCUS WORD */}
                            <div className="h-48 flex items-center justify-center w-full">
                                <h1 className="text-7xl md:text-9xl font-black text-transparent bg-clip-text bg-gradient-to-b from-white to-slate-400 tracking-tight text-center animate-pop glow-text">
                                    {words[currentWordIndex]?.text || (currentWordIndex >= words.length ? "End" : "Ready...")}
                                </h1>
                            </div>

                            {/* Progress Bar */}
                            <div className="w-full max-w-2xl group cursor-pointer" onClick={(e) => {
                                const rect = e.currentTarget.getBoundingClientRect();
                                const pct = (e.clientX - rect.left) / rect.width;
                                const seekTime = pct * duration;
                                setCurrentTime(seekTime);
                                if (mediaType === 'file' && fileVideoRef.current) {
                                    fileVideoRef.current.currentTime = seekTime;
                                } else if (mediaType === 'youtube' && ytPlayerRef.current) {
                                    ytPlayerRef.current.seekTo(seekTime, true);
                                }
                            }}>
                                <div className="h-2 bg-slate-800 rounded-full overflow-hidden relative">
                                    <div 
                                        className="absolute top-0 left-0 h-full bg-blue-500 transition-all duration-100 ease-linear shadow-[0_0_15px_rgba(59,130,246,0.5)]"
                                        style={{ width: `${(currentTime / (duration || 1)) * 100}%` }}
                                    ></div>
                                </div>
                                <div className="flex justify-between text-xs font-mono text-slate-500 mt-2">
                                    <span>{new Date(currentTime * 1000).toISOString().substr(14, 5)}</span>
                                    <span>{new Date(duration * 1000).toISOString().substr(14, 5)}</span>
                                </div>
                            </div>

                        </div>

                        {/* Hidden Media Players */}
                        <div className="absolute bottom-4 right-4 w-64 opacity-80 hover:opacity-100 transition-opacity border border-slate-700 rounded-lg overflow-hidden shadow-2xl z-0">
                            {mediaType === 'file' && (
                                <video 
                                    ref={fileVideoRef}
                                    src={mediaSource}
                                    className="w-full h-auto bg-black"
                                    onLoadedMetadata={(e) => {
                                        if (e.target.duration > 0) {
                                            setDuration(e.target.duration);
                                            if (timedWords.length) {
                                                setWords(timedWords);
                                            } else {
                                                setWords(processTranscript(transcriptRaw, e.target.duration));
                                            }
                                        }
                                    }}
                                    onEnded={() => setIsPlaying(false)}
                                    controls={false} // Custom controls
                                />
                            )}
                            
                            {/* YouTube initialization */}
                            {mediaType === 'youtube' && (
                                <YoutubeEmbed 
                                    videoId={mediaSource} 
                                    playerRef={ytPlayerRef} 
                                    onReady={(dur) => {
                                        if (dur > 0) {
                                            setDuration(dur);
                                            if (timedWords.length) {
                                                setWords(timedWords);
                                            } else {
                                                setWords(processTranscript(transcriptRaw, dur));
                                            }
                                        }
                                    }}
                                    onStateChange={(state) => {
                                        if(state === 0) setIsPlaying(false); // Ended
                                        if(state === 1) setIsPlaying(true);
                                        if(state === 2) setIsPlaying(false);
                                    }}
                                />
                            )}
                        </div>
                    </div>

                    {/* Controls Footer */}
                    <div className="h-24 bg-slate-900 border-t border-slate-800 flex items-center justify-center gap-6 z-20">
                        
                        <div className="flex items-center gap-2">
                            <span className="text-xs text-slate-500 font-bold uppercase mr-2">Speed</span>
                            {[0.5, 1, 1.5, 2].map(rate => (
                                <button
                                    key={rate}
                                    onClick={() => {
                                        setPlaybackRate(rate);
                                        if (mediaType === 'file' && fileVideoRef.current) {
                                            fileVideoRef.current.playbackRate = rate;
                                        } else if (mediaType === 'youtube' && ytPlayerRef.current) {
                                            ytPlayerRef.current.setPlaybackRate(rate);
                                        }
                                    }}
                                    className={`px-3 py-1 rounded text-xs font-bold ${playbackRate === rate ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}
                                >
                                    {rate}x
                                </button>
                            ))}
                        </div>

                        <div className="w-px h-10 bg-slate-800 mx-4"></div>

                        <Button 
                            variant="ghost" 
                            className="rounded-full w-12 h-12 p-0"
                            onClick={() => {
                                const newTime = Math.max(0, currentTime - 5);
                                setCurrentTime(newTime);
                                if (mediaType === 'file' && fileVideoRef.current) fileVideoRef.current.currentTime = newTime;
                                if (mediaType === 'youtube' && ytPlayerRef.current) ytPlayerRef.current.seekTo(newTime, true);
                            }}
                        >
                            <Rewind size={24} />
                        </Button>

                        <button 
                            onClick={() => {
                                if (mediaType === 'file') {
                                    const vid = fileVideoRef.current;
                                    if (vid) vid.paused ? vid.play() : vid.pause();
                                    setIsPlaying(!vid.paused);
                                } else if (mediaType === 'youtube') {
                                    const player = ytPlayerRef.current;
                                    if (player && player.getPlayerState) {
                                        player.getPlayerState() === 1 ? player.pauseVideo() : player.playVideo();
                                    }
                                }
                            }}
                            className="w-16 h-16 rounded-full bg-white text-slate-900 flex items-center justify-center hover:scale-105 transition-transform shadow-lg shadow-white/10"
                        >
                            {isPlaying ? <Pause size={32} fill="currentColor" /> : <Play size={32} fill="currentColor" className="ml-1" />}
                        </button>

                         <Button 
                            variant="ghost" 
                            className="rounded-full w-12 h-12 p-0"
                            onClick={() => {
                                const newTime = Math.min(duration, currentTime + 5);
                                setCurrentTime(newTime);
                                if (mediaType === 'file' && fileVideoRef.current) fileVideoRef.current.currentTime = newTime;
                                if (mediaType === 'youtube' && ytPlayerRef.current) ytPlayerRef.current.seekTo(newTime, true);
                            }}
                        >
                            <FastForward size={24} />
                        </Button>

                        <div className="w-px h-10 bg-slate-800 mx-4"></div>

                         <div className="flex items-center gap-4 text-slate-500">
                             <AlignJustify size={20} className="hover:text-blue-400 cursor-pointer" title="View Full Script (Coming Soon)" />
                             <Settings size={20} className="hover:text-blue-400 cursor-pointer" />
                         </div>

                    </div>
                </div>
            )}
        </div>
    );
}
