import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { X, Send } from "lucide-react";
import backend from "~backend/client";

interface Message {
  id: string;
  sender: string;
  content: string;
  timestamp: Date;
}

interface ChatPanelProps {
  roomId: string;
  participantName: string;
  onClose: () => void;
}

export default function ChatPanel({ roomId, participantName, onClose }: ChatPanelProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    loadMessages();
    startPolling();

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, [roomId]);

  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [messages]);

  const loadMessages = async () => {
    try {
      const result = await backend.messaging.getMessages({ roomId });
      setMessages(result.messages.map(msg => ({
        ...msg,
        timestamp: new Date(msg.timestamp)
      })));
    } catch (error) {
      console.error("Failed to load messages:", error);
    }
  };

  const startPolling = () => {
    // Poll for new messages every 2 seconds
    pollIntervalRef.current = setInterval(loadMessages, 2000);
  };

  const sendMessage = async () => {
    if (!newMessage.trim()) return;

    try {
      await backend.messaging.sendMessage({
        roomId,
        sender: participantName,
        content: newMessage.trim(),
      });
      
      setNewMessage("");
      // Immediately load messages to show the new one
      await loadMessages();
    } catch (error) {
      console.error("Failed to send message:", error);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b flex items-center justify-between">
        <h3 className="font-semibold">Chat</h3>
        <Button variant="ghost" size="sm" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      <ScrollArea className="flex-1 p-4" ref={scrollAreaRef}>
        <div className="space-y-4">
          {messages.length === 0 ? (
            <div className="text-center text-gray-500 py-8">
              <p>No messages yet. Start the conversation!</p>
            </div>
          ) : (
            messages.map((message) => (
              <div key={message.id} className="space-y-1">
                <div className="flex items-center space-x-2">
                  <span className={`text-sm font-medium ${
                    message.sender === participantName ? 'text-blue-600' : ''
                  }`}>
                    {message.sender}
                  </span>
                  <span className="text-xs text-gray-500">
                    {message.timestamp.toLocaleTimeString([], { 
                      hour: '2-digit', 
                      minute: '2-digit' 
                    })}
                  </span>
                </div>
                <p className="text-sm text-gray-700 break-words">{message.content}</p>
              </div>
            ))
          )}
        </div>
      </ScrollArea>

      <div className="p-4 border-t">
        <div className="flex space-x-2">
          <Input
            placeholder="Type a message..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            className="flex-1"
            maxLength={500}
          />
          <Button onClick={sendMessage} size="sm" disabled={!newMessage.trim()}>
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
