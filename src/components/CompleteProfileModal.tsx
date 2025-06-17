import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { toast } from "sonner";

interface CompleteProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CompleteProfileModal({ isOpen, onClose }: CompleteProfileModalProps) {
  const [formData, setFormData] = useState({
    fullName: "",
    username: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const completeProfile = useMutation(api.users.completeProfile);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.fullName.trim() || !formData.username.trim()) {
      toast.error("Please fill in all fields");
      return;
    }

    setIsSubmitting(true);
    try {
      await completeProfile({
        fullName: formData.fullName.trim(),
        username: formData.username.trim().toLowerCase(),
      });
      toast.success("Profile completed!");
      onClose();
    } catch (error: any) {
      console.error("Failed to complete profile:", error);
      toast.error(error.message || "Failed to complete profile");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 max-w-md w-full">
        <h2 className="text-2xl font-bold text-white mb-2">Complete Your Profile</h2>
        <p className="text-zinc-400 mb-6">Let's set up your profile to get started</p>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2">
              Full Name
            </label>
            <input
              type="text"
              value={formData.fullName}
              onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
              className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white placeholder-zinc-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all"
              placeholder="Enter your full name"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2">
              Username
            </label>
            <input
              type="text"
              value={formData.username}
              onChange={(e) => setFormData({ ...formData, username: e.target.value.toLowerCase() })}
              className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white placeholder-zinc-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all"
              placeholder="Choose a username"
              pattern="[a-z0-9_]+"
              title="Username can only contain lowercase letters, numbers, and underscores"
              required
            />
            <p className="text-xs text-zinc-500 mt-1">
              Only lowercase letters, numbers, and underscores allowed
            </p>
          </div>
          
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full px-6 py-3 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? "Completing..." : "Complete Profile"}
          </button>
        </form>
      </div>
    </div>
  );
}
