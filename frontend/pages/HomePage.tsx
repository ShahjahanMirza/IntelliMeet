import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Video, Users, Calendar, Settings, Lock } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import client from "../client";
import type { CreateRoomRequest, JoinRoomRequest } from "../client";

export default function HomePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const [isCreating, setIsCreating] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [formData, setFormData] = useState<CreateRoomRequest>({
    title: "",
    description: "",
    password: "",
    isRecordingEnabled: false,
    maxParticipants: 10,
  });
  const [joinFormData, setJoinFormData] = useState<JoinRoomRequest>({
    roomId: "",
    participantName: "",
    password: "",
  });
  const [roomInfo, setRoomInfo] = useState<any>(null);
  const [isLoadingRoom, setIsLoadingRoom] = useState(false);

  // Handle roomId from URL parameters
  useEffect(() => {
    const roomIdFromUrl = searchParams.get('roomId');
    if (roomIdFromUrl) {
      setJoinFormData(prev => ({ ...prev, roomId: roomIdFromUrl }));
    }
  }, [searchParams]);

  const handleCreateRoom = async () => {
    if (!formData.title.trim()) {
      toast({
        title: "Error",
        description: "Please enter a meeting title",
        variant: "destructive",
      });
      return;
    }

    setIsCreating(true);
    try {
      const roomData = {
        ...formData,
        password: formData.password.trim() || undefined
      };
      const room = await client.createRoom(roomData);
      navigate(`/meeting/${room.id}`, {
        state: {
          participantName: "Host",
          password: formData.password.trim() || undefined,
          isCreator: true,
          creatorId: room.creatorId
        }
      });
    } catch (error) {
      console.error("Failed to create room:", error);
      toast({
        title: "Error",
        description: "Failed to create meeting room",
        variant: "destructive",
      });
    } finally {
      setIsCreating(false);
    }
  };

  // Debounced room checking
  useEffect(() => {
    if (!joinFormData.roomId.trim()) {
      setRoomInfo(null);
      return;
    }

    if (joinFormData.roomId.length < 8) {
      setRoomInfo(null);
      return;
    }

    const timeoutId = setTimeout(() => {
      checkRoom();
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [joinFormData.roomId]);

  const checkRoom = async (showErrors = false) => {
    if (!joinFormData.roomId.trim()) {
      setRoomInfo(null);
      return;
    }

    setIsLoadingRoom(true);
    try {
      const room = await client.getRoom(joinFormData.roomId);
      setRoomInfo(room);
    } catch (error) {
      setRoomInfo(null);
      // Only show toast for manual checks (when showErrors is true)
      if (showErrors) {
        toast({
          title: "Room not found",
          description: "Please check the meeting ID and try again",
          variant: "destructive",
        });
      }
    } finally {
      setIsLoadingRoom(false);
    }
  };

  const handleJoinRoom = async () => {
    if (!joinFormData.roomId.trim()) {
      toast({
        title: "Error",
        description: "Please enter a meeting ID",
        variant: "destructive",
      });
      return;
    }

    if (!joinFormData.participantName.trim()) {
      toast({
        title: "Error",
        description: "Please enter your name",
        variant: "destructive",
      });
      return;
    }

    setIsJoining(true);
    try {
      const joinData = {
        ...joinFormData,
        password: joinFormData.password.trim() || undefined
      };
      await client.joinRoom(joinData);
      navigate(`/meeting/${joinFormData.roomId}`, {
        state: {
          participantName: joinFormData.participantName,
          password: joinFormData.password.trim() || undefined
        }
      });
    } catch (error: any) {
      console.error("Failed to join room:", error);
      let message = "Failed to join meeting";
      if (error.statusCode === 404) {
        message = "Meeting not found";
      } else if (error.statusCode === 403 || error.message?.includes("password")) {
        message = "Invalid password";
      } else if (error.statusCode === 409) {
        message = "Meeting is full";
      } else if (error.statusCode === 410) {
        message = "Meeting is no longer active";
      }

      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      });
    } finally {
      setIsJoining(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8">
        <div className="text-center mb-12">
          <div className="flex items-center justify-center mb-4">
            <Video className="h-12 w-12 text-blue-600 mr-3" />
            <h1 className="text-4xl font-bold text-gray-900">IntelliMeet</h1>
          </div>
          <p className="text-xl text-gray-600">Secure, reliable video meetings for everyone</p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 max-w-6xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Calendar className="h-5 w-5 mr-2" />
                Start a New Meeting
              </CardTitle>
              <CardDescription>
                Create a new meeting room and invite others
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Meeting Title *</Label>
                <Input
                  id="title"
                  placeholder="Team Standup, Client Call, etc."
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description (Optional)</Label>
                <Textarea
                  id="description"
                  placeholder="Brief description of the meeting"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password (Optional)</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Secure your meeting with a password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                />
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Recording</Label>
                    <p className="text-sm text-muted-foreground">
                      Enable meeting recording
                    </p>
                  </div>
                  <Switch
                    checked={formData.isRecordingEnabled}
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, isRecordingEnabled: checked })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="maxParticipants">Max Participants (Max: 10)</Label>
                  <Input
                    id="maxParticipants"
                    type="number"
                    min="2"
                    max="10"
                    value={formData.maxParticipants}
                    onChange={(e) =>
                      setFormData({ ...formData, maxParticipants: Math.min(parseInt(e.target.value) || 10, 10) })
                    }
                  />
                </div>
              </div>

              <Button
                onClick={handleCreateRoom}
                className="w-full"
                disabled={isCreating}
              >
                {isCreating ? "Creating..." : "Create Meeting"}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Users className="h-5 w-5 mr-2" />
                Join a Meeting
              </CardTitle>
              <CardDescription>
                Enter a meeting ID to join an existing meeting
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="roomId">Meeting ID *</Label>
                <Input
                  id="roomId"
                  placeholder="Enter meeting ID"
                  value={joinFormData.roomId}
                  onChange={(e) => {
                    setJoinFormData({ ...joinFormData, roomId: e.target.value });
                  }}
                  onBlur={() => checkRoom(true)}
                  className={searchParams.get('roomId') ? 'border-blue-300 bg-blue-50' : ''}
                />
                {searchParams.get('roomId') && (
                  <p className="text-xs text-blue-600">
                    Meeting ID pre-filled from link
                  </p>
                )}
                {isLoadingRoom && (
                  <p className="text-xs text-blue-600">Checking meeting...</p>
                )}
                {joinFormData.roomId && !isLoadingRoom && !roomInfo && joinFormData.roomId.length >= 8 && (
                  <p className="text-xs text-red-600">Meeting not found</p>
                )}
                {roomInfo && (
                  <div className="bg-green-50 border border-green-200 rounded-md p-3">
                    <p className="text-sm font-medium text-green-800">{roomInfo.title}</p>
                    {roomInfo.description && (
                      <p className="text-xs text-green-600 mt-1">{roomInfo.description}</p>
                    )}
                    <div className="flex items-center text-sm text-green-600 mt-2">
                      <Users className="h-4 w-4 mr-1" />
                      {roomInfo.participantCount}/{roomInfo.maxParticipants} participants
                      {roomInfo.hasPassword && (
                        <>
                          <Lock className="h-4 w-4 ml-3 mr-1" />
                          Password protected
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="participantName">Your Name *</Label>
                <Input
                  id="participantName"
                  placeholder="Enter your display name"
                  value={joinFormData.participantName}
                  onChange={(e) => setJoinFormData({ ...joinFormData, participantName: e.target.value })}
                />
              </div>

              {roomInfo?.hasPassword && (
                <div className="space-y-2">
                  <Label htmlFor="joinPassword">Meeting Password</Label>
                  <Input
                    id="joinPassword"
                    type="password"
                    placeholder="Enter meeting password"
                    value={joinFormData.password}
                    onChange={(e) => setJoinFormData({ ...joinFormData, password: e.target.value })}
                  />
                </div>
              )}

              <Button
                onClick={handleJoinRoom}
                className="w-full"
                disabled={isJoining || isLoadingRoom || !joinFormData.roomId.trim() || !joinFormData.participantName.trim()}
              >
                {isJoining ? "Joining..." : "Join Meeting"}
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="mt-12 text-center">
          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            <div className="text-center">
              <Video className="h-8 w-8 text-blue-600 mx-auto mb-2" />
              <h3 className="font-semibold mb-2">HD Video & Audio</h3>
              <p className="text-sm text-gray-600">Crystal clear video and audio quality</p>
            </div>
            <div className="text-center">
              <Settings className="h-8 w-8 text-blue-600 mx-auto mb-2" />
              <h3 className="font-semibold mb-2">Easy to Use</h3>
              <p className="text-sm text-gray-600">Simple interface, no downloads required</p>
            </div>
            <div className="text-center">
              <Users className="h-8 w-8 text-blue-600 mx-auto mb-2" />
              <h3 className="font-semibold mb-2">Secure Meetings</h3>
              <p className="text-sm text-gray-600">End-to-end encryption and password protection</p>
            </div>
          </div>
        </div>

        <div className="mt-8 text-center text-sm text-gray-500">
          <p>Meeting sessions are limited to 30 minutes with a maximum of 10 participants</p>
        </div>
      </div>
    </div>
  );
}
