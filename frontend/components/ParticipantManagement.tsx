import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  Monitor,
  MonitorOff,
  UserX,
  Shield,
  Users,
  AlertTriangle
} from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import client from "../client";

interface ParticipantManagementProps {
  roomId: string;
  currentParticipant: {
    id: string;
    name: string;
    isHost: boolean;
  };
  participants: Array<{
    id: string;
    name: string;
    isAudioEnabled: boolean;
    isVideoEnabled: boolean;
    isScreenSharing: boolean;
    isHost: boolean;
  }>;
  onClose: () => void;
  onParticipantUpdate: () => void;
}

export default function ParticipantManagement({
  roomId,
  currentParticipant,
  participants,
  onClose,
  onParticipantUpdate
}: ParticipantManagementProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState<string | null>(null);

  // Only show if current user is host
  if (!currentParticipant.isHost) {
    return null;
  }

  const handleKickParticipant = async (participantId: string, participantName: string) => {
    if (window.confirm(`Are you sure you want to remove ${participantName} from the meeting?`)) {
      setLoading(`kick-${participantId}`);
      try {
        await client.kickParticipant(participantId, currentParticipant.id);

        // Send WebSocket notification
        client.sendParticipantKickedWebSocket(roomId, participantId);

        toast({
          title: "Participant Removed",
          description: `${participantName} has been removed from the meeting.`,
        });

        onParticipantUpdate();
      } catch (error: any) {
        console.error("Failed to kick participant:", error);
        toast({
          title: "Error",
          description: error.message || "Failed to remove participant.",
          variant: "destructive",
        });
      } finally {
        setLoading(null);
      }
    }
  };

  const handleMuteParticipant = async (participantId: string, participantName: string, currentlyMuted: boolean) => {
    const action = currentlyMuted ? "unmute" : "mute";
    setLoading(`mute-${participantId}`);

    try {
      await client.muteParticipant(participantId, currentParticipant.id, !currentlyMuted);

      // Send WebSocket notification
      client.sendParticipantControlWebSocket(roomId, currentParticipant.id, {
        targetParticipantId: participantId,
        action: 'audio',
        enabled: currentlyMuted
      });

      toast({
        title: "Audio Control",
        description: `${participantName} has been ${action}d.`,
      });

      onParticipantUpdate();
    } catch (error: any) {
      console.error(`Failed to ${action} participant:`, error);
      toast({
        title: "Error",
        description: error.message || `Failed to ${action} participant.`,
        variant: "destructive",
      });
    } finally {
      setLoading(null);
    }
  };

  const handleVideoControl = async (participantId: string, participantName: string, currentlyEnabled: boolean) => {
    const action = currentlyEnabled ? "disable" : "enable";
    setLoading(`video-${participantId}`);

    try {
      await client.controlParticipantVideo(participantId, currentParticipant.id, !currentlyEnabled);

      // Send WebSocket notification
      client.sendParticipantControlWebSocket(roomId, currentParticipant.id, {
        targetParticipantId: participantId,
        action: 'video',
        enabled: !currentlyEnabled
      });

      toast({
        title: "Video Control",
        description: `${participantName}'s video has been ${action}d.`,
      });

      onParticipantUpdate();
    } catch (error: any) {
      console.error(`Failed to ${action} participant video:`, error);
      toast({
        title: "Error",
        description: error.message || `Failed to ${action} participant video.`,
        variant: "destructive",
      });
    } finally {
      setLoading(null);
    }
  };

  const handleScreenShareControl = async (participantId: string, participantName: string, currentlySharing: boolean) => {
    const action = currentlySharing ? "stop" : "allow";
    setLoading(`screen-${participantId}`);

    try {
      await client.controlParticipantScreenShare(participantId, currentParticipant.id, !currentlySharing);

      // Send WebSocket notification
      client.sendParticipantControlWebSocket(roomId, currentParticipant.id, {
        targetParticipantId: participantId,
        action: 'screenshare',
        enabled: !currentlySharing
      });

      toast({
        title: "Screen Share Control",
        description: `${participantName}'s screen sharing has been ${action === "stop" ? "stopped" : "allowed"}.`,
      });

      onParticipantUpdate();
    } catch (error: any) {
      console.error(`Failed to ${action} participant screen share:`, error);
      toast({
        title: "Error",
        description: error.message || `Failed to ${action} screen sharing.`,
        variant: "destructive",
      });
    } finally {
      setLoading(null);
    }
  };

  const nonHostParticipants = participants.filter(p => !p.isHost);

  return (
    <div className="w-80 bg-white border-l h-full overflow-y-auto">
      <div className="p-4 border-b bg-gray-50">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Shield className="h-5 w-5 text-blue-600" />
            <h3 className="text-lg font-semibold">Host Controls</h3>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            ×
          </Button>
        </div>
        <p className="text-sm text-gray-600 mt-1">
          Manage participants in your meeting
        </p>
      </div>

      <div className="p-4">
        {nonHostParticipants.length === 0 ? (
          <Alert>
            <Users className="h-4 w-4" />
            <AlertDescription>
              No participants to manage. Invite others to join the meeting!
            </AlertDescription>
          </Alert>
        ) : (
          <div className="space-y-4">
            <div className="text-sm text-gray-600">
              Managing {nonHostParticipants.length} participant{nonHostParticipants.length !== 1 ? 's' : ''}
            </div>

            {nonHostParticipants.map((participant) => (
              <Card key={participant.id} className="border border-gray-200">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center justify-between">
                    <span className="truncate">{participant.name}</span>
                    {participant.isHost && (
                      <Shield className="h-3 w-3 text-blue-600 flex-shrink-0" />
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0 space-y-3">
                  {/* Media Controls */}
                  <div className="flex space-x-2">
                    <Button
                      variant={participant.isAudioEnabled ? "secondary" : "destructive"}
                      size="sm"
                      onClick={() => handleMuteParticipant(participant.id, participant.name, !participant.isAudioEnabled)}
                      disabled={loading === `mute-${participant.id}`}
                      className="flex-1"
                    >
                      {participant.isAudioEnabled ? <Mic className="h-3 w-3" /> : <MicOff className="h-3 w-3" />}
                    </Button>

                    <Button
                      variant={participant.isVideoEnabled ? "secondary" : "outline"}
                      size="sm"
                      onClick={() => handleVideoControl(participant.id, participant.name, participant.isVideoEnabled)}
                      disabled={loading === `video-${participant.id}`}
                      className="flex-1"
                    >
                      {participant.isVideoEnabled ? <Video className="h-3 w-3" /> : <VideoOff className="h-3 w-3" />}
                    </Button>

                    <Button
                      variant={participant.isScreenSharing ? "default" : "outline"}
                      size="sm"
                      onClick={() => handleScreenShareControl(participant.id, participant.name, participant.isScreenSharing)}
                      disabled={loading === `screen-${participant.id}`}
                      className="flex-1"
                    >
                      {participant.isScreenSharing ? <MonitorOff className="h-3 w-3" /> : <Monitor className="h-3 w-3" />}
                    </Button>
                  </div>

                  {/* Status indicators */}
                  <div className="flex text-xs text-gray-500 space-x-4">
                    <span className={participant.isAudioEnabled ? "text-green-600" : "text-red-600"}>
                      {participant.isAudioEnabled ? "🎤 On" : "🔇 Muted"}
                    </span>
                    <span className={participant.isVideoEnabled ? "text-green-600" : "text-gray-500"}>
                      {participant.isVideoEnabled ? "📹 On" : "📹 Off"}
                    </span>
                    {participant.isScreenSharing && (
                      <span className="text-blue-600">📺 Sharing</span>
                    )}
                  </div>

                  {/* Remove participant */}
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleKickParticipant(participant.id, participant.name)}
                    disabled={loading === `kick-${participant.id}`}
                    className="w-full"
                  >
                    <UserX className="h-3 w-3 mr-2" />
                    {loading === `kick-${participant.id}` ? "Removing..." : "Remove from Meeting"}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <Alert className="mt-6">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="text-xs">
            <strong>Host privileges:</strong> You can control participant audio, video, screen sharing, and remove participants from the meeting.
          </AlertDescription>
        </Alert>
      </div>
    </div>
  );
}
