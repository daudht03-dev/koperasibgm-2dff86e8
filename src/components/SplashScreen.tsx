import { useEffect, useState } from "react";
import { Leaf } from "lucide-react";
import { useCompanyProfile } from "@/hooks/use-company-profile";

interface SplashScreenProps {
  onFinish: () => void;
  duration?: number;
}

const SplashScreen = ({ onFinish, duration = 2000 }: SplashScreenProps) => {
  const [isVisible, setIsVisible] = useState(true);
  const { profile } = useCompanyProfile();

  useEffect(() => {
    // Trigger haptic feedback on mount
    triggerHapticFeedback();
    
    // Play welcome sound (optional - will only work if user has interacted)
    playWelcomeSound();

    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(onFinish, 300); // Wait for fade-out animation
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onFinish]);

  // Haptic feedback function
  const triggerHapticFeedback = () => {
    // Check if Vibration API is supported
    if ('vibrate' in navigator) {
      try {
        // Gentle welcome pattern: short-pause-short (feels organic and welcoming)
        // Pattern: [vibrate, pause, vibrate, pause, vibrate]
        navigator.vibrate([50, 100, 30, 80, 50]);
      } catch (error) {
        console.log('Haptic feedback not supported');
      }
    }
  };

  // Sound effect function
  const playWelcomeSound = () => {
    try {
      // Create a subtle, organic sound using Web Audio API
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      // Create oscillator for a pleasant "organic" tone
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      // Natural, warm frequency (A note - 440Hz)
      oscillator.frequency.value = 440;
      oscillator.type = 'sine'; // Smooth, organic sound
      
      // Gentle fade in and out
      const now = audioContext.currentTime;
      gainNode.gain.setValueAtTime(0, now);
      gainNode.gain.linearRampToValueAtTime(0.08, now + 0.05); // Fade in
      gainNode.gain.linearRampToValueAtTime(0, now + 0.3); // Fade out
      
      oscillator.start(now);
      oscillator.stop(now + 0.3);
      
      // Add a second harmonic for richness
      const oscillator2 = audioContext.createOscillator();
      const gainNode2 = audioContext.createGain();
      
      oscillator2.connect(gainNode2);
      gainNode2.connect(audioContext.destination);
      
      oscillator2.frequency.value = 880; // One octave higher
      oscillator2.type = 'sine';
      
      gainNode2.gain.setValueAtTime(0, now);
      gainNode2.gain.linearRampToValueAtTime(0.04, now + 0.05);
      gainNode2.gain.linearRampToValueAtTime(0, now + 0.25);
      
      oscillator2.start(now + 0.05);
      oscillator2.stop(now + 0.35);
      
    } catch (error) {
      // Audio API not supported or failed - gracefully ignore
      console.log('Audio playback not available');
    }
  };

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-gradient-to-br from-organic-green via-organic-green to-organic-amber animate-fade-out overflow-hidden">
      {/* Animated background particles */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-32 h-32 bg-white/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: "0s", animationDuration: "3s" }} />
        <div className="absolute top-1/3 right-1/4 w-40 h-40 bg-organic-amber/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: "1s", animationDuration: "4s" }} />
        <div className="absolute bottom-1/4 left-1/3 w-36 h-36 bg-white/15 rounded-full blur-3xl animate-pulse" style={{ animationDelay: "0.5s", animationDuration: "3.5s" }} />
      </div>

      <div className="text-center space-y-8 animate-scale-in px-4 relative z-10">
        {/* Logo with enhanced animation */}
        <div className="relative">
          <div className="bg-white/95 backdrop-blur-lg w-32 h-32 rounded-[2rem] flex items-center justify-center mx-auto shadow-2xl shadow-organic-green/40 animate-float border-4 border-white/20 overflow-hidden">
            {profile?.logo_url ? (
              <img 
                src={profile.logo_url} 
                alt={profile.nama_perusahaan || "Logo"}
                className="w-full h-full object-cover"
              />
            ) : (
              <Leaf className="h-16 w-16 text-organic-green animate-gentle-spin" strokeWidth={2} />
            )}
          </div>
          
          {/* Enhanced decorative circles with glow */}
          <div className="absolute -top-3 -right-3 w-10 h-10 bg-organic-amber/80 rounded-full animate-bounce shadow-lg shadow-organic-amber/50" style={{ animationDelay: "0.2s" }} />
          <div className="absolute -bottom-3 -left-3 w-8 h-8 bg-white/80 rounded-full animate-bounce shadow-lg shadow-white/50" style={{ animationDelay: "0.4s" }} />
          <div className="absolute top-1/2 -right-4 w-6 h-6 bg-organic-green-light/60 rounded-full animate-bounce" style={{ animationDelay: "0.6s" }} />
        </div>

        {/* Company Name with enhanced styling */}
        <div className="space-y-3">
          <h1 className="text-4xl font-bold text-white tracking-tight drop-shadow-2xl animate-slide-up">
            {profile?.nama_perusahaan || "Berkah Gendis Mandiri"}
          </h1>
          <p className="text-white/95 text-base font-medium tracking-wide drop-shadow-lg animate-slide-up" style={{ animationDelay: "0.1s" }}>
            {profile?.deskripsi || "Gula Kelapa Organik Berkualitas"}
          </p>
        </div>

        {/* Enhanced loading indicator with shimmer */}
        <div className="flex justify-center">
          <div className="flex gap-3">
            <div className="w-2.5 h-2.5 bg-white rounded-full animate-bounce shadow-lg shadow-white/50" style={{ animationDelay: "0s" }} />
            <div className="w-2.5 h-2.5 bg-white rounded-full animate-bounce shadow-lg shadow-white/50" style={{ animationDelay: "0.15s" }} />
            <div className="w-2.5 h-2.5 bg-white rounded-full animate-bounce shadow-lg shadow-white/50" style={{ animationDelay: "0.3s" }} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default SplashScreen;
