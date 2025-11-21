import { useEffect, useState } from "react";
import { Leaf } from "lucide-react";

interface SplashScreenProps {
  onFinish: () => void;
  duration?: number;
}

const SplashScreen = ({ onFinish, duration = 2000 }: SplashScreenProps) => {
  const [isVisible, setIsVisible] = useState(true);

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
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-gradient-to-br from-organic-green via-organic-green to-organic-amber animate-fade-out">
      <div className="text-center space-y-8 animate-scale-in px-4">
        {/* Logo */}
        <div className="relative">
          <div className="bg-white/90 backdrop-blur-sm w-28 h-28 rounded-3xl flex items-center justify-center mx-auto shadow-2xl shadow-organic-green/30 animate-pulse">
            <Leaf className="h-14 w-14 text-organic-green" strokeWidth={2.5} />
          </div>
          
          {/* Decorative circles */}
          <div className="absolute -top-2 -right-2 w-8 h-8 bg-organic-amber/60 rounded-full animate-bounce" style={{ animationDelay: "0.2s" }} />
          <div className="absolute -bottom-2 -left-2 w-6 h-6 bg-white/50 rounded-full animate-bounce" style={{ animationDelay: "0.4s" }} />
        </div>

        {/* Company Name */}
        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-white tracking-tight drop-shadow-lg">
            Berkah Gendis Mandiri
          </h1>
          <p className="text-white/90 text-sm font-medium tracking-wide drop-shadow">
            Gula Kelapa Organik Berkualitas
          </p>
        </div>

        {/* Loading indicator */}
        <div className="flex justify-center">
          <div className="flex gap-2">
            <div className="w-2 h-2 bg-white rounded-full animate-bounce" style={{ animationDelay: "0s" }} />
            <div className="w-2 h-2 bg-white rounded-full animate-bounce" style={{ animationDelay: "0.1s" }} />
            <div className="w-2 h-2 bg-white rounded-full animate-bounce" style={{ animationDelay: "0.2s" }} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default SplashScreen;
