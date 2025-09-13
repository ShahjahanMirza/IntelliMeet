import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { Toaster } from "@/components/ui/toaster";
import HomePage from "./pages/HomePage";
import { Navigate } from "react-router-dom";
import MeetingPage from "./pages/MeetingPage";

export default function App() {
  return (
    <Router>
      <div className="min-h-screen bg-background">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/join/:roomId?" element={<Navigate to="/" replace />} />
          <Route path="/meeting/:roomId" element={<MeetingPage />} />
        </Routes>
        <Toaster />
      </div>
    </Router>
  );
}
