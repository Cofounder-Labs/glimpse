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
  clickData?: any[] | null;
}

// ZoomSegment component for the draggable purple segments
interface ZoomSegmentProps {
  duration: string;
  label: string;
  position: number; // percentage
  width: number; // percentage
  id: string;
  isSelected?: boolean;
  onPositionChange?: (id: string, newPosition: number, newWidth: number) => void;
  onSelect?: (id: string) => void;
  onPreviewZoom?: (id: string) => void;
  onStopPreview?: () => void;
}

const ZoomSegment: React.FC<ZoomSegmentProps> = ({ duration, label, position, width, id, isSelected, onPositionChange, onSelect, onPreviewZoom, onStopPreview }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [hasMoved, setHasMoved] = useState(false);
  const [dragPosition, setDragPosition] = useState(position);
  const [dragWidth, setDragWidth] = useState(width);
  const [dragMode, setDragMode] = useState<'move' | 'resize-left' | 'resize-right'>('move');
  const [cursorStyle, setCursorStyle] = useState('cursor-grab');
  const [clickStartTime, setClickStartTime] = useState<number>(0);

  // Update local state when props change
  useEffect(() => {
    setDragPosition(position);
    setDragWidth(width);
  }, [position, width]);

  const getMouseMode = (e: React.MouseEvent, elementRect: DOMRect): 'move' | 'resize-left' | 'resize-right' => {
    const mouseX = e.clientX - elementRect.left;
    const edgeThreshold = 8; // pixels from edge to trigger resize
    
    if (mouseX <= edgeThreshold) {
      return 'resize-left';
    } else if (mouseX >= elementRect.width - edgeThreshold) {
      return 'resize-right';
    } else {
      return 'move';
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) {
      const rect = e.currentTarget.getBoundingClientRect();
      const mode = getMouseMode(e, rect);
      
      switch (mode) {
        case 'resize-left':
          setCursorStyle('cursor-w-resize');
          break;
        case 'resize-right':
          setCursorStyle('cursor-e-resize');
          break;
        default:
          setCursorStyle(isSelected ? 'cursor-grab' : 'cursor-pointer');
      }
    }
  };

  const handleMouseLeave = () => {
    if (!isDragging) {
      setCursorStyle(isSelected ? 'cursor-grab' : 'cursor-pointer');
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation(); // Prevent timeline from receiving this event
    
    const rect = e.currentTarget.getBoundingClientRect();
    const mode = getMouseMode(e, rect);
    
    setIsDragging(true);
    setHasMoved(false);
    setDragMode(mode);
    setClickStartTime(Date.now());
    
    const startX = e.clientX;
    const startPosition = dragPosition;
    const startWidth = dragWidth;

    const handleGlobalMouseMove = (e: MouseEvent) => {
      const deltaX = e.clientX - startX;
      const timeSinceStart = Date.now() - clickStartTime;
      
      // Relax the movement threshold to make single clicks work better
      // Only consider it movement if we've moved more than 8px AND some time has passed
      if (Math.abs(deltaX) > 8 && timeSinceStart > 150) {
        setHasMoved(true);
        
        // Trigger zoom preview while dragging
        if (onPreviewZoom) {
          onPreviewZoom(id);
        }
      }
      
      const container = (e.target as HTMLElement).closest('.relative');
      if (container) {
        const containerWidth = container.getBoundingClientRect().width;
        const deltaPercent = (deltaX / containerWidth) * 100;
        
        if (mode === 'move') {
          // Move the entire segment
          const newPosition = Math.max(0, Math.min(100 - dragWidth, startPosition + deltaPercent));
          setDragPosition(newPosition);
        } else if (mode === 'resize-left') {
          // Resize from the left edge
          const newPosition = Math.max(0, Math.min(startPosition + startWidth - 1, startPosition + deltaPercent));
          const newWidth = Math.max(1, startWidth - (newPosition - startPosition));
          setDragPosition(newPosition);
          setDragWidth(newWidth);
        } else if (mode === 'resize-right') {
          // Resize from the right edge
          const newWidth = Math.max(1, Math.min(100 - startPosition, startWidth + deltaPercent));
          setDragWidth(newWidth);
        }
      }
    };

    const handleGlobalMouseUp = () => {
      const wasDragging = isDragging;
      const didMove = hasMoved;
      const clickDuration = Date.now() - clickStartTime;
      
      setIsDragging(false);
      setHasMoved(false);
      setCursorStyle(isSelected ? 'cursor-grab' : 'cursor-pointer');
      
      console.log(`🖱️ Click info:`, { didMove, clickDuration, segmentId: id });
      
      // Notify parent of the new position and width only if we actually moved
      if (wasDragging && didMove && onPositionChange) {
        onPositionChange(id, dragPosition, dragWidth);
      }
      
      // Stop zoom preview when dragging ends
      if (wasDragging && didMove && onStopPreview) {
        onStopPreview();
      }
      
      // If it was a click without movement, trigger selection
      if (!didMove && onSelect) {
        console.log(`✅ Selecting zoom segment: ${id}`);
        onSelect(id);
      } else {
        console.log(`🚫 Zoom segment selection blocked:`, { didMove, clickDuration, hasOnSelect: !!onSelect });
      }
      
      document.removeEventListener('mousemove', handleGlobalMouseMove);
      document.removeEventListener('mouseup', handleGlobalMouseUp);
    };

    document.addEventListener('mousemove', handleGlobalMouseMove);
    document.addEventListener('mouseup', handleGlobalMouseUp);
  };

  return (
    <div
      className={`absolute h-10 ${
        isSelected 
          ? 'bg-gradient-to-r from-yellow-400 to-orange-500 ring-2 ring-yellow-300' 
          : 'bg-gradient-to-r from-purple-500 to-blue-500'
      } rounded-lg flex items-center justify-center text-white text-sm font-medium select-none shadow-lg transition-all ${
        isDragging ? 'scale-105' : 'hover:scale-102'
      } ${isSelected ? 'ring-offset-2' : ''} ${cursorStyle}`}
      style={{ 
        left: `${dragPosition}%`, 
        width: `${dragWidth}%`,
        top: '50%',
        transform: 'translateY(-50%)'
      }}
      onMouseDown={handleMouseDown}
      onClick={(e) => {
        e.stopPropagation();
        // Selection is now handled in mouseUp event for better reliability
      }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
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
  clickData,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const timelineRef = useRef<HTMLDivElement>(null);
  const playheadRef = useRef<HTMLDivElement>(null);

  const [videoDuration, setVideoDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [isScrubbing, setIsScrubbing] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [zoomSegments, setZoomSegments] = useState<Array<{
    timestamp: number;
    duration: number;
    label: string;
    x: number;
    y: number;
    clickTimestamp: number;
    id: string;
  }>>([]);
  const [currentZoomEffect, setCurrentZoomEffect] = useState<{
    active: boolean;
    x: number;
    y: number;
    scale: number;
  }>({ active: false, x: 0, y: 0, scale: 1 });
  const [selectedZoomSegment, setSelectedZoomSegment] = useState<string | null>(null);
  const [zoomAreas, setZoomAreas] = useState<Record<string, { x: number; y: number; width: number; height: number }>>({});
  const [isEditingZoomArea, setIsEditingZoomArea] = useState(false);
  const [selectionStart, setSelectionStart] = useState<{ x: number; y: number } | null>(null);
  const [currentSelection, setCurrentSelection] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
  const [zoomAreaDragMode, setZoomAreaDragMode] = useState<'none' | 'create' | 'move' | 'resize-tl' | 'resize-tr' | 'resize-bl' | 'resize-br'>('none');
  const [zoomAreaDragStart, setZoomAreaDragStart] = useState<{ x: number; y: number; originalArea?: { x: number; y: number; width: number; height: number } } | null>(null);

  const formatTime = (timeInSeconds: number): string => {
    const minutes = Math.floor(timeInSeconds / 60);
    const seconds = Math.floor(timeInSeconds % 60);
    return `${minutes}:${seconds < 10 ? "0" : ""}${seconds}`;
  };

  // Generate zoom segments from click data
  const generateZoomSegments = () => {
    if (!clickData || !Array.isArray(clickData) || clickData.length === 0) {
      console.log("No click data available for zoom generation");
      return [];
    }

    console.log("Generating zoom segments from", clickData.length, "clicks");
    
    const segments = clickData.map((click, index) => {
      const clickTime = click.timestamp || 0;
      const totalDuration = 2.0; // Total zoom duration
      const halfDuration = totalDuration / 2; // Half duration on each side of click
      
      const segmentId = `zoom-${index}`;
      
      // Create default zoom area centered on click position
      const defaultZoomArea = {
        x: Math.max(0, Math.min(70, ((click.x || 960) / 1920) * 100 - 15)), // 30% width area centered on click (1920px resolution)
        y: Math.max(0, Math.min(70, ((click.y || 540) / 1080) * 100 - 15)), // 30% height area centered on click (1080px resolution)
        width: 30,
        height: 30
      };
      
      // Initialize zoom area for this segment
      setZoomAreas(prev => ({
        ...prev,
        [segmentId]: defaultZoomArea
      }));
      
      // Center the zoom segment around the click time
      // Click happens at the middle of the segment (peak zoom)
      return {
        timestamp: Math.max(0, clickTime - halfDuration), // Start half duration before click
        duration: totalDuration, // Total duration
        label: `Click ${index + 1}`,
        x: click.x || 0,
        y: click.y || 0,
        clickTimestamp: clickTime, // Store original click time for reference
        id: segmentId // Add unique ID for tracking
      };
    });
    
    return segments;
  };

  // Preview zoom effect for a specific segment (used during dragging)
  const previewZoomEffect = (segmentId: string) => {
    const segment = zoomSegments.find(s => s.id === segmentId);
    if (!segment) return;
    
    // Show zoom effect at peak (middle of segment)
    const peakZoom = 2.5;
    
    // Use zoom area if available, otherwise fall back to click coordinates  
    const zoomArea = zoomAreas[segment.id];
    let xPercent = 50;
    let yPercent = 50;
    
    if (zoomArea) {
      xPercent = zoomArea.x + (zoomArea.width / 2);
      yPercent = zoomArea.y + (zoomArea.height / 2);
    } else if (segment.x !== undefined && segment.y !== undefined) {
      const videoWidth = 1920;
      const videoHeight = 1080;
      xPercent = Math.min(Math.max((segment.x / videoWidth) * 100, 5), 95);
      yPercent = Math.min(Math.max((segment.y / videoHeight) * 100, 5), 95);
    }
    
    setCurrentZoomEffect({
      active: true,
      x: xPercent,
      y: yPercent,
      scale: peakZoom
    });
    
    console.log(`🔍 PREVIEW ZOOM: segment=${segmentId}, scale=${peakZoom}x at (${xPercent.toFixed(1)}%, ${yPercent.toFixed(1)}%)`);
  };

  // Check if current time is within a zoom segment and apply zoom effect
  const checkAndApplyZoomEffect = () => {
    const activeSegment = zoomSegments.find(segment => 
      currentTime >= segment.timestamp && 
      currentTime <= segment.timestamp + segment.duration
    );

    if (activeSegment && videoRef.current) {
      // Calculate progress through the zoom segment (0 to 1)
      const segmentElapsed = currentTime - activeSegment.timestamp;
      const segmentProgress = segmentElapsed / activeSegment.duration;
      
      // Create a smooth zoom curve: ease in, peak in middle, ease out
      let zoomScale: number;
      const peakZoom = 2.5;
      
      if (segmentProgress < 0.5) {
        // First half: zoom in (1x to peak)
        const progress = segmentProgress * 2; // 0 to 1
        zoomScale = 1 + (peakZoom - 1) * progress;
      } else {
        // Second half: zoom out (peak to 1x)
        const progress = (segmentProgress - 0.5) * 2; // 0 to 1
        zoomScale = peakZoom - (peakZoom - 1) * progress;
      }
      
      // Ensure minimum zoom scale
      zoomScale = Math.max(1, zoomScale);
      
      // Use zoom area if available, otherwise fall back to click coordinates
      const zoomArea = zoomAreas[activeSegment.id];
      let xPercent = 50; // Default to center
      let yPercent = 50; // Default to center
      
      if (zoomArea) {
        // Use center of the selected zoom area
        xPercent = zoomArea.x + (zoomArea.width / 2);
        yPercent = zoomArea.y + (zoomArea.height / 2);
        console.log(`Using zoom area for ${activeSegment.id}: center at (${xPercent.toFixed(1)}%, ${yPercent.toFixed(1)}%)`);
      } else if (activeSegment.x !== undefined && activeSegment.y !== undefined) {
        // Fallback to click coordinates
        const videoWidth = 1920; // Recording resolution width (set in agent.py)
        const videoHeight = 1080; // Recording resolution height (set in agent.py)
        
        xPercent = Math.min(Math.max((activeSegment.x / videoWidth) * 100, 5), 95);
        yPercent = Math.min(Math.max((activeSegment.y / videoHeight) * 100, 5), 95);
        
        console.log(`Using click coordinates for ${activeSegment.id}: (${activeSegment.x}, ${activeSegment.y}) -> (${xPercent.toFixed(1)}%, ${yPercent.toFixed(1)}%)`);
      }
      
      setCurrentZoomEffect({
        active: true,
        x: xPercent,
        y: yPercent,
        scale: zoomScale
      });
      
      console.log(`🔍 ZOOM ACTIVE: segment=${activeSegment.id}, time=${currentTime.toFixed(2)}s (${activeSegment.timestamp.toFixed(2)}-${(activeSegment.timestamp + activeSegment.duration).toFixed(2)}s), progress=${segmentProgress.toFixed(2)}, scale=${zoomScale.toFixed(2)}x`);
    } else {
      // Reset zoom when not in an active segment
      setCurrentZoomEffect({
        active: false,
        x: 50,
        y: 50,
        scale: 1
      });
      
      if (zoomSegments.length > 0) {
        console.log(`🔍 NO ZOOM: time=${currentTime.toFixed(2)}s, available segments:`, 
          zoomSegments.map(s => `${s.id}:(${s.timestamp.toFixed(2)}-${(s.timestamp + s.duration).toFixed(2)}s)`).join(', '));
      }
    }
  };

  // Update zoom segments when click data changes
  useEffect(() => {
    const segments = generateZoomSegments();
    setZoomSegments(segments);
    if (clickData && clickData.length > 0) {
      console.log("Click data received:", clickData);
      console.log("Generated zoom segments:", segments);
    } else {
      console.log("No click data available, using fallback segments");
    }
  }, [clickData]);

  // Apply zoom effect based on current time
  useEffect(() => {
    checkAndApplyZoomEffect();
  }, [currentTime, zoomSegments]);

  // Exit edit mode when switching segments
  useEffect(() => {
    if (isEditingZoomArea) {
      setIsEditingZoomArea(false);
      setSelectionStart(null);
      setCurrentSelection(null);
      setZoomAreaDragMode('none');
      setZoomAreaDragStart(null);
    }
  }, [selectedZoomSegment]);

  // Seek video to the center of the selected segment
  useEffect(() => {
    console.log('🎯 Zoom segment selection changed:', { selectedZoomSegment, segmentCount: zoomSegments.length });
    
    if (selectedZoomSegment && videoRef.current && zoomSegments.length > 0) {
      const segment = zoomSegments.find(s => s.id === selectedZoomSegment);
      if (segment) {
        const segmentCenter = segment.clickTimestamp || (segment.timestamp + segment.duration / 2);
        console.log(`🎯 SEEKING VIDEO: ${segmentCenter.toFixed(2)}s for segment ${selectedZoomSegment}`);
        console.log(`📹 Video current time before seek: ${videoRef.current.currentTime.toFixed(2)}s`);
        
        // Use the same seeking logic as timeline
        try {
          videoRef.current.currentTime = segmentCenter;
          setCurrentTime(segmentCenter);
          
          // Update playhead manually
          if (playheadRef.current && videoDuration > 0) {
            const percentage = (segmentCenter / videoDuration) * 100;
            playheadRef.current.style.left = `${percentage}%`;
          }
          
          console.log(`📹 Video current time after seek: ${videoRef.current.currentTime.toFixed(2)}s`);
        } catch (error) {
          console.error('❌ Error seeking to zoom segment:', error);
        }
      } else {
        console.warn(`❌ Segment not found: ${selectedZoomSegment}`);
      }
    } else {
      console.log(`⚠️ Seeking conditions not met:`, {
        selectedZoomSegment,
        hasVideo: !!videoRef.current,
        segmentCount: zoomSegments.length
      });
    }
  }, [selectedZoomSegment, zoomSegments, videoDuration]);

  // Handle ESC key to exit edit mode
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isEditingZoomArea) {
        setIsEditingZoomArea(false);
        setSelectionStart(null);
        setCurrentSelection(null);
        setZoomAreaDragMode('none');
        setZoomAreaDragStart(null);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isEditingZoomArea]);

  // Handle zoom segment position changes from the timeline
  const handleZoomSegmentChange = (segmentId: string, newPosition: number, newWidth: number) => {
    setZoomSegments(prevSegments => {
      const updatedSegments = prevSegments.map(segment => {
        if (segment.id === segmentId) {
          // Convert timeline position back to timestamp
          const newTimestamp = videoDuration > 0 ? (newPosition / 100) * videoDuration : segment.timestamp;
          const newDuration = videoDuration > 0 ? (newWidth / 100) * videoDuration : segment.duration;
          
          // Keep the click at the center of the segment
          const newClickTimestamp = newTimestamp + (newDuration / 2);
          
          console.log(`🔧 Updated zoom segment ${segmentId}: timestamp=${newTimestamp.toFixed(2)}s, duration=${newDuration.toFixed(2)}s, click at center=${newClickTimestamp.toFixed(2)}s`);
          
          return {
            ...segment,
            timestamp: newTimestamp,
            duration: newDuration,
            clickTimestamp: newClickTimestamp
          };
        }
        return segment;
      });
      
      return updatedSegments;
    });
    
    // Force immediate zoom recalculation after a brief delay to ensure state is updated
    setTimeout(() => {
      console.log('🔧 Forcing zoom effect recalculation after segment change...');
      checkAndApplyZoomEffect();
    }, 50);
  };

  useEffect(() => {
    const video = videoRef.current;
    if (video) {
      const handleLoadedMetadata = () => {
        setVideoDuration(video.duration);
        console.log('📼 Video metadata loaded:', {
          duration: video.duration,
          currentSrc: video.currentSrc,
          videoWidth: video.videoWidth,
          videoHeight: video.videoHeight,
          seekable: video.seekable.length > 0 ? 
            `${video.seekable.start(0)}-${video.seekable.end(0)}` : 'none'
        });
      };
      const handleTimeUpdate = () => {
        if (!isScrubbing) {
          setCurrentTime(video.currentTime);
        }
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
    if (playheadRef.current && videoDuration > 0 && !isScrubbing) {
      const percentage = (currentTime / videoDuration) * 100;
      playheadRef.current.style.left = `${percentage}%`;
    } else if (playheadRef.current && !isScrubbing) {
      playheadRef.current.style.left = `0%`;
    }
  }, [currentTime, videoDuration, isScrubbing]);

  const handleTimelineInteraction = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!timelineRef.current || !videoRef.current || videoDuration === 0) {
      console.log('⚠️ Timeline interaction blocked:', {
        hasTimeline: !!timelineRef.current,
        hasVideo: !!videoRef.current,
        videoDuration
      });
      return;
    }
    
    const timelineRect = timelineRef.current.getBoundingClientRect();
    const clickX = event.clientX - timelineRect.left;
    let newTimeFraction = clickX / timelineRect.width;

    newTimeFraction = Math.max(0, Math.min(1, newTimeFraction));

    const newTime = newTimeFraction * videoDuration;
    const oldTime = videoRef.current.currentTime;
    
    console.log(`🎬 Timeline click:`, {
      newTime: newTime.toFixed(2),
      oldTime: oldTime.toFixed(2),
      percentage: (newTimeFraction * 100).toFixed(1),
      videoDuration,
      videoReadyState: videoRef.current.readyState,
      videoNetworkState: videoRef.current.networkState,
      seekable: videoRef.current.seekable.length > 0 ? 
        `${videoRef.current.seekable.start(0)}-${videoRef.current.seekable.end(0)}` : 'none',
      videoSrc: videoRef.current.src,
      duration: videoRef.current.duration,
      buffered: videoRef.current.buffered.length > 0 ? 
        `${videoRef.current.buffered.start(0)}-${videoRef.current.buffered.end(0)}` : 'none'
    });
    
    // Try to seek
    try {
      // Check if video is ready for seeking
      if (videoRef.current.readyState < 2) {
        console.warn('⚠️ Video not ready for seeking, readyState:', videoRef.current.readyState);
        return;
      }
      
      // Check if video supports seeking
      if (videoRef.current.seekable.length === 0 || 
          (videoRef.current.seekable.length > 0 && videoRef.current.seekable.end(0) === 0)) {
        console.warn('⚠️ Video does not support seeking. Seekable range:', 
          videoRef.current.seekable.length > 0 ? 
          `${videoRef.current.seekable.start(0)}-${videoRef.current.seekable.end(0)}` : 'none');
        
        // Try to force video to reload and become seekable
        const currentSrc = videoRef.current.src;
        videoRef.current.load();
        
        // Try seeking after a delay
        setTimeout(() => {
          if (videoRef.current && videoRef.current.readyState >= 2) {
            console.log('🔄 Retrying seek after reload...');
            try {
              videoRef.current.currentTime = newTime;
              setCurrentTime(newTime);
              
              if (playheadRef.current) {
                const percentage = (newTimeFraction * 100);
                playheadRef.current.style.left = `${percentage}%`;
              }
            } catch (error) {
              console.error('❌ Seek failed even after reload:', error);
            }
          }
        }, 500);
        
        return;
      }
      
      // Add seeking event listeners temporarily
      const onSeeking = () => console.log('🔄 Video seeking...');
      const onSeeked = () => console.log('✅ Video seeked!');
      const onError = (e: Event) => console.error('❌ Video error:', e);
      
      videoRef.current.addEventListener('seeking', onSeeking);
      videoRef.current.addEventListener('seeked', onSeeked);
      videoRef.current.addEventListener('error', onError);
      
      // Pause video before seeking to prevent conflicts
      const wasPlaying = !videoRef.current.paused;
      if (wasPlaying) {
        videoRef.current.pause();
      }
      
      // Force a slight delay before seeking
      setTimeout(() => {
        if (!videoRef.current) return;
        
        videoRef.current.currentTime = newTime;
        setCurrentTime(newTime);
        
        // Manually update playhead for immediate visual feedback
        if (playheadRef.current) {
          const percentage = (newTimeFraction * 100);
          playheadRef.current.style.left = `${percentage}%`;
        }
        
        // Resume playing if it was playing before
        if (wasPlaying) {
          setTimeout(() => {
            videoRef.current?.play().catch(e => console.error('Error resuming play:', e));
          }, 50);
        }
        
        // Clean up event listeners after a delay
        setTimeout(() => {
          videoRef.current?.removeEventListener('seeking', onSeeking);
          videoRef.current?.removeEventListener('seeked', onSeeked);
          videoRef.current?.removeEventListener('error', onError);
          
          // Check if seek actually worked
          if (videoRef.current) {
            console.log(`📹 After seek check:`, {
              expectedTime: newTime.toFixed(2),
              actualTime: videoRef.current.currentTime.toFixed(2),
              seekWorked: Math.abs(videoRef.current.currentTime - newTime) < 0.1
            });
          }
        }, 1000);
      }, 10);
    } catch (error) {
      console.error('❌ Error seeking video:', error);
    }
  };

  const handleTimelineMouseDown = (event: React.MouseEvent<HTMLDivElement>) => {
    console.log('📍 Timeline mouse down', { target: event.target, currentTarget: event.currentTarget });
    
    const startX = event.clientX;
    const startTime = Date.now();
    let hasMoved = false;
    
    // Handle the initial click
    handleTimelineInteraction(event);
    
    const handleGlobalMouseMove = (e: MouseEvent) => {
      const deltaX = Math.abs(e.clientX - startX);
      if (deltaX > 3) {
        hasMoved = true;
        setIsDragging(true);
        setIsScrubbing(true);
      }
      
      if (hasMoved && timelineRef.current && videoRef.current && videoDuration > 0) {
        const timelineRect = timelineRef.current.getBoundingClientRect();
        const clickX = e.clientX - timelineRect.left;
        let newTimeFraction = clickX / timelineRect.width;
        
        newTimeFraction = Math.max(0, Math.min(1, newTimeFraction));
        
        const newTime = newTimeFraction * videoDuration;
        videoRef.current.currentTime = newTime;
        setCurrentTime(newTime);
      }
    };
    
    const handleGlobalMouseUp = () => {
      const clickDuration = Date.now() - startTime;
      console.log('📍 Timeline mouse up', { hasMoved, clickDuration });
      
      setIsScrubbing(false);
      setIsDragging(false);
      
      document.removeEventListener('mousemove', handleGlobalMouseMove);
      document.removeEventListener('mouseup', handleGlobalMouseUp);
    };
    
    document.addEventListener('mousemove', handleGlobalMouseMove);
    document.addEventListener('mouseup', handleGlobalMouseUp);
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

  // Video selection handlers for zoom area
  const getZoomAreaClickMode = (clickX: number, clickY: number, area: { x: number; y: number; width: number; height: number }) => {
    const handleSize = 5; // 5% of video size for corner handles
    
    // Check if click is within the area bounds
    const inArea = clickX >= area.x && clickX <= area.x + area.width && 
                   clickY >= area.y && clickY <= area.y + area.height;
    
    if (!inArea) return 'create';
    
    // Check corners first (higher priority)
    if (clickX <= area.x + handleSize && clickY <= area.y + handleSize) return 'resize-tl';
    if (clickX >= area.x + area.width - handleSize && clickY <= area.y + handleSize) return 'resize-tr';
    if (clickX <= area.x + handleSize && clickY >= area.y + area.height - handleSize) return 'resize-bl';
    if (clickX >= area.x + area.width - handleSize && clickY >= area.y + area.height - handleSize) return 'resize-br';
    
    // If in area but not on corners, it's a move
    return 'move';
  };

  const handleVideoMouseDown = (e: React.MouseEvent<HTMLVideoElement>) => {
    if (!isEditingZoomArea || !selectedZoomSegment) return;
    
    const video = e.currentTarget;
    const rect = video.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    
    const existingArea = zoomAreas[selectedZoomSegment];
    const clickMode = existingArea ? getZoomAreaClickMode(x, y, existingArea) : 'create';
    
    setZoomAreaDragMode(clickMode);
    setZoomAreaDragStart({ x, y, originalArea: existingArea ? { ...existingArea } : undefined });
    
    if (clickMode === 'create') {
      setSelectionStart({ x, y });
      setCurrentSelection({ x, y, width: 0, height: 0 });
    } else {
      setCurrentSelection(existingArea ? { ...existingArea } : null);
    }
  };

  const handleVideoMouseMove = (e: React.MouseEvent<HTMLVideoElement>) => {
    if (!isEditingZoomArea || !zoomAreaDragStart || !selectedZoomSegment) return;
    
    const video = e.currentTarget;
    const rect = video.getBoundingClientRect();
    const currentX = ((e.clientX - rect.left) / rect.width) * 100;
    const currentY = ((e.clientY - rect.top) / rect.height) * 100;
    
    const deltaX = currentX - zoomAreaDragStart.x;
    const deltaY = currentY - zoomAreaDragStart.y;
    
    if (zoomAreaDragMode === 'create') {
      const selection = {
        x: Math.min(zoomAreaDragStart.x, currentX),
        y: Math.min(zoomAreaDragStart.y, currentY),
        width: Math.abs(currentX - zoomAreaDragStart.x),
        height: Math.abs(currentY - zoomAreaDragStart.y)
      };
      setCurrentSelection(selection);
    } else if (zoomAreaDragMode === 'move' && zoomAreaDragStart.originalArea) {
      const newArea = {
        x: Math.max(0, Math.min(100 - zoomAreaDragStart.originalArea.width, zoomAreaDragStart.originalArea.x + deltaX)),
        y: Math.max(0, Math.min(100 - zoomAreaDragStart.originalArea.height, zoomAreaDragStart.originalArea.y + deltaY)),
        width: zoomAreaDragStart.originalArea.width,
        height: zoomAreaDragStart.originalArea.height
      };
      setCurrentSelection(newArea);
    } else if (zoomAreaDragMode.startsWith('resize-') && zoomAreaDragStart.originalArea) {
      const orig = zoomAreaDragStart.originalArea;
      let newArea = { ...orig };
      
      switch (zoomAreaDragMode) {
        case 'resize-tl':
          newArea.x = Math.max(0, Math.min(orig.x + orig.width - 5, orig.x + deltaX));
          newArea.y = Math.max(0, Math.min(orig.y + orig.height - 5, orig.y + deltaY));
          newArea.width = orig.width - (newArea.x - orig.x);
          newArea.height = orig.height - (newArea.y - orig.y);
          break;
        case 'resize-tr':
          newArea.y = Math.max(0, Math.min(orig.y + orig.height - 5, orig.y + deltaY));
          newArea.width = Math.max(5, Math.min(100 - orig.x, orig.width + deltaX));
          newArea.height = orig.height - (newArea.y - orig.y);
          break;
        case 'resize-bl':
          newArea.x = Math.max(0, Math.min(orig.x + orig.width - 5, orig.x + deltaX));
          newArea.width = orig.width - (newArea.x - orig.x);
          newArea.height = Math.max(5, Math.min(100 - orig.y, orig.height + deltaY));
          break;
        case 'resize-br':
          newArea.width = Math.max(5, Math.min(100 - orig.x, orig.width + deltaX));
          newArea.height = Math.max(5, Math.min(100 - orig.y, orig.height + deltaY));
          break;
      }
      setCurrentSelection(newArea);
    }
  };

  const handleVideoMouseUp = () => {
    if (!isEditingZoomArea || !currentSelection || !selectedZoomSegment) return;
    
    // Save the selection if it's large enough
    if (currentSelection.width > 1 && currentSelection.height > 1) {
      setZoomAreas(prev => ({
        ...prev,
        [selectedZoomSegment]: currentSelection
      }));
    }
    
    // Reset drag state
    setZoomAreaDragMode('none');
    setZoomAreaDragStart(null);
    setSelectionStart(null);
    
    // Keep current selection visible briefly
    setTimeout(() => setCurrentSelection(null), 100);
  };

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Top Bar */}
      <div className="border-b border-gray-200/80 bg-white/80 backdrop-blur-xl flex items-center justify-between px-8 py-4">
        <div className="flex items-center gap-6">
          <button onClick={() => { console.log('VideoEditorView: Back button clicked'); handleGoToHome(); }} className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-xl transition-all duration-200">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="font-medium text-gray-900 tracking-tight">Back</div>
        </div>

        <div className="flex items-center gap-4">
          <button 
            onClick={() => {
              // Prepare zoom data for export
              const exportData = {
                videoUrl: recordingUrl,
                zoomSegments: zoomSegments,
                zoomAreas: zoomAreas,
                videoDuration: videoDuration
              };
              console.log('Export data prepared:', exportData);
              // TODO: Implement video export with zoom effects
              // This will require server-side video processing using FFmpeg or similar
              handlePublish();
            }} 
            className="bg-black text-white px-6 py-3 rounded-xl hover:bg-gray-800 transition-all duration-200 font-medium tracking-tight shadow-lg shadow-black/10"
          >
            Publish
          </button>
          <button className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-xl transition-all duration-200">
            <MoreHorizontal className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Video Preview Area */}
        <div className="flex-1 bg-white/40 backdrop-blur-sm flex items-center justify-center p-8 overflow-auto">
          <div className="relative w-full h-full max-w-full max-h-full">
            {recordingUrl ? (
              <>
                <video 
                  ref={videoRef}
                  src={recordingUrl} 
                  className={`w-full h-full max-w-full max-h-full rounded-lg shadow-lg bg-black object-contain transition-transform duration-500 ease-in-out ${
                    isEditingZoomArea ? 'cursor-crosshair' : 'cursor-pointer'
                  }`}
                  style={{
                    transform: currentZoomEffect.active 
                      ? `scale(${currentZoomEffect.scale})`
                      : 'scale(1)',
                    transformOrigin: currentZoomEffect.active 
                      ? `${currentZoomEffect.x}% ${currentZoomEffect.y}%`
                      : 'center center'
                  }}
                  onDoubleClick={togglePlayPause}
                  onClick={(e) => {
                    e.stopPropagation();
                  }}
                  onMouseDown={handleVideoMouseDown}
                  onMouseMove={handleVideoMouseMove}
                  onMouseUp={handleVideoMouseUp}
                />
                
                {/* Selection Overlay */}
                {isEditingZoomArea && currentSelection && (
                  <div 
                    className="absolute border-2 border-blue-500 bg-blue-200 bg-opacity-30 pointer-events-none"
                    style={{
                      left: `${currentSelection.x}%`,
                      top: `${currentSelection.y}%`,
                      width: `${currentSelection.width}%`,
                      height: `${currentSelection.height}%`,
                    }}
                  >
                    {/* Corner resize handles */}
                    {zoomAreaDragMode !== 'create' && (
                      <>
                        <div className="absolute w-3 h-3 bg-blue-500 border border-white -top-1 -left-1 cursor-nw-resize" />
                        <div className="absolute w-3 h-3 bg-blue-500 border border-white -top-1 -right-1 cursor-ne-resize" />
                        <div className="absolute w-3 h-3 bg-blue-500 border border-white -bottom-1 -left-1 cursor-sw-resize" />
                        <div className="absolute w-3 h-3 bg-blue-500 border border-white -bottom-1 -right-1 cursor-se-resize" />
                      </>
                    )}
                  </div>
                )}
                
                {/* Saved Selection Overlay */}
                {isEditingZoomArea && selectedZoomSegment && zoomAreas[selectedZoomSegment] && !currentSelection && (
                  <div 
                    className="absolute border-2 border-green-500 bg-green-200 bg-opacity-20 pointer-events-none"
                    style={{
                      left: `${zoomAreas[selectedZoomSegment].x}%`,
                      top: `${zoomAreas[selectedZoomSegment].y}%`,
                      width: `${zoomAreas[selectedZoomSegment].width}%`,
                      height: `${zoomAreas[selectedZoomSegment].height}%`,
                    }}
                  >
                    {/* Corner resize handles for saved selection */}
                    <div className="absolute w-3 h-3 bg-green-500 border border-white -top-1 -left-1 cursor-nw-resize" />
                    <div className="absolute w-3 h-3 bg-green-500 border border-white -top-1 -right-1 cursor-ne-resize" />
                    <div className="absolute w-3 h-3 bg-green-500 border border-white -bottom-1 -left-1 cursor-sw-resize" />
                    <div className="absolute w-3 h-3 bg-green-500 border border-white -bottom-1 -right-1 cursor-se-resize" />
                    
                    {/* Move indicator in center */}
                    <div className="absolute top-1/2 left-1/2 w-6 h-6 -mt-3 -ml-3 bg-green-500 bg-opacity-70 rounded-full cursor-move flex items-center justify-center">
                      <div className="w-2 h-2 bg-white rounded-full" />
                    </div>
                  </div>
                )}
              </>
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
        </div>

        {/* Right Sidebar - Simplified */}
        <div className="w-80 flex flex-col border-l border-gray-200/80 bg-white/60 backdrop-blur-xl">
          <div className="flex-1 overflow-y-auto">
            {/* Zoom Control Section */}
            <div className="p-6 border-b border-gray-200/80">
              <h3 className="font-semibold text-gray-900 mb-4 tracking-tight">Zoom Controls</h3>
              
              {/* Zoom Segment Selector */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Zoom Segment:
                </label>
                <select 
                  value={selectedZoomSegment || ''} 
                  onChange={(e) => setSelectedZoomSegment(e.target.value || null)}
                  className="w-full p-2 border border-gray-300 rounded-lg text-sm"
                >
                  <option value="">No segment selected</option>
                  {zoomSegments.map((segment) => (
                    <option key={segment.id} value={segment.id}>
                      {segment.label} (at {formatTime(segment.clickTimestamp || segment.timestamp + segment.duration/2)})
                    </option>
                  ))}
                </select>
              </div>

              {/* Zoom Segment Controls - Only show when segment is selected */}
              {selectedZoomSegment && (
                <div className="space-y-4 border-t border-gray-200 pt-4">
                  {/* Segment Info Display */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Segment Information:
                    </label>
                    <div className="text-sm text-gray-600 bg-gray-50 p-2 rounded">
                      {(() => {
                        const segment = zoomSegments.find(s => s.id === selectedZoomSegment);
                        if (!segment) return '';
                        const startTime = segment.timestamp;
                        const endTime = segment.timestamp + segment.duration;
                        return (
                          <div className="space-y-1">
                            <div>Duration: <span className="font-medium">{segment.duration.toFixed(1)}s</span></div>
                            <div>Time: <span className="font-medium">{formatTime(startTime)} - {formatTime(endTime)}</span></div>
                            <div className="text-xs text-blue-600 mt-1">
                              💡 Drag the edges of the segment in the timeline below to resize
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  </div>

                  {/* Edit Zoom Area */}
                  {recordingUrl && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Zoom Area:
                      </label>
                      <div className="space-y-2">
                        <button
                          onClick={() => setIsEditingZoomArea(!isEditingZoomArea)}
                          className={`w-full py-2 px-3 rounded-lg font-medium transition-colors ${
                            isEditingZoomArea 
                              ? 'bg-red-500 text-white hover:bg-red-600' 
                              : 'bg-blue-500 text-white hover:bg-blue-600'
                          }`}
                        >
                          {isEditingZoomArea ? 'Done Selecting' : 'Edit Zoom Area'}
                        </button>
                        {isEditingZoomArea && (
                          <div className="text-sm text-blue-600 bg-blue-50 p-2 rounded">
                            Click and drag on video to create new area, or drag existing area to move/resize
                          </div>
                        )}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        Current area: {zoomAreas[selectedZoomSegment] ? 
                          `${Math.round(zoomAreas[selectedZoomSegment].x)}%, ${Math.round(zoomAreas[selectedZoomSegment].y)}% - ${Math.round(zoomAreas[selectedZoomSegment].width)}×${Math.round(zoomAreas[selectedZoomSegment].height)}%` :
                          'Using default click position'
                        }
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Help Text when no segment selected */}
              {!selectedZoomSegment && zoomSegments.length > 0 && (
                <div className="text-sm text-gray-500 bg-gray-50 p-3 rounded-lg">
                  Select a zoom segment above to edit its focus area. Drag segment edges in the timeline to resize.
                </div>
              )}

              {/* No segments message */}
              {zoomSegments.length === 0 && (
                <div className="text-sm text-gray-500 bg-gray-50 p-3 rounded-lg">
                  No zoom segments available. Record a video with click interactions to see zoom effects.
                </div>
              )}
            </div>

            {/* Chat Interface */}
            <div className="p-6">
              <textarea
                placeholder="Ask Glimpse to edit this video..."
                className="w-full p-3 border border-blue-200 rounded-xl outline-none text-sm resize-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white bg-opacity-90"
                rows={3}
              />
              <div className="flex justify-end mt-3">
                <button
                  type="button"
                  className="px-4 py-2 rounded-xl bg-blue-500 hover:bg-blue-600 text-white transition-colors font-semibold shadow-lg flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Timeline Area */}
      <div className="bg-white bg-opacity-90 backdrop-blur-sm border-t border-blue-200 p-4 flex flex-col gap-4">
        {/* Timeline Header with Time Markers */}
        <div className="relative h-6">
          {/* Time markers */}
          <div className="absolute inset-0 flex justify-between items-start text-xs text-gray-600">
            {Array.from({ length: Math.ceil(videoDuration / 5) + 1 }).map((_, index) => {
              const time = index * 5;
              if (time <= videoDuration) {
                return (
                  <div key={time} className="flex flex-col items-center">
                    <div className="w-px h-2 bg-blue-300 mb-1"></div>
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
            className="h-12 bg-gradient-to-r from-blue-400 to-blue-500 rounded-xl relative cursor-pointer shadow-lg"
            onMouseDown={handleTimelineMouseDown}
          >
            {/* Timeline info overlay */}
            <div className="absolute inset-0 flex items-center justify-center text-white font-medium text-sm pointer-events-none">
              {Math.round(videoDuration)}s ⚡ {currentZoomEffect.active ? `${currentZoomEffect.scale.toFixed(1)}x` : '1x'}
              {currentZoomEffect.active && <span className="ml-1 text-yellow-300">🔍</span>}
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
        <div className="relative h-16 bg-blue-100 bg-opacity-60 rounded-xl p-2">
          <div className="flex gap-2 h-full">
            {/* Dynamic zoom segments generated from click data */}
            {zoomSegments.length > 0 ? (
              zoomSegments.map((segment, index) => {
                // Calculate position and width based on video duration and timestamp
                const positionPercent = videoDuration > 0 ? (segment.timestamp / videoDuration) * 100 : 0;
                const widthPercent = videoDuration > 0 ? (segment.duration / videoDuration) * 100 : 10;
                
                return (
                  <ZoomSegment 
                    key={segment.id}
                    duration={`${segment.duration.toFixed(1)}s`} 
                    label={segment.label} 
                    position={Math.min(positionPercent, 100 - widthPercent)} 
                    width={Math.min(widthPercent, 30)}
                    id={segment.id}
                    isSelected={selectedZoomSegment === segment.id}
                    onPositionChange={handleZoomSegmentChange}
                    onSelect={(id) => {
                      console.log(`🔧 Main onSelect called with id: ${id}`);
                      setSelectedZoomSegment(id);
                    }}
                    onPreviewZoom={previewZoomEffect}
                    onStopPreview={() => setCurrentZoomEffect({ active: false, x: 0, y: 0, scale: 1 })}
                  />
                );
              })
            ) : (
              /* Fallback sample zoom segments if no click data is available */
              <>
                <ZoomSegment 
                  duration="2.2x" 
                  label="Auto" 
                  position={0} 
                  width={25}
                  id="zoom-0"
                  isSelected={selectedZoomSegment === 'zoom-0'}
                  onPositionChange={handleZoomSegmentChange}
                  onSelect={(id) => {
                    console.log(`🔧 Fallback onSelect called with id: ${id}`);
                    setSelectedZoomSegment(id);
                  }}
                  onPreviewZoom={previewZoomEffect}
                  onStopPreview={() => setCurrentZoomEffect({ active: false, x: 0, y: 0, scale: 1 })}
                />
                <ZoomSegment 
                  duration="2.2x" 
                  label="Auto" 
                  position={27} 
                  width={25}
                  id="zoom-1"
                  isSelected={selectedZoomSegment === 'zoom-1'}
                  onPositionChange={handleZoomSegmentChange}
                  onSelect={(id) => {
                    console.log(`🔧 Fallback onSelect called with id: ${id}`);
                    setSelectedZoomSegment(id);
                  }}
                  onPreviewZoom={previewZoomEffect}
                  onStopPreview={() => setCurrentZoomEffect({ active: false, x: 0, y: 0, scale: 1 })}
                />
                <ZoomSegment 
                  duration="2.0x" 
                  label="Auto" 
                  position={54} 
                  width={20}
                  id="zoom-2"
                  isSelected={selectedZoomSegment === 'zoom-2'}
                  onPositionChange={handleZoomSegmentChange}
                  onSelect={(id) => {
                    console.log(`🔧 Fallback onSelect called with id: ${id}`);
                    setSelectedZoomSegment(id);
                  }}
                  onPreviewZoom={previewZoomEffect}
                  onStopPreview={() => setCurrentZoomEffect({ active: false, x: 0, y: 0, scale: 1 })}
                />
                <ZoomSegment 
                  duration="1.5x" 
                  label="Auto" 
                  position={76} 
                  width={22}
                  id="zoom-3"
                  isSelected={selectedZoomSegment === 'zoom-3'}
                  onPositionChange={handleZoomSegmentChange}
                  onSelect={(id) => {
                    console.log(`🔧 Fallback onSelect called with id: ${id}`);
                    setSelectedZoomSegment(id);
                  }}
                  onPreviewZoom={previewZoomEffect}
                  onStopPreview={() => setCurrentZoomEffect({ active: false, x: 0, y: 0, scale: 1 })}
                />
              </>
            )}
          </div>
        </div>

        {/* Timeline Controls */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => skipTime(-5)} className="p-2 hover:bg-blue-200 hover:bg-opacity-60 rounded-xl text-gray-600 hover:text-blue-700 transition-colors">
              <SkipBack size={20} />
            </button>
            <button onClick={togglePlayPause} className="p-2 hover:bg-blue-200 hover:bg-opacity-60 rounded-xl text-gray-600 hover:text-blue-700 transition-colors">
              {isPlaying ? (
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="6" y="4" width="4" height="16"></rect>
                  <rect x="14" y="4" width="4" height="16"></rect>
                </svg>
              ) : (
                <Play size={20} />
              )}
            </button>
            <button onClick={() => skipTime(5)} className="p-2 hover:bg-blue-200 hover:bg-opacity-60 rounded-xl text-gray-600 hover:text-blue-700 transition-colors">
              <SkipForward size={20} />
            </button>
          </div>
          
          <div className="text-sm text-gray-600 font-mono">
            {formatTime(currentTime)} / {formatTime(videoDuration)}
          </div>
          
          <div className="flex items-center gap-3">
            <button className="p-2 hover:bg-blue-200 hover:bg-opacity-60 rounded-xl text-gray-600 hover:text-blue-700 transition-colors">
              <ZoomOut size={18} />
            </button>
            <input
              type="range"
              min="0"
              max="100"
              defaultValue="50"
              className="w-24 h-1 bg-blue-200 rounded-lg appearance-none cursor-pointer accent-blue-500"
            />
            <button className="p-2 hover:bg-blue-200 hover:bg-opacity-60 rounded-xl text-gray-600 hover:text-blue-700 transition-colors">
              <ZoomIn size={18} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}; 