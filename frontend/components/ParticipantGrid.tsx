import { Card } from "@/components/ui/card";
import { Mic, MicOff, User } from "lucide-react";

interface Participant {
  id: string;
  name: string;
  isAudioEnabled: boolean;
  isVideoEnabled: boolean;
  isScreenSharing: boolean;
  isHost: boolean;
  isLocal?: boolean;
}

interface ParticipantGridProps {
  participants: Participant[];
  localVideoRef: React.RefObject<HTMLVideoElement>;
  localParticipantName: string;
  isLocalVideoEnabled: boolean;
  isLocalAudioEnabled: boolean;
  isLocalHost?: boolean;
}

export default function ParticipantGrid({
  participants,
  localVideoRef,
  localParticipantName,
  isLocalVideoEnabled,
  isLocalAudioEnabled,
  isLocalHost = false
}: ParticipantGridProps) {
  const allParticipants = [
    {
      id: "local",
      name: localParticipantName,
      isAudioEnabled: isLocalAudioEnabled,
      isVideoEnabled: isLocalVideoEnabled,
      isScreenSharing: false,
      isHost: isLocalHost,
      isLocal: true,
    },
    ...participants,
  ];

  const gridCols = allParticipants.length === 1 ? "grid-cols-1" :
                   allParticipants.length === 2 ? "grid-cols-2" :
                   allParticipants.length <= 4 ? "grid-cols-2" :
                   allParticipants.length <= 6 ? "grid-cols-3" :
                   "grid-cols-4";

  return (
    <div className="h-full p-4">
      <div className={`grid ${gridCols} gap-4 h-full`}>
        {allParticipants.map((participant) => (
          <Card key={participant.id} className="relative bg-gray-800 overflow-hidden">
            {participant.isLocal ? (
              <>
                <video
                  ref={localVideoRef}
                  autoPlay
                  muted
                  playsInline
                  className={`w-full h-full object-cover ${
                    isLocalVideoEnabled ? "" : "hidden"
                  }`}
                />
                {!isLocalVideoEnabled && (
                  <div className="absolute inset-0 bg-gray-700 flex items-center justify-center">
                    <div className="text-center">
                      <User className="h-16 w-16 text-gray-400 mx-auto mb-2" />
                      <p className="text-white">{participant.name}</p>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="w-full h-full bg-gray-700 flex items-center justify-center">
                {participant.isVideoEnabled ? (
                  <div className="text-white text-center">
                    <User className="h-16 w-16 text-gray-400 mx-auto mb-2" />
                    <p>Video stream from {participant.name}</p>
                    <p className="text-xs text-gray-400 mt-1">(WebRTC connection needed)</p>
                  </div>
                ) : (
                  <div className="text-center">
                    <User className="h-16 w-16 text-gray-400 mx-auto mb-2" />
                    <p className="text-white">{participant.name}</p>
                  </div>
                )}
              </div>
            )}

            {/* Participant Info Overlay */}
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-3">
              <div className="flex items-center justify-between">
                <span className="text-white text-sm font-medium">
                  {participant.name} {participant.isLocal && "(You)"} {participant.isHost && "👑"}
                </span>
                <div className="flex items-center space-x-2">
                  {participant.isAudioEnabled ? (
                    <Mic className="h-4 w-4 text-green-400" />
                  ) : (
                    <MicOff className="h-4 w-4 text-red-400" />
                  )}
                </div>
              </div>
            </div>

            {participant.isScreenSharing && (
              <div className="absolute top-2 left-2 bg-blue-600 text-white px-2 py-1 rounded text-xs">
                Sharing screen
              </div>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}
