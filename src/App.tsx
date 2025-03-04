import React, { useState } from "react";
import {
  BrowserRouter as Router,
  Route,
  Routes,
  useLocation,
} from "react-router-dom";
import MainPage from "./components/MainPage";
import MessagesPage from "./components/MessagesPage";
import { SideMenu } from "./components/SideMenu";
import "./App.css";

const AppContent: React.FC = () => {
  const [isSideMenuOpen, setIsSideMenuOpen] = useState(false);
  const location = useLocation();

  return (
    <div className="relative flex h-screen">
      <SideMenu
        isOpen={isSideMenuOpen}
        onClose={() => setIsSideMenuOpen(false)}
      />
      <div className="flex-1 overflow-y-auto relative">
        <button
          onClick={() => setIsSideMenuOpen(true)}
          className="fixed top-4 left-4 z-10"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-6 w-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 6h16M4 12h16M4 18h16"
            />
          </svg>
        </button>
        <Routes>
          <Route path="/" element={<MainPage />} />
          <Route path="/messages" element={<MessagesPage />} />
        </Routes>
      </div>
    </div>
  );
};

const App: React.FC = () => {
  return (
    <Router>
      <AppContent />
    </Router>
  );
};

export default App;
