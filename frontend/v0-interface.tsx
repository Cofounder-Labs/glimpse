"use client"

import React, { useState, useEffect, useMemo } from "react"
import { PageState, type Team, type Slide as SlideType, type Demo } from "./components/types"
import { HomePage } from "./components/HomePage"
import { LoadingView } from "./components/LoadingView"
import { EditorView } from "./components/EditorView"
import { PublishedView } from "./components/PublishedView"
import { VideoEditorView } from "./components/VideoEditorView"

export default function V0Interface() {
  const [inputText, setInputText] = useState("")
  const [submittedText, setSubmittedText] = useState("")
  const [currentPage, setCurrentPage] = useState<PageState>(PageState.Home)
  const [loadingText, setLoadingText] = useState("Glimpse agent is now loading")
  const [loadingDots, setLoadingDots] = useState("")
  const [activeSlide, setActiveSlide] = useState(0)
  const [jobId, setJobId] = useState<string | null>(null)
  const [selectedBgColor, setSelectedBgColor] = useState("bg-gradient-to-b from-purple-600 to-purple-200")
  const [artifactPath, setArtifactPath] = useState<string | null>(null)
  const [screenshotsList, setScreenshotsList] = useState<string[]>([])
  const [demoType, setDemoType] = useState<"video" | "interactive demo">("video")
  const [intendedEditorType, setIntendedEditorType] = useState<"video" | "interactive demo">("video")
  const [recordingUrl, setRecordingUrl] = useState<string | null>(null)
  const [clickData, setClickData] = useState<any[] | null>(null)

  // Define teams data
  const teams: Team[] = [
    { id: "free-run", name: "Free Run", logo: "/free-run.png", imageCount: 0 },
    { id: "browser-use", name: "Team Browser Use", logo: "/browser-use.png", imageCount: 5 },
    { id: "github", name: "GitHub for Education", logo: "/github.png", imageCount: 4 },
    { id: "storylane", name: "Storylane", logo: "/storylane.png", imageCount: 3 },
    { id: "glimpse", name: "Team Glimpse", logo: "/glimpse.png", imageCount: 3 },
    { id: "databricks", name: "Databricks", logo: "/databricks.png", imageCount: 4 },
  ];

  // State for selected team
  const [selectedTeam, setSelectedTeam] = useState<Team>(teams[0]);

  // Add effect to set mock mode on initial load
  useEffect(() => {
    // Only run when on the HomePage
    if (currentPage === PageState.Home) {
      if (selectedTeam.id === "databricks") {
        console.log("Databricks team selected on HomePage. Skipping mock mode API call.");
        return;
      }

      const teamIndex = teams.findIndex(t => t.id === selectedTeam.id);
      let mockModeToSet: number | null = null;

      if (teamIndex !== -1) {
        mockModeToSet = teamIndex;
      } else {
        console.error("Selected team not found on HomePage. Cannot set mock mode via API.");
        return;
      }

      const setActiveMockMode = async () => {
        try {
          const response = await fetch("http://127.0.0.1:8000/set-active-mock-mode", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ mock_mode: mockModeToSet }),
          });

          if (!response.ok) {
            const errorBody = await response.text();
            console.error(
              `API Error setting mock mode to ${mockModeToSet} on HomePage:`,
              response.status,
              errorBody
            );
          } else {
            const responseData = await response.json();
            console.log(`Mock mode set to ${mockModeToSet} successfully on HomePage:`, responseData);
          }
        } catch (error) {
          console.error(`Network or other error setting mock mode to ${mockModeToSet} on HomePage:`, error);
        }
      };

      setActiveMockMode();
    }
  }, [currentPage, selectedTeam, teams]);

  // Dynamically generate slides using useMemo for stability
  const slides: SlideType[] = useMemo(() => {
    console.log("useMemo recalculating slides. Team:", selectedTeam.id, "ArtifactPath:", artifactPath, "ScreenshotsList Length:", screenshotsList.length);
    if (selectedTeam.id === "free-run" && screenshotsList.length > 0) {
      return screenshotsList.map((screenshotNameOrPath, i) => {
        let imageSrc = screenshotNameOrPath;
        if (artifactPath && typeof artifactPath === 'string' && artifactPath.trim() !== '' && !screenshotNameOrPath.startsWith('http') && !screenshotNameOrPath.startsWith('/')) {
          imageSrc = `/${artifactPath.trim()}/${screenshotNameOrPath}`;
        } else if (!artifactPath || artifactPath.trim() === '') {
          console.warn(` artifactPath is missing or empty for Free Run slide ${i + 1}. Using screenshot path directly: ${screenshotNameOrPath}`);
        }
        return {
          id: i,
          title: `Free Run - Step ${i + 1}`,
          content: imageSrc,
        };
      });
    }
    return Array.from({ length: selectedTeam.imageCount }, (_, i) => ({
      id: i,
      title: `${selectedTeam.name} - Slide ${i + 1}`,
      content: `/${selectedTeam.id}/${i + 1}.png`,
    }));
  }, [selectedTeam, artifactPath, screenshotsList]);

  // useEffect to sync activeSlide with slides array boundaries
  useEffect(() => {
    console.log(`useEffect (ActiveSlide Boundary Check) triggered. activeSlide: ${activeSlide}, slides.length: ${slides.length}`);
    if (slides.length > 0) {
      if (activeSlide >= slides.length) {
        console.warn(`Active slide ${activeSlide} is out of bounds (max ${slides.length - 1}). Resetting to slide 0.`);
        setActiveSlide(0);
      }
    } else {
      if (activeSlide !== 0) {
        console.warn(`No slides available, but activeSlide is ${activeSlide}. Resetting to slide 0.`);
        setActiveSlide(0);
      }
    }
  }, [slides, activeSlide, setActiveSlide]);

  // Previous demos data
  const previousDemos: Demo[] = [
    {
      title: "E-commerce Dashboard",
      description: "Interactive sales analytics with real-time data",
      image: "/placeholder.svg?height=200&width=300",
    },
    {
      title: "AI Content Generator",
      description: "Smart content creation tool for marketing teams",
      image: "/placeholder.svg?height=200&width=300",
    },
    {
      title: "Customer Portal",
      description: "Self-service portal with account management",
      image: "/placeholder.svg?height=200&width=300",
    },
  ]

  useEffect(() => {
    if (currentPage !== PageState.Loading) {
      setLoadingText("Glimpse agent is now loading")
      setLoadingDots("")
      return
    }

    const thinkingSteps = [
      "Glimpse agent is now loading",
      "Analyzing request",
      "Generating content",
      "Preparing preview",
    ]

    let currentStep = 0
    const stepInterval = setInterval(() => {
      setLoadingText(thinkingSteps[currentStep % thinkingSteps.length])
      currentStep++
    }, 800)

    const dotsInterval = setInterval(() => {
      setLoadingDots((prev) => {
        if (prev === "...") return ""
        return prev + "."
      })
    }, 300)

    return () => {
      clearInterval(stepInterval)
      clearInterval(dotsInterval)
    }
  }, [currentPage])

  useEffect(() => {
    if (currentPage === PageState.Loading && jobId) {
      const wsUrl = `ws://127.0.0.1:8000/ws/job-status/${jobId}`
      const ws = new WebSocket(wsUrl)

      ws.onopen = () => {
        console.log(`WebSocket connection established to ${wsUrl}`)
      }

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data as string)
          console.log("WebSocket message received:", message)

          if (message.job_id === jobId) {
            if (message.status === "completed") {
              if (selectedTeam.id === "free-run") {
                console.log("Job completed for Free Run. Fetching artifact details...");
                const fetchJobDetails = async () => {
                  try {
                    const res = await fetch(`http://127.0.0.1:8000/demo-status/${jobId}`);
                    if (res.ok) {
                      const jobDetails = await res.json();
                      console.log("Fetched jobDetails for Free Run (raw):", JSON.stringify(jobDetails, null, 2));

                      setArtifactPath(jobDetails.artifact_path || null);
                      setScreenshotsList(jobDetails.screenshots || []);
                      setClickData(jobDetails.click_data || null);

                      if (intendedEditorType === "video") {
                        if (jobDetails.recording_path) {
                          setRecordingUrl(jobDetails.recording_path);
                          console.log("Free Run recording URL set via fetchJobDetails:", jobDetails.recording_path);
                          if (jobDetails.click_data) {
                            console.log("Free Run click data received:", jobDetails.click_data.length, "clicks");
                          }
                        } else {
                          console.error("Free Run (video mode) completed, but no recording_path found in jobDetails.");
                          setCurrentPage(PageState.Home);
                        }
                      } else if (intendedEditorType === "interactive demo") {
                        if (jobDetails.screenshots && jobDetails.screenshots.length > 0) {
                          console.log("Free Run (interactive demo mode): Screenshots received. artifact_path:", jobDetails.artifact_path || "N/A", "screenshots count:", jobDetails.screenshots.length, ". Proceeding to editor.");
                        } else {
                          console.error("Free Run (interactive demo mode) completed, but no (or empty) screenshots list was found in jobDetails.");
                          setCurrentPage(PageState.Home);
                        }
                      }
                    } else {
                      console.error("Failed to fetch job details for Free Run artifacts, status:", res.status);
                      setCurrentPage(PageState.Home);
                    }
                  } catch (fetchError) {
                    console.error("Error fetching final job details for Free Run artifacts:", fetchError);
                    setCurrentPage(PageState.Home);
                  } finally {
                    ws.close();
                  }
                };
                fetchJobDetails();
              } else {
                console.log("Job completed for non-Free Run. Transitioning based on intendedEditorType:", intendedEditorType);
                if (intendedEditorType === "video") {
                  if (message.recording_path) {
                    // Set click data if available in the message
                    if (message.click_data) {
                      setClickData(message.click_data);
                      console.log("Click data received for video:", message.click_data.length, "clicks");
                    }
                    
                    // Apply cache-busting for non-free-roam teams to ensure latest video is loaded
                    const teamFolderMap: { [key: string]: string } = {
                      "browser-use": "browser-use",
                      "github": "github", 
                      "storylane": "storylane",
                      "glimpse": "glimpse",
                      "databricks": "databricks"
                    };
                    const folderName = teamFolderMap[selectedTeam.id];
                    if (folderName) {
                      const cacheBustingUrl = `http://127.0.0.1:8000/public/${folderName}/demo.mp4?t=${new Date().getTime()}`;
                      setRecordingUrl(cacheBustingUrl);
                      console.log("Recording URL set for video editor with cache-busting:", cacheBustingUrl);
                    } else {
                      setRecordingUrl(message.recording_path as string);
                      console.log("Recording URL set for video editor:", message.recording_path);
                    }
                  }
                  setCurrentPage(PageState.VideoEditor);
                } else {
                  setCurrentPage(PageState.Editor);
                }
                ws.close();
              }
            } else if (message.status === "failed") {
              console.error("Job failed:", message.error || "Unknown error from backend")
              setCurrentPage(PageState.Home)
              setJobId(null)
              ws.close()
            } else if (message.status === "processing" || message.status === "queued") {
              console.log(
                `Job status: ${message.status}, Progress: ${message.progress ? (message.progress * 100).toFixed(0) + "%" : "N/A"}`,
              )
            }
          }
        } catch (e) {
          console.error("Error parsing WebSocket message or in onmessage handler:", e)
        }
      }

      ws.onerror = (error) => {
        console.error("WebSocket error:", error)
        setCurrentPage(PageState.Home)
        setJobId(null)
      }

      ws.onclose = (event) => {
        console.log("WebSocket connection closed.", event.code, event.reason)
      }

      return () => {
        if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
          console.log("Closing WebSocket connection due to effect cleanup.")
          ws.close()
        }
      }
    }
  }, [currentPage, jobId, setCurrentPage, setJobId, intendedEditorType])

  // useEffect to transition to Editor for Free Run once artifacts OR recordingUrl are loaded
  useEffect(() => {
    console.log("useEffect (Free Run Transition Check) triggered. currentPage:", PageState[currentPage], "selectedTeam:", selectedTeam.id, "screenshotsList.length:", screenshotsList.length, "recordingUrl:", recordingUrl, "intendedEditorType:", intendedEditorType);

    if (currentPage === PageState.Loading && selectedTeam.id === "free-run") {
      if (intendedEditorType === "video" && recordingUrl) {
        console.log("Free Run (video mode): recordingUrl is set. Transitioning to VideoEditor.");
        setCurrentPage(PageState.VideoEditor);
      } else if (intendedEditorType === "interactive demo" && screenshotsList && screenshotsList.length > 0) {
        console.log("Free Run (interactive demo mode): ScreenshotsList is populated. Transitioning to Editor.");
        setCurrentPage(PageState.Editor);
      }
    }
  }, [currentPage, selectedTeam, screenshotsList, recordingUrl, setCurrentPage, intendedEditorType]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (inputText.trim()) {
      setSubmittedText(inputText);
      setCurrentPage(PageState.Loading);
      setJobId(null); 
      setArtifactPath(null);
      setScreenshotsList([]);
      setIntendedEditorType(demoType);
      setRecordingUrl(null);
      setClickData(null);

      if (selectedTeam.id === "databricks") { 
        console.log(`${selectedTeam.name} team selected. Bypassing backend demo generation. Intended editor: ${demoType}`);
        if (demoType === "video") {
          // Ensure recordingUrl is set for Databricks pre-recorded video
          const teamFolderMap: { [key: string]: string } = {
            "browser-use": "browser-use",
            "github": "github", 
            "storylane": "storylane",
            "glimpse": "glimpse",
            "databricks": "databricks"
          };
          const folderName = teamFolderMap[selectedTeam.id];
          if (folderName) {
            const cacheBustingUrl = `http://127.0.0.1:8000/public/${folderName}/demo.mp4?t=${new Date().getTime()}`;
            setRecordingUrl(cacheBustingUrl);
            console.log(`[handleSubmit] Set recordingUrl for Databricks: ${cacheBustingUrl}`);
          }
        }
        setTimeout(() => {
          console.log(`5-second delay complete. Transitioning for Databricks to ${demoType} editor.`);
          if (demoType === "video") {
            setCurrentPage(PageState.VideoEditor);
          } else {
            setCurrentPage(PageState.Editor);
          }
        }, 5000);
        return;
      }

      try {
        const response = await fetch("http://127.0.0.1:8000/generate-demo", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            nl_task: inputText,
            root_url: selectedTeam.id === "free-run" ? "" : "google.com",
            demo_type: demoType,
          }),
        })

        if (!response.ok) {
          const errorBody = await response.text()
          console.error("API Error creating job:", response.status, errorBody)
          setCurrentPage(PageState.Home)
          return
        }

        const responseData = await response.json()
        console.log("Job created successfully:", responseData)
        if (responseData.job_id) {
          setJobId(responseData.job_id)
        } else {
          console.error("API Error: No job_id received from /generate-demo")
          setCurrentPage(PageState.Home)
        }
      } catch (error) {
        console.error("Network or other error during job creation:", error)
        setCurrentPage(PageState.Home)
      }
    }
  }

  const handleGoToHome = () => {
    console.log('[handleGoToHome] Called. Current PageState:', PageState[currentPage]);
    setCurrentPage(PageState.Home);
    console.log('[handleGoToHome] Set PageState to Home.');
    setActiveSlide(0);
  };

  const handleGoBackToEditor = () => {
    console.log('[handleGoBackToEditor] Called. Current PageState:', PageState[currentPage], 'intendedEditorType:', intendedEditorType);
    if (intendedEditorType === 'video') {
      setCurrentPage(PageState.VideoEditor);
      console.log('[handleGoBackToEditor] Set PageState to VideoEditor.');
    } else {
      setCurrentPage(PageState.Editor);
      console.log('[handleGoBackToEditor] Set PageState to Editor.');
    }
  };

  const handlePublish = () => {
    setCurrentPage(PageState.Published)
  }

  // Handle skip agent - directly go to editor with pre-recorded content
  const handleSkipAgent = () => {
    console.log('[handleSkipAgent] Called for team:', selectedTeam.name);
    setSubmittedText(inputText || `Demo for ${selectedTeam.name}`);
    setIntendedEditorType(demoType);
    
    // For non-free-roam teams, we can use pre-recorded content or mock data
    if (demoType === "video") {
      // Map team IDs to their folder names for pre-recorded videos
      const teamFolderMap: { [key: string]: string } = {
        "browser-use": "browser-use",
        "github": "github", 
        "storylane": "storylane",
        "glimpse": "glimpse",
        "databricks": "databricks"
      };
      
      const folderName = teamFolderMap[selectedTeam.id];
      if (folderName) {
        const cacheBustingUrl = `http://127.0.0.1:8000/public/${folderName}/demo.mp4?t=${new Date().getTime()}`;
        setRecordingUrl(cacheBustingUrl);
        console.log(`[handleSkipAgent] Set recordingUrl: ${cacheBustingUrl}`);
      }
      setCurrentPage(PageState.VideoEditor);
      console.log('[handleSkipAgent] Navigating to VideoEditor with pre-recorded content');
    } else {
      // For interactive demo mode, use mock slides based on the team
      setCurrentPage(PageState.Editor);
      console.log('[handleSkipAgent] Navigating to Editor with mock slides');
    }
  };

  // Conditional rendering for different views
  if (currentPage === PageState.Published) {
    console.log('[V0Interface Render] Rendering PublishedView. intendedEditorType:', intendedEditorType, 'recordingUrl:', recordingUrl);
    return (
      <PublishedView
        submittedText={submittedText}
        slides={slides}
        bgColor={selectedBgColor}
        handleStartNewTask={handleGoToHome}
        intendedEditorType={intendedEditorType}
        recordingUrl={recordingUrl}
        handleGoBackToEditor={handleGoBackToEditor}
        autoPlayVideo={intendedEditorType === 'video'}
      />
    )
  }

  if (currentPage === PageState.VideoEditor) { 
    return (
      <VideoEditorView
        handlePublish={handlePublish}
        recordingUrl={recordingUrl}
        handleGoToHome={handleGoToHome}
        clickData={clickData}
      />
    );
  }

  if (currentPage === PageState.Editor) {
    return (
      <EditorView
        handlePublish={handlePublish}
        slides={slides}
        activeSlide={activeSlide}
        setActiveSlide={setActiveSlide}
        selectedBgColor={selectedBgColor}
        setSelectedBgColor={setSelectedBgColor}
        handleGoToHome={handleGoToHome}
      />
    )
  }

  // Covers PageState.Home and PageState.Loading
  return (
    <>
      {currentPage === PageState.Home ? (
        <HomePage
          inputText={inputText}
          setInputText={setInputText}
          handleSubmit={handleSubmit}
          previousDemos={previousDemos}
          selectedTeam={selectedTeam}
          setSelectedTeam={setSelectedTeam}
          teams={teams}
          demoType={demoType}
          setDemoType={setDemoType}
          handleSkipAgent={handleSkipAgent}
        />
      ) : (
        <LoadingView submittedText={submittedText} loadingText={loadingText} loadingDots={loadingDots} />
      )}
    </>
  )
}
