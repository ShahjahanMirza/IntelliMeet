import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { X, Camera, Mic, Speaker, Monitor } from "lucide-react";

interface SettingsPanelProps {
  onClose: () => void;
}

export default function SettingsPanel({ onClose }: SettingsPanelProps) {
  const [selectedCamera, setSelectedCamera] = useState("");
  const [selectedMicrophone, setSelectedMicrophone] = useState("");
  const [selectedSpeaker, setSelectedSpeaker] = useState("");
  const [enableHD, setEnableHD] = useState(true);
  const [enableNoiseReduction, setEnableNoiseReduction] = useState(true);
  const [enableEchoCancellation, setEnableEchoCancellation] = useState(true);

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b flex items-center justify-between">
        <h3 className="font-semibold">Settings</h3>
        <Button variant="ghost" size="sm" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex-1 p-4 space-y-6 overflow-y-auto">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Camera className="h-5 w-5 mr-2" />
              Camera
            </CardTitle>
            <CardDescription>
              Configure your camera settings
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Camera Device</Label>
              <Select value={selectedCamera} onValueChange={setSelectedCamera}>
                <SelectTrigger>
                  <SelectValue placeholder="Select camera" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="default">Default Camera</SelectItem>
                  <SelectItem value="usb">USB Camera</SelectItem>
                  <SelectItem value="integrated">Integrated Camera</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>HD Video</Label>
                <p className="text-sm text-muted-foreground">
                  Enable high-definition video (720p)
                </p>
              </div>
              <Switch
                checked={enableHD}
                onCheckedChange={setEnableHD}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Mic className="h-5 w-5 mr-2" />
              Microphone
            </CardTitle>
            <CardDescription>
              Configure your microphone settings
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Microphone Device</Label>
              <Select value={selectedMicrophone} onValueChange={setSelectedMicrophone}>
                <SelectTrigger>
                  <SelectValue placeholder="Select microphone" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="default">Default Microphone</SelectItem>
                  <SelectItem value="headset">Headset Microphone</SelectItem>
                  <SelectItem value="usb">USB Microphone</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Noise Reduction</Label>
                <p className="text-sm text-muted-foreground">
                  Reduce background noise
                </p>
              </div>
              <Switch
                checked={enableNoiseReduction}
                onCheckedChange={setEnableNoiseReduction}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Echo Cancellation</Label>
                <p className="text-sm text-muted-foreground">
                  Cancel audio echo
                </p>
              </div>
              <Switch
                checked={enableEchoCancellation}
                onCheckedChange={setEnableEchoCancellation}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Speaker className="h-5 w-5 mr-2" />
              Speaker
            </CardTitle>
            <CardDescription>
              Configure your speaker settings
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Speaker Device</Label>
              <Select value={selectedSpeaker} onValueChange={setSelectedSpeaker}>
                <SelectTrigger>
                  <SelectValue placeholder="Select speaker" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="default">Default Speaker</SelectItem>
                  <SelectItem value="headset">Headset</SelectItem>
                  <SelectItem value="external">External Speakers</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Monitor className="h-5 w-5 mr-2" />
              Display
            </CardTitle>
            <CardDescription>
              Configure display and sharing settings
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button variant="outline" className="w-full">
              Test Speaker & Microphone
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
