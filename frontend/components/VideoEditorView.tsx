import React, { useState, useRef, useEffect } from "react";
import { 
  ArrowLeft, 
  MoreHorizontal, 
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

// ZoomSegment component for the draggable purple segments
interface ZoomSegmentProps {
  duration: string;
  label: string;
  position: number; // percentage
  width: number; // percentage
}

const ZoomSegment: React.FC<ZoomSegmentProps> = ({ duration, label, position, width }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [dragPosition, setDragPosition] = useState(position);

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    const startX = e.clientX;
    const startPosition = dragPosition;

    const handleMouseMove = (e: MouseEvent) => {
      const deltaX = e.clientX - startX;
      const container = (e.target as HTMLElement).closest('.relative');
      if (container) {
        const containerWidth = container.getBoundingClientRect().width;
        const deltaPercent = (deltaX / containerWidth) * 100;
        const newPosition = Math.max(0, Math.min(100 - width, startPosition + deltaPercent));
        setDragPosition(newPosition);
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  return (
    <div
      className={`absolute h-10 bg-gradient-to-r from-purple-500 to-blue-500 rounded-lg flex items-center justify-center text-white text-sm font-medium cursor-grab select-none shadow-lg transition-transform ${
        isDragging ? 'scale-105 cursor-grabbing' : 'hover:scale-102'
      }`}
      style={{ 
        left: `${dragPosition}%`, 
        width: `${width}%`,
        top: '50%',
        transform: 'translateY(-50%)'
      }}
      onMouseDown={handleMouseDown}
    >
      <div className="flex items-center gap-1">
        <span className="text-xs opacity-90">⚡</span>
        <span>{duration}</span>
        <span className="text-xs opacity-75">{label}</span>
      </div>
    </div>
  );
};

export const VideoEditorView: React.FC<VideoEditorViewProps> = ({
  handlePublish,
  recordingUrl,
  handleGoToHome,
}) => {
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
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Top Bar */}
      <div className="border-b bg-white flex items-center justify-between px-6 py-3">
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
        <div className="flex-1 bg-gray-100 flex items-center justify-center p-8 overflow-auto">
          {recordingUrl ? (
            <video 
              ref={videoRef}
              src={recordingUrl} 
              className="w-full h-full max-w-full max-h-full rounded-lg shadow-lg bg-black object-contain" 
              onDoubleClick={togglePlayPause}
              onClick={(e) => {
                e.stopPropagation();
              }}
            />
          ) : (
            <div className="bg-white rounded-lg shadow-lg w-full h-full flex flex-col overflow-hidden">
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

        {/* Right Sidebar - Simplified */}
        <div className="w-80 flex flex-col border-l bg-white">
          <div className="flex-1 overflow-y-auto">
            {/* Chat Interface Only */}
            <div className="p-6">
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
          </div>
        </div>
      </div>

      {/* Timeline Area */}
      <div className="bg-gray-900 border-t p-4 flex flex-col gap-4">
        {/* Timeline Header with Time Markers */}
        <div className="relative h-6">
          {/* Time markers */}
          <div className="absolute inset-0 flex justify-between items-start text-xs text-gray-400">
            {Array.from({ length: Math.ceil(videoDuration / 5) + 1 }).map((_, index) => {
              const time = index * 5;
              if (time <= videoDuration) {
                return (
                  <div key={time} className="flex flex-col items-center">
                    <div className="w-px h-2 bg-gray-600 mb-1"></div>
                    <span>{formatTime(time)}</span>
                  </div>
                );
              }
              return null;
            })}
          </div>
        </div>

        {/* Main Timeline Track */}
        <div className="relative">
          <div 
            ref={timelineRef}
            className="h-12 bg-gradient-to-r from-orange-400 to-yellow-500 rounded-lg relative cursor-pointer shadow-lg"
            onMouseDown={handleTimelineMouseDown}
            onClick={handleTimelineClick}
          >
            {/* Timeline info overlay */}
            <div className="absolute inset-0 flex items-center justify-center text-white font-medium text-sm">
              {Math.round(videoDuration)}s ⚡ 1x
            </div>
            
            {/* Playhead */}
            <div 
              ref={playheadRef}
              className="absolute top-0 w-1 h-full bg-white rounded-full shadow-lg"
              style={{ left: '0%' }}
            ></div>
          </div>
        </div>

        {/* Zoom Track - Draggable segments */}
        <div className="relative h-16 bg-gray-800 rounded-lg p-2">
          <div className="flex gap-2 h-full">
            {/* Sample zoom segments - these will be draggable but non-functional for now */}
            <ZoomSegment 
              duration="2.2x" 
              label="Auto" 
              position={0} 
              width={25}
            />
            <ZoomSegment 
              duration="2.2x" 
              label="Auto" 
              position={27} 
              width={25}
            />
            <ZoomSegment 
              duration="2.0x" 
              label="Auto" 
              position={54} 
              width={20}
            />
            <ZoomSegment 
              duration="1.5x" 
              label="Auto" 
              position={76} 
              width={22}
            />
          </div>
        </div>

        {/* Timeline Controls */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => skipTime(-5)} className="p-2 hover:bg-gray-800 rounded text-gray-400 hover:text-white transition-colors">
              <SkipBack size={20} />
            </button>
            <button onClick={togglePlayPause} className="p-2 hover:bg-gray-800 rounded text-gray-400 hover:text-white transition-colors">
              {isPlaying ? (
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="6" y="4" width="4" height="16"></rect>
                  <rect x="14" y="4" width="4" height="16"></rect>
                </svg>
              ) : (
                <Play size={20} />
              )}
            </button>
            <button onClick={() => skipTime(5)} className="p-2 hover:bg-gray-800 rounded text-gray-400 hover:text-white transition-colors">
              <SkipForward size={20} />
            </button>
          </div>
          
          <div className="text-sm text-gray-400 font-mono">
            {formatTime(currentTime)} / {formatTime(videoDuration)}
          </div>
          
          <div className="flex items-center gap-3">
            <button className="p-2 hover:bg-gray-800 rounded text-gray-400 hover:text-white transition-colors">
              <ZoomOut size={18} />
            </button>
            <input
              type="range"
              min="0"
              max="100"
              defaultValue="50"
              className="w-24 h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-orange-500"
            />
            <button className="p-2 hover:bg-gray-800 rounded text-gray-400 hover:text-white transition-colors">
              <ZoomIn size={18} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}; 