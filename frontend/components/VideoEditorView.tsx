import React, { useState, useRef, useEffect } from "react";
import { 
  ArrowLeft, 
  MoreHorizontal, 
  ChevronDown, 
  ChevronRight, 
  Star, 
  SkipBack, 
  Play, 
  SkipForward, 
  ZoomOut, 
  ZoomIn,
  Monitor 
} from "lucide-react";

interface VideoEditorViewProps {
  handlePublish: () => void;
  recordingUrl: string | null;
  handleGoToHome: () => void;
}

export const VideoEditorView: React.FC<VideoEditorViewProps> = ({
  handlePublish,
  recordingUrl,
  handleGoToHome,
}) => {
  const [activeTab, setActiveTab] = useState<"Wallpaper" | "Gradient" | "Color" | "Image">("Wallpaper");
  const [wallpaperType, setWallpaperType] = useState<"macOS" | "Spring" | "Sunset" | "Radia">("macOS");

  const videoRef = useRef<HTMLVideoElement>(null);
  const timelineRef = useRef<HTMLDivElement>(null);
  const playheadRef = useRef<HTMLDivElement>(null);

  const [videoDuration, setVideoDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [isScrubbing, setIsScrubbing] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const formatTime = (timeInSeconds: number): string => {
    const minutes = Math.floor(timeInSeconds / 60);
    const seconds = Math.floor(timeInSeconds % 60);
    return `${minutes}:${seconds < 10 ? "0" : ""}${seconds}`;
  };

  useEffect(() => {
    const video = videoRef.current;
    if (video) {
      const handleLoadedMetadata = () => {
        setVideoDuration(video.duration);
      };
      const handleTimeUpdate = () => {
        setCurrentTime(video.currentTime);
      };
      const handlePlay = () => setIsPlaying(true);
      const handlePause = () => setIsPlaying(false);
      const handleEnded = () => setIsPlaying(false);

      video.addEventListener("loadedmetadata", handleLoadedMetadata);
      video.addEventListener("timeupdate", handleTimeUpdate);
      video.addEventListener("play", handlePlay);
      video.addEventListener("pause", handlePause);
      video.addEventListener("ended", handleEnded);

      if (video.readyState >= 1) {
        handleLoadedMetadata();
      }
      setCurrentTime(video.currentTime);
      setIsPlaying(!video.paused);

      return () => {
        video.removeEventListener("loadedmetadata", handleLoadedMetadata);
        video.removeEventListener("timeupdate", handleTimeUpdate);
        video.removeEventListener("play", handlePlay);
        video.removeEventListener("pause", handlePause);
        video.removeEventListener("ended", handleEnded);
      };
    }
  }, [recordingUrl]);

  useEffect(() => {
    if (playheadRef.current && videoDuration > 0) {
      const percentage = (currentTime / videoDuration) * 100;
      playheadRef.current.style.left = `${percentage}%`;
    } else if (playheadRef.current) {
      playheadRef.current.style.left = `0%`;
    }
  }, [currentTime, videoDuration]);

  const handleTimelineInteraction = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!timelineRef.current || !videoRef.current || videoDuration === 0) return;

    const timelineRect = timelineRef.current.getBoundingClientRect();
    const clickX = event.clientX - timelineRect.left;
    let newTimeFraction = clickX / timelineRect.width;

    newTimeFraction = Math.max(0, Math.min(1, newTimeFraction));

    const newTime = newTimeFraction * videoDuration;
    videoRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const handleTimelineMouseDown = (event: React.MouseEvent<HTMLDivElement>) => {
    setIsScrubbing(true);
    setIsDragging(false);
    handleTimelineInteraction(event);
    
    const handleGlobalMouseMove = (e: MouseEvent) => {
      setIsDragging(true);
      if (!timelineRef.current || !videoRef.current || videoDuration === 0) return;
      
      const timelineRect = timelineRef.current.getBoundingClientRect();
      const clickX = e.clientX - timelineRect.left;
      let newTimeFraction = clickX / timelineRect.width;
      
      newTimeFraction = Math.max(0, Math.min(1, newTimeFraction));
      
      const newTime = newTimeFraction * videoDuration;
      videoRef.current.currentTime = newTime;
      setCurrentTime(newTime);
    };
    
    const handleGlobalMouseUp = () => {
      setIsScrubbing(false);
      document.removeEventListener('mousemove', handleGlobalMouseMove);
      document.removeEventListener('mouseup', handleGlobalMouseUp);
      
      setTimeout(() => setIsDragging(false), 10);
    };
    
    document.addEventListener('mousemove', handleGlobalMouseMove);
    document.addEventListener('mouseup', handleGlobalMouseUp);
  };

  const handleTimelineClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!isDragging && !isScrubbing) {
      handleTimelineInteraction(event);
    }
  };

  const togglePlayPause = () => {
    if (videoRef.current) {
      if (videoRef.current.paused || videoRef.current.ended) {
        videoRef.current.play().catch(error => console.error("Error trying to play video:", error));
      } else {
        videoRef.current.pause();
      }
    }
  };

  const skipTime = (amount: number) => {
    if (videoRef.current) {
      let newTime = videoRef.current.currentTime + amount;
      newTime = Math.max(0, Math.min(videoDuration, newTime));
      videoRef.current.currentTime = newTime;
      setCurrentTime(newTime);
    }
  };

  return (
    <div className="h-screen flex flex-col bg-white">
      {/* Top Bar */}
      <div className="border-b flex items-center justify-between px-6 py-3">
        <div className="flex items-center gap-4">
          <button onClick={() => { console.log('VideoEditorView: Back button clicked'); handleGoToHome(); }} className="p-1 text-gray-600 hover:text-gray-900">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="font-medium">browser-use.com</div>
        </div>

        <div className="flex items-center gap-3">
          <button onClick={handlePublish} className="bg-black text-white px-4 py-2 rounded-lg hover:bg-gray-800">
            Publish
          </button>
          <button className="p-1 text-gray-600 hover:text-gray-900">
            <MoreHorizontal className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Video Preview Area */}
        <div className="flex-1 bg-gradient-to-b from-purple-600 to-purple-200 flex items-center justify-center p-4 overflow-auto">
          {recordingUrl ? (
            <video 
              ref={videoRef}
              src={recordingUrl} 
              className="w-full max-w-4xl max-h-[85vh] rounded-lg shadow-lg aspect-video bg-black" 
              onDoubleClick={togglePlayPause}
              onClick={(e) => {
                e.stopPropagation();
              }}
            />
          ) : (
            <div className="bg-white rounded-lg shadow-lg w-full max-w-4xl max-h-[85vh] aspect-video flex flex-col overflow-hidden">
              <div className="bg-gray-100 h-8 flex items-center px-3 gap-1.5 border-b">
                <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                <div className="w-3 h-3 bg-yellow-400 rounded-full"></div>
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              </div>
              <div className="flex-1 bg-white flex items-center justify-center">
                <div className="text-center text-gray-600">
                  <Monitor size={64} className="mx-auto mb-4 text-gray-400" />
                  <p className="text-lg font-medium">Video Not Available</p>
                  <p className="text-sm mb-4 text-gray-500">The video recording is being processed or is unavailable.</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Sidebar */}
        <div className="w-80 flex flex-col border-l bg-white">
          <div className="flex-1 overflow-y-auto">
            {/* Chat Interface */}
            <div className="p-6 border-b">
              <textarea
                placeholder="Ask Glimpse to edit this video..."
                className="w-full p-3 border rounded-lg outline-none text-sm resize-none focus:ring-1 focus:ring-black"
                rows={3}
              />
              <div className="flex justify-end mt-3">
                <button
                  type="button"
                  className="px-4 py-2 rounded-lg bg-black text-white hover:bg-gray-800 transition-colors"
                >
                  Generate
                </button>
              </div>
            </div>

            <div className="p-6">
              <div className="mb-8">
                <h3 className="font-medium text-xl mb-6">Design</h3>

                <div className="space-y-8">
                  <div>
                    <div className="mb-4">
                      <span className="text-gray-700 font-medium block mb-3">Background</span>
                      <div className="flex items-center gap-3">
                        {(["Wallpaper", "Gradient", "Color", "Image"] as const).map((tab) => (
                          <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`px-3 py-1.5 text-sm rounded flex-1 ${
                              activeTab === tab ? "bg-gray-200 text-gray-800" : "hover:bg-gray-100 text-gray-600"
                            }`}
                          >
                            {tab}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {activeTab === "Wallpaper" && (
                    <div className="space-y-6">
                      <div>
                        <div className="mb-3">
                          <span className="text-gray-700 block mb-3">Type</span>
                          <div className="grid grid-cols-4 gap-3">
                            {(["macOS", "Spring", "Sunset", "Radia"] as const).map((type) => (
                              <button
                                key={type}
                                onClick={() => setWallpaperType(type)}
                                className={`px-2 py-1.5 text-sm rounded ${
                                  wallpaperType === type
                                    ? "bg-gray-200 text-gray-800"
                                    : "bg-gray-50 hover:bg-gray-100 text-gray-600"
                                }`}
                              >
                                {type}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                      <button className="w-full flex items-center justify-center gap-2 text-sm py-2.5 bg-gray-50 hover:bg-gray-100 rounded-md text-gray-700 border">
                        <Star size={16} /> Pick random wallpaper
                      </button>
                      <div className="grid grid-cols-3 gap-3 mt-2">
                        {Array.from({ length: 6 }).map((_, i) => (
                          <div
                            key={i}
                            className="aspect-video bg-gray-100 rounded hover:bg-gray-200 cursor-pointer border"
                          ></div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="space-y-6">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-gray-700">Background blur</span>
                        <div className="w-40">
                          <input
                            type="range"
                            min="0"
                            max="100"
                            defaultValue="30"
                            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-black"
                          />
                        </div>
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-gray-700">Padding</span>
                        <div className="w-40">
                          <input
                            type="range"
                            min="0"
                            max="100"
                            defaultValue="50"
                            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-black"
                          />
                        </div>
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-gray-700">Rounded corners</span>
                        <div className="w-40">
                          <input
                            type="range"
                            min="0"
                            max="100"
                            defaultValue="60"
                            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-black"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-6 border-t">
                <h3 className="font-medium text-xl mb-6">Content</h3>

                <div className="space-y-6">
                  <div className="flex items-center justify-between py-2">
                    <span className="text-gray-700">Audio</span>
                    <div className="flex items-center gap-2 text-gray-500 cursor-pointer hover:text-gray-700">
                      <span className="text-sm">None</span>
                      <ChevronRight className="w-4 h-4" />
                    </div>
                  </div>

                  <div className="flex items-center justify-between py-2">
                    <span className="text-gray-700">Transitions</span>
                    <div className="flex items-center gap-2 text-gray-500 cursor-pointer hover:text-gray-700">
                      <span className="text-sm">Fade</span>
                      <ChevronRight className="w-4 h-4" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Timeline Area */}
      <div className="h-28 bg-white border-t p-3 flex flex-col justify-between">
        <div className="flex items-center justify-between text-xs mb-1">
          <span className="text-gray-600">1 visible timeline</span>
          <ChevronDown size={16} className="text-gray-600" />
        </div>
        <div 
          ref={timelineRef}
          className="flex-1 bg-gray-100 rounded flex items-center justify-center text-xs text-gray-500 relative border cursor-pointer"
          onMouseDown={handleTimelineMouseDown}
          onClick={handleTimelineClick}
        >
          <div 
            ref={playheadRef}
            className="absolute top-1/2 -translate-y-1/2 w-1 h-6 bg-black rounded-full pointer-events-none"
          ></div>
        </div>
        <div className="flex items-center justify-between mt-1">
          <div className="flex items-center gap-2">
            <button onClick={() => skipTime(-5)} className="p-1 hover:bg-gray-100 rounded text-gray-600">
              <SkipBack size={16} />
            </button>
            <button onClick={togglePlayPause} className="p-1 hover:bg-gray-100 rounded text-gray-600">
              {isPlaying ? (
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="6" y="4" width="4" height="16"></rect>
                  <rect x="14" y="4" width="4" height="16"></rect>
                </svg>
              ) : (
                <Play size={16} />
              )}
            </button>
            <button onClick={() => skipTime(5)} className="p-1 hover:bg-gray-100 rounded text-gray-600">
              <SkipForward size={16} />
            </button>
          </div>
          <div className="text-xs text-gray-600 tabular-nums">
            {formatTime(currentTime)} / {formatTime(videoDuration)}
          </div>
          <div className="flex items-center gap-2">
            <button className="p-1 hover:bg-gray-100 rounded text-gray-600">
              <ZoomOut size={16} />
            </button>
            <input
              type="range"
              min="0"
              max="100"
              defaultValue="50"
              className="w-20 h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-black"
            />
            <button className="p-1 hover:bg-gray-100 rounded text-gray-600">
              <ZoomIn size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}; 