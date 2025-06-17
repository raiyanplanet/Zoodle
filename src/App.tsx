import { Authenticated, Unauthenticated, useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import { SignInForm } from "./SignInForm";

import { Toaster } from "sonner";
import { useState } from "react";
import { StreamTab } from "./components/StreamTab";
import { ProfileTab } from "./components/ProfileTab";
import { FollowingTab } from "./components/FollowingTab";

import { CompleteProfileModal } from "./components/CompleteProfileModal";
import { UserSearchModal } from "./components/UserSearchModal";
import { Id } from "../convex/_generated/dataModel";

export default function App() {
  return (
    <div className="min-h-screen flex flex-col bg-zinc-950">

      <main className="flex-1 overflow-y-auto">
        <Content />
      </main>
      <Toaster 
        theme="dark"
        toastOptions={{
          style: {
            background: '#18181b',
            color: '#f4f4f5',
            border: '1px solid #3f3f46',
          },
        }}
      />
    </div>
  );
}

function Content() {
  const loggedInUser = useQuery(api.users.getCurrentUser);
  const [activeTab, setActiveTab] = useState<"stream" | "following" | "profile">("stream");
  const [showCompleteProfile, setShowCompleteProfile] = useState(false);
  const [showUserSearch, setShowUserSearch] = useState(false);
  const [viewingUserId, setViewingUserId] = useState<Id<"users"> | undefined>();

  if (loggedInUser === undefined) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  // Check if user needs to complete profile
  const needsProfileCompletion = loggedInUser && (!loggedInUser.fullName || !loggedInUser.username);

  const tabs = [
    { id: "stream", label: "News Feed", icon: "🏠" },
    { id: "following", label: "Following", icon: "👥" },
    { id: "profile", label: "Profile", icon: "👤" },
  ];

  const handleUserSelect = (userId: Id<"users">) => {
    setViewingUserId(userId);
    setActiveTab("profile");
  };

  const handleChatWithUser = (userId: Id<"users">) => {
    // For now, just show the user's profile
    setViewingUserId(userId);
    setActiveTab("profile");
  };

  const handleTabChange = (tabId: string) => {
    if (tabId === "profile") {
      setViewingUserId(undefined); // Reset to own profile
    }
    setActiveTab(tabId as any);
  };

  return (
    <div className="min-h-screen">
      <Unauthenticated>
        <div className="text-center py-20 animate-fade-in">
          <div className="bg-zinc-900/50 backdrop-blur-sm border border-zinc-800 rounded-3xl p-12 max-w-md mx-auto">
            <h1 className="text-5xl font-bold bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500 bg-clip-text text-transparent mb-6">
              Welcome to PhotoStream
            </h1>
            <p className="text-xl text-zinc-400 mb-10">Share your moments with the world</p>
            <SignInForm />
          </div>
        </div>
      </Unauthenticated>

      <Authenticated>
        {/* Sticky Tab Bar */}
        <div className="sticky top-16 z-40 bg-zinc-950/95 backdrop-blur-md border-b border-zinc-800 px-4 py-3">
          <nav className="max-w-6xl mx-auto">
            <div className="flex space-x-1">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => handleTabChange(tab.id)}
                  className={`flex-1 py-3 px-4 rounded-xl font-semibold transition-all duration-300 ${
                    activeTab === tab.id
                      ? "bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg"
                      : "text-zinc-400 hover:text-white hover:bg-zinc-800/50"
                  }`}
                >
                  <div className="flex items-center justify-center gap-2">
                    <span className="text-lg">{tab.icon}</span>
                    <span className="hidden sm:inline text-sm">{tab.label}</span>
                  </div>
                </button>
              ))}

            </div>
          </nav>
        </div>

        <div className="max-w-6xl mx-auto p-4 animate-fade-in">
          {activeTab === "stream" && <StreamTab onUserSelect={handleUserSelect} onChatWithUser={handleChatWithUser} />}
          {activeTab === "following" && <FollowingTab onUserSelect={handleUserSelect} onChatWithUser={handleChatWithUser} />}
          {activeTab === "profile" && <ProfileTab userId={viewingUserId} onChatWithUser={handleChatWithUser} />}
        </div>

        <CompleteProfileModal
          isOpen={!!needsProfileCompletion && !showCompleteProfile}
          onClose={() => setShowCompleteProfile(true)}
        />

        <UserSearchModal
          isOpen={showUserSearch}
          onClose={() => setShowUserSearch(false)}
          onUserSelect={handleUserSelect}
        />
      </Authenticated>
    </div>
  );
}
