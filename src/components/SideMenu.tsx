import React from "react";
import { X, Home, MessageSquare } from "lucide-react";
import { Link } from "react-router-dom";

interface SideMenuProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SideMenu: React.FC<SideMenuProps> = ({ isOpen, onClose }) => {
  const handleLinkClick = () => {
    onClose();
  };

  return (
    <div
      className={`fixed inset-y-0 left-0 z-50 w-64 bg-gray-800 transform ${
        isOpen ? "translate-x-0" : "-translate-x-full"
      } transition-transform duration-300 ease-in-out flex flex-col`}
    >
      <div className="flex items-center justify-between p-4 bg-gray-700">
        <h2 className="text-xl font-bold text-white">Menu</h2>
        <button
          onClick={onClose}
          className="text-gray-300 hover:text-white transition-colors"
        >
          <X className="h-6 w-6" />
        </button>
      </div>
      <nav className="flex-grow py-4">
        <Link
          to="/"
          className="flex items-center px-6 py-3 text-gray-300 hover:bg-gray-700 hover:text-white transition-colors"
          onClick={handleLinkClick}
        >
          <Home className="h-5 w-5 mr-3" />
          <span>Home</span>
        </Link>
        <Link
          to="/messages"
          className="flex items-center px-6 py-3 text-gray-300 hover:bg-gray-700 hover:text-white transition-colors"
          onClick={handleLinkClick}
        >
          <MessageSquare className="h-5 w-5 mr-3" />
          <span>Messages</span>
        </Link>
        {/*
         *<Link
         *  to="/settings"
         *  className="flex items-center px-6 py-3 text-gray-300 hover:bg-gray-700 hover:text-white transition-colors"
         *  onClick={handleLinkClick}
         *>
         *  <Settings className="h-5 w-5 mr-3" />
         *  <span>Settings</span>
         *</Link>
         */}
      </nav>
      <div className="p-4 bg-gray-700 text-gray-400 text-sm">
        © 2023 Poe2Stash
      </div>
    </div>
  );
};
