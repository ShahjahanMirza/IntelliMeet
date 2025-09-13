import { useState, useEffect, useRef } from "react";
import { useParams, useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  Phone,
  Monitor,
  MonitorOff,
  Settings,
  Users,
  MessageSquare,
  Copy,
  Clock,
  AlertTriangle,
  X
} from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import client from "../client";
import ParticipantGrid from "../components/ParticipantGrid";
import SimpleChatPanel from "../components/SimpleChatPanel";
import SettingsPanel from "../components/SettingsPanel";
import ParticipantManagement from "../components/ParticipantManagement";

export default function MeetingPage() {
  const { roomId } = useParams<{ roomId: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showParticipants, setShowParticipants] = useState(false);
  const [showHostControls, setShowHostControls] = useState(false);
  const [participants, setParticipants] = useState<any[]>([]);
  const [roomInfo, setRoomInfo] = useState<any>(null);
  const [currentParticipant, setCurrentParticipant] = useState<any>(null);
  const [remainingMinutes, setRemainingMinutes] = useState(30);
  const [showTimeWarning, setShowTimeWarning] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const timeoutCheckRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const participantPollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const backoffMultiplierRef = useRef(1);
  const pollIntervalRef = useRef(30000); // Start with 30 second interval (reduced with WebSocket)
  const wsUnsubscribeRef = useRef<(() => void)[]>([]);

  useEffect(() => {
    if (!roomId) {
      navigate("/");
      return;
    }

    initializeMeeting();

    return () => {
      cleanup();
    };
  }, [roomId]);

  useEffect(() => {
    if (currentParticipant && roomInfo) {
      setIsLoading(false);
      startLocalVideo();

      // Only start polling if not already started
      if (!participantPollRef.current) {
        startParticipantPolling();
      }

      // Only start timeout check if not already started
      if (!timeoutCheckRef.current) {
        startTimeoutCheck();
      }
    }
  }, [currentParticipant, roomInfo]);

  const cleanup = () => {
    stopLocalVideo();
    if (timeoutCheckRef.current) {
      clearInterval(timeoutCheckRef.current);
    }
    if (participantPollRef.current) {
      clearInterval(participantPollRef.current);
    }

    // Clean up WebSocket subscriptions
    wsUnsubscribeRef.current.forEach(unsubscribe => unsubscribe());
    wsUnsubscribeRef.current = [];

    if (currentParticipant && roomId) {
      client.leaveRoomWebSocket(roomId, currentParticipant.id);
      client.leaveRoom(currentParticipant.id).catch(console.error);
    }

    client.disconnectWebSocket();
  };

  const startParticipantPolling = () => {
    // Clear any existing polling interval first
    if (participantPollRef.current) {
      clearInterval(participantPollRef.current);
      participantPollRef.current = null;
    }

    // Set up WebSocket for real-time updates
    setupWebSocketUpdates();

    const pollParticipants = async () => {
      try {
        const result = await client.getParticipants(roomId!);
        // Filter out the current participant to avoid duplication
        const otherParticipants = result.participants.filter(p => p.id !== currentParticipant?.id);
        setParticipants(otherParticipants);

        // Also update room info to get accurate participant count
        const updatedRoom = await client.getRoom(roomId!);
        setRoomInfo(updatedRoom);

        // Reset backoff on successful request
        backoffMultiplierRef.current = 1;
        pollIntervalRef.current = 30000; // Reduced polling frequency to 30 seconds with WebSocket backup

      } catch (error: any) {
        if (error.statusCode === 429) {
          // Exponential backoff for rate limiting
          backoffMultiplierRef.current = Math.min(backoffMultiplierRef.current * 2, 8); // Max 8x backoff
          pollIntervalRef.current = 30000 * backoffMultiplierRef.current;

          console.warn(`Rate limited - backing off to ${pollIntervalRef.current/1000}s interval`);

          // Restart polling with new interval
          if (participantPollRef.current) {
            clearInterval(participantPollRef.current);
            participantPollRef.current = setInterval(pollParticipants, pollIntervalRef.current);
          }
        } else {
          console.error("Failed to load participants:", error);
        }
      }
    };

    // Poll immediately and then with current interval (less frequent with WebSocket)
    pollParticipants();
    participantPollRef.current = setInterval(pollParticipants, pollIntervalRef.current);
  };

  const setupWebSocketUpdates = async () => {
    try {
      await client.connectWebSocket();

      // Join the room via WebSocket
      if (currentParticipant && roomId) {
        client.joinRoomWebSocket(roomId, currentParticipant.id);
      }

      // Listen for participant updates
      const unsubscribeParticipant = client.onWebSocketMessage('participant-joined', (message) => {
        console.log('Participant joined:', message);
        // Refresh participants list
        refreshParticipantsList();
      });

      const unsubscribeParticipantLeft = client.onWebSocketMessage('participant-left', (message) => {
        console.log('Participant left:', message);
        // Refresh participants list
        refreshParticipantsList();
      });

      // Store unsubscribe functions for cleanup
      wsUnsubscribeRef.current = [unsubscribeParticipant, unsubscribeParticipantLeft];
    } catch (error) {
      console.warn('WebSocket connection failed, falling back to polling only:', error);
    }
  };

  const refreshParticipantsList = async () => {
    try {
      const result = await client.getParticipants(roomId!);
      const otherParticipants = result.participants.filter(p => p.id !== currentParticipant?.id);
      setParticipants(otherParticipants);

      const updatedRoom = await client.getRoom(roomId!);
      setRoomInfo(updatedRoom);
    } catch (error) {
      console.error("Failed to refresh participants:", error);
    }
  };

  const startTimeoutCheck = () => {
    const checkTimeout = async () => {
      try {
        const result = await client.checkTimeout(roomId!);
        setRemainingMinutes(result.remainingMinutes);

        if (result.shouldClose) {
          toast({
            title: "Meeting Ended",
            description: "The 30-minute session limit has been reached",
            variant: "destructive",
          });
          await client.clearMessages(roomId!);
          navigate("/");
          return;
        }

        if (result.remainingMinutes <= 5 && !showTimeWarning) {
          setShowTimeWarning(true);
          toast({
            title: "Meeting Warning",
            description: `Meeting will end in ${result.remainingMinutes} minutes`,
            variant: "destructive",
          });
        }
      } catch (error) {
        console.error("Failed to check timeout:", error);
      }
    };

    // Check immediately and then every minute
    checkTimeout();
    timeoutCheckRef.current = setInterval(checkTimeout, 60000);
  };

  const initializeMeeting = async () => {
    try {
      // First, get room information
      const room = await client.getRoom(roomId!);
      setRoomInfo(room);

      // Check if we have participant name from navigation state
      const participantName = location.state?.participantName;
      const isCreator = location.state?.isCreator;
      const creatorId = location.state?.creatorId;

      if (participantName) {
        try {
          // If this is the creator, use their existing participant ID
          if (isCreator && creatorId) {
            const creatorParticipant = {
              id: creatorId,
              name: participantName,
              joinedAt: new Date(),
              isHost: true
            };
            console.log("Setting creator as current participant:", creatorParticipant);
            setCurrentParticipant(creatorParticipant);
          } else {
            // Try to join the room for regular participants
            const joinResult = await client.joinRoom({
              roomId: roomId!,
              participantName,
              password: location.state?.password,
            });
            console.log("Join result participant:", joinResult.participant);
            setCurrentParticipant(joinResult.participant);
          }
        } catch (joinError: any) {
          console.error("Failed to join room:", joinError);

          // If join fails, navigate to join page with the room ID
          if (joinError.statusCode === 409) {
            toast({
              title: "Room Full",
              description: "This meeting room is full",
              variant: "destructive",
            });
          } else if (joinError.statusCode === 410) {
            toast({
              title: "Meeting Ended",
              description: "This meeting is no longer active",
              variant: "destructive",
            });
          } else if (joinError.statusCode === 403 || joinError.message?.includes("password")) {
            toast({
              title: "Authentication Required",
              description: "This meeting requires a password",
              variant: "destructive",
            });
          } else {
            toast({
              title: "Join Failed",
              description: "Failed to join the meeting",
              variant: "destructive",
            });
          }

          navigate(`/?roomId=${roomId}`);
          return;
        }
      } else {
        // No participant name, redirect to homepage
        navigate(`/?roomId=${roomId}`);
        return;
      }
    } catch (error) {
      console.error("Failed to initialize meeting:", error);
      toast({
        title: "Error",
        description: "Meeting not found or no longer available",
        variant: "destructive",
      });
      navigate("/");
    }
  };

  const startLocalVideo = async () => {
    try {
      // Stop any existing stream first
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => track.stop());
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: "user"
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });

      localStreamRef.current = stream;

      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
        // Ensure video plays
        localVideoRef.current.onloadedmetadata = () => {
          localVideoRef.current?.play().catch(console.error);
        };
      }
    } catch (error: any) {
      console.error("Failed to access camera/microphone:", error);

      let message = "Unable to access camera or microphone";
      if (error.name === "NotAllowedError") {
        message = "Camera/microphone access denied. Please allow access and refresh the page.";
      } else if (error.name === "NotFoundError") {
        message = "No camera or microphone found. Please check your devices.";
      } else if (error.name === "NotReadableError") {
        message = "Camera or microphone is already in use by another application.";
      }

      toast({
        title: "Media Access Error",
        description: message,
        variant: "destructive",
      });

      // Set video to disabled if we can't access it
      setIsVideoEnabled(false);
    }
  };

  const stopLocalVideo = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
      localStreamRef.current = null;
    }
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = null;
    }
  };

  const toggleAudio = async () => {
    const newState = !isAudioEnabled;
    setIsAudioEnabled(newState);

    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = newState;
      }
    }

    if (currentParticipant) {
      try {
        await client.updateParticipant(currentParticipant.id, {
          isAudioEnabled: newState,
        });
      } catch (error) {
        console.error("Failed to update audio state:", error);
      }
    }
  };

  const toggleVideo = async () => {
    const newState = !isVideoEnabled;
    setIsVideoEnabled(newState);

    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = newState;
      }
    }

    if (currentParticipant) {
      try {
        await client.updateParticipant(currentParticipant.id, {
          isVideoEnabled: newState,
        });
      } catch (error) {
        console.error("Failed to update video state:", error);
      }
    }
  };

  const toggleScreenShare = async () => {
    if (!isScreenSharing) {
      try {
        // Check if we're in a secure context (HTTPS or localhost)
        if (!window.isSecureContext) {
          toast({
            title: "Screen Share Not Available",
            description: "Screen sharing requires a secure connection (HTTPS)",
            variant: "destructive",
          });
          return;
        }

        // Check if screen sharing is supported in this browser
        if (!navigator.mediaDevices?.getDisplayMedia) {
          toast({
            title: "Screen Share Not Supported",
            description: "Screen sharing is not supported in this browser. Try Chrome, Firefox, or Edge.",
            variant: "destructive",
          });
          return;
        }

        console.log("Requesting screen share...");

        const screenStream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            sampleRate: 44100
          }
        });

        console.log("Screen share granted:", screenStream);
        setIsScreenSharing(true);

        if (currentParticipant) {
          try {
            await client.updateParticipant(currentParticipant.id, {
              isScreenSharing: true,
            });
            console.log("Updated participant screen sharing status");
          } catch (updateError) {
            console.error("Failed to update participant status:", updateError);
          }
        }

        // Handle when user stops sharing via browser UI
        const videoTrack = screenStream.getVideoTracks()[0];
        if (videoTrack) {
          videoTrack.onended = () => {
            console.log("Screen sharing ended by user");
            setIsScreenSharing(false);
            if (currentParticipant) {
              client.updateParticipant(currentParticipant.id, {
                isScreenSharing: false,
              }).catch(console.error);
            }
          };
        }

        toast({
          title: "Screen Sharing Started",
          description: "Your screen is now being shared with participants",
        });

      } catch (error: any) {
        console.error("Failed to start screen sharing:", error);
        let title = "Screen Share Error";
        let message = "Unable to start screen sharing";

        if (error.name === "NotAllowedError") {
          title = "Permission Denied";
          message = "Screen sharing was denied. Please allow screen sharing and try again.";
        } else if (error.name === "NotSupportedError") {
          title = "Not Supported";
          message = "Screen sharing is not supported in this browser. Try using Chrome, Firefox, or Edge.";
        } else if (error.name === "NotFoundError") {
          title = "No Screen Available";
          message = "No screen or window was selected for sharing.";
        } else if (error.name === "AbortError") {
          title = "Screen Share Cancelled";
          message = "Screen sharing was cancelled by the user.";
        } else if (error.name === "InvalidStateError") {
          title = "Invalid State";
          message = "Screen sharing is not available in the current state.";
        }

        toast({
          title,
          description: message,
          variant: "destructive",
        });
      }
    } else {
      console.log("Stopping screen share...");
      setIsScreenSharing(false);

      if (currentParticipant) {
        try {
          await client.updateParticipant(currentParticipant.id, {
            isScreenSharing: false,
          });
          console.log("Updated participant screen sharing status to false");
        } catch (updateError) {
          console.error("Failed to update participant status:", updateError);
        }
      }

      toast({
        title: "Screen Sharing Stopped",
        description: "Your screen is no longer being shared",
      });
    }
  };

  const copyMeetingLink = () => {
    const meetingLink = `${window.location.origin}/?roomId=${roomId}`;
    navigator.clipboard.writeText(meetingLink);
    toast({
      title: "Link Copied",
      description: "Meeting link copied to clipboard",
    });
  };

  const leaveMeeting = async () => {
    if (currentParticipant) {
      try {
        await client.leaveRoom(currentParticipant.id);
      } catch (error) {
        console.error("Failed to leave meeting:", error);
      }
    }
    navigate("/");
  };

  const endMeeting = async () => {
    try {
      if (currentParticipant && currentParticipant.isHost) {
        await client.endMeeting(roomId!, currentParticipant.id);
        toast({
          title: "Meeting Ended",
          description: "The meeting has been ended for all participants.",
        });
        navigate('/');
      }
    } catch (error) {
      console.error('Failed to end meeting:', error);
      toast({
        title: "Error",
        description: "Failed to end meeting. Please try again.",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <div className="text-white">
            {roomInfo ? "Joining meeting..." : "Loading meeting..."}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col">
      {/* Header */}
      <div className="bg-gray-800 text-white p-4 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold">{roomInfo.title}</h1>
          <p className="text-sm text-gray-300">Meeting ID: {roomId}</p>
        </div>
        <div className="flex items-center space-x-4">
          <div className={`flex items-center space-x-2 px-3 py-1 rounded ${remainingMinutes <= 5 ? 'bg-red-600' : 'bg-gray-700'}`}>
            <Clock className="h-4 w-4" />
            <span className="text-sm">{remainingMinutes}m left</span>
          </div>
          <Button variant="ghost" size="sm" onClick={copyMeetingLink}>
            <Copy className="h-4 w-4 mr-2" />
            Copy Link
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowParticipants(!showParticipants)}
          >
            <Users className="h-4 w-4 mr-2" />
            {roomInfo?.participantCount || 1}/{roomInfo?.maxParticipants || 10}
          </Button>
          {currentParticipant?.isHost && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowHostControls(!showHostControls)}
            >
              <Settings className="h-4 w-4 mr-2" />
              Host Controls
            </Button>
          )}
          {/* Debug info */}
          {typeof window !== 'undefined' && (
            <div className="text-xs text-gray-400 ml-2">
              Host: {currentParticipant?.isHost ? 'Yes' : 'No'}
            </div>
          )}
        </div>
      </div>

      {/* Time Warning Alert */}
      {showTimeWarning && remainingMinutes <= 5 && (
        <Alert className="bg-red-50 border-red-200 m-4">
          <AlertTriangle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">
            Warning: Meeting will end in {remainingMinutes} minutes due to the 30-minute session limit.
          </AlertDescription>
        </Alert>
      )}

      {/* Main Content */}
      <div className="flex-1 flex">
        {/* Video Area */}
        <div className="flex-1 relative">
          <ParticipantGrid
            participants={participants}
            localVideoRef={localVideoRef}
            localParticipantName={currentParticipant?.name || ""}
            isLocalVideoEnabled={isVideoEnabled}
            isLocalAudioEnabled={isAudioEnabled}
            isLocalHost={currentParticipant?.isHost || false}
          />
        </div>

        {/* Side Panels */}
        {showChat && (
          <div className="w-80 bg-white border-l">
            <SimpleChatPanel
              roomId={roomId!}
              participantName={currentParticipant?.name || "Anonymous"}
              onClose={() => setShowChat(false)}
            />
          </div>
        )}

        {showSettings && (
          <div className="w-80 bg-white border-l">
            <SettingsPanel onClose={() => setShowSettings(false)} />
          </div>
        )}

        {showHostControls && currentParticipant?.isHost && (
          <ParticipantManagement
            roomId={roomId!}
            currentParticipant={currentParticipant}
            participants={participants}
            onClose={() => setShowHostControls(false)}
            onParticipantUpdate={() => {
              // Refresh participants using the centralized function
              refreshParticipantsList();
            }}
          />
        )}
      </div>

      {/* Bottom Controls */}
      <div className="bg-gray-800 p-4">
        <div className="flex items-center justify-center space-x-4">
          <Button
            variant={isAudioEnabled ? "secondary" : "destructive"}
            size="lg"
            onClick={toggleAudio}
            className="rounded-full w-12 h-12"
          >
            {isAudioEnabled ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
          </Button>

          <Button
            variant={isVideoEnabled ? "secondary" : "destructive"}
            size="lg"
            onClick={toggleVideo}
            className="rounded-full w-12 h-12"
          >
            {isVideoEnabled ? <Video className="h-5 w-5" /> : <VideoOff className="h-5 w-5" />}
          </Button>

          <Button
            variant={isScreenSharing ? "destructive" : "secondary"}
            size="lg"
            onClick={toggleScreenShare}
            className="rounded-full w-12 h-12"
            title={isScreenSharing ? "Stop Screen Sharing" : "Share Screen"}
          >
            {isScreenSharing ? <MonitorOff className="h-5 w-5" /> : <Monitor className="h-5 w-5" />}
          </Button>

          <Button
            variant="secondary"
            size="lg"
            onClick={() => setShowChat(!showChat)}
            className="rounded-full w-12 h-12"
          >
            <MessageSquare className="h-5 w-5" />
          </Button>

          <Button
            variant="secondary"
            size="lg"
            onClick={() => setShowSettings(!showSettings)}
            className="rounded-full w-12 h-12"
          >
            <Settings className="h-5 w-5" />
          </Button>

          {currentParticipant?.isHost && (
            <Button
              variant="destructive"
              size="lg"
              onClick={endMeeting}
              className="rounded-full w-12 h-12 ml-4"
              title="End Meeting for All"
            >
              <X className="h-5 w-5" />
            </Button>
          )}

          <Button
            variant="secondary"
            size="lg"
            onClick={leaveMeeting}
            className="rounded-full w-12 h-12 ml-4"
            title="Leave Meeting"
          >
            <Phone className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
