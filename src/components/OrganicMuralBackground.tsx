import { cn } from "@/lib/utils";

interface OrganicMuralBackgroundProps {
  className?: string;
  variant?: "splash" | "auth";
}

/**
 * Low-opacity organic line-art mural for splash/login screens.
 * Renders as a fixed/absolute backdrop layer with pointer-events-none.
 */
export const OrganicMuralBackground = ({
  className,
  variant = "auth",
}: OrganicMuralBackgroundProps) => {
  const isSplash = variant === "splash";

  return (
    <div
      className={cn(
        "fixed inset-0 overflow-hidden pointer-events-none",
        isSplash ? "z-[1]" : "z-0",
        className
      )}
      aria-hidden="true"
    >
      {/* Top-left coconut palm silhouette cluster */}
      <div
        className="absolute -top-8 -left-8 w-[280px] h-[320px] sm:w-[360px] sm:h-[400px] opacity-[0.12] text-organic-green"
        style={{ transform: "rotate(-6deg)" }}
      >
        <svg
          viewBox="0 0 200 240"
          fill="none"
          className="w-full h-full organic-sway"
          style={{ transformOrigin: "50% 100%" }}
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Palm trunk — thin curved line */}
          <path
            d="M100 240 C102 200, 98 160, 105 120 C110 90, 120 60, 130 40"
            stroke="currentColor"
            strokeWidth="1.2"
            strokeLinecap="round"
            fill="none"
          />
          {/* Fronds — thin line silhouettes */}
          <path
            d="M130 40 C110 25, 80 20, 55 30"
            stroke="currentColor"
            strokeWidth="1"
            strokeLinecap="round"
            fill="none"
          />
          <path
            d="M130 40 C140 20, 165 10, 190 18"
            stroke="currentColor"
            strokeWidth="1"
            strokeLinecap="round"
            fill="none"
          />
          <path
            d="M130 40 C125 15, 120 5, 115 0"
            stroke="currentColor"
            strokeWidth="1"
            strokeLinecap="round"
            fill="none"
          />
          <path
            d="M130 40 C150 35, 175 40, 195 55"
            stroke="currentColor"
            strokeWidth="1"
            strokeLinecap="round"
            fill="none"
          />
          <path
            d="M130 40 C105 45, 75 50, 50 65"
            stroke="currentColor"
            strokeWidth="1"
            strokeLinecap="round"
            fill="none"
          />
          {/* Coconut cluster */}
          <circle cx="128" cy="46" r="3" stroke="currentColor" strokeWidth="0.8" fill="none" />
          <circle cx="134" cy="48" r="2.5" stroke="currentColor" strokeWidth="0.8" fill="none" />
          <circle cx="126" cy="52" r="2.5" stroke="currentColor" strokeWidth="0.8" fill="none" />

          {/* Secondary smaller palm to the right */}
          <path
            d="M70 240 C72 210, 68 180, 75 155"
            stroke="currentColor"
            strokeWidth="0.9"
            strokeLinecap="round"
            fill="none"
          />
          <path
            d="M75 155 C60 145, 45 148, 30 158"
            stroke="currentColor"
            strokeWidth="0.8"
            strokeLinecap="round"
            fill="none"
          />
          <path
            d="M75 155 C85 140, 100 135, 115 142"
            stroke="currentColor"
            strokeWidth="0.8"
            strokeLinecap="round"
            fill="none"
          />
          <path
            d="M75 155 C70 135, 68 125, 66 118"
            stroke="currentColor"
            strokeWidth="0.8"
            strokeLinecap="round"
            fill="none"
          />
        </svg>
      </div>

      {/* Bottom-right coconut / leaf cluster */}
      <div
        className="absolute -bottom-10 -right-10 w-[260px] h-[300px] sm:w-[340px] sm:h-[380px] opacity-[0.10] text-organic-amber"
        style={{ transform: "rotate(8deg)" }}
      >
        <svg
          viewBox="0 0 200 240"
          fill="none"
          className="w-full h-full organic-sway-reverse"
          style={{ transformOrigin: "50% 100%" }}
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Curved trunk */}
          <path
            d="M90 240 C88 200, 95 160, 85 120 C78 90, 60 65, 45 45"
            stroke="currentColor"
            strokeWidth="1.2"
            strokeLinecap="round"
            fill="none"
          />
          {/* Fronds */}
          <path
            d="M45 45 C30 30, 10 28, 0 35"
            stroke="currentColor"
            strokeWidth="1"
            strokeLinecap="round"
            fill="none"
          />
          <path
            d="M45 45 C55 22, 75 12, 100 15"
            stroke="currentColor"
            strokeWidth="1"
            strokeLinecap="round"
            fill="none"
          />
          <path
            d="M45 45 C40 18, 38 8, 36 0"
            stroke="currentColor"
            strokeWidth="1"
            strokeLinecap="round"
            fill="none"
          />
          <path
            d="M45 45 C65 40, 90 45, 115 58"
            stroke="currentColor"
            strokeWidth="1"
            strokeLinecap="round"
            fill="none"
          />
          <path
            d="M45 45 C25 52, 5 62, -10 78"
            stroke="currentColor"
            strokeWidth="1"
            strokeLinecap="round"
            fill="none"
          />

          {/* Floating coconut leaves scattered */}
          <path
            d="M160 200 C150 185, 150 165, 165 155 C180 165, 180 185, 170 200 C175 190, 190 185, 200 190"
            stroke="currentColor"
            strokeWidth="0.9"
            strokeLinecap="round"
            fill="none"
          />
          <path
            d="M140 120 C130 105, 132 88, 148 80 C162 88, 162 105, 152 120"
            stroke="currentColor"
            strokeWidth="0.8"
            strokeLinecap="round"
            fill="none"
          />
          <path
            d="M170 60 C160 48, 162 32, 178 25 C190 32, 190 48, 180 60"
            stroke="currentColor"
            strokeWidth="0.8"
            strokeLinecap="round"
            fill="none"
          />
        </svg>
      </div>

      {/* Subtle mid accent leaves for visual balance on larger screens */}
      <div className="hidden sm:block absolute top-1/2 -right-4 w-24 h-32 opacity-[0.08] text-organic-green -translate-y-1/2 rotate-12">
        <svg
          viewBox="0 0 80 120"
          fill="none"
          className="w-full h-full organic-sway"
          style={{ transformOrigin: "50% 100%" }}
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M40 120 C38 90, 42 60, 35 30"
            stroke="currentColor"
            strokeWidth="1"
            strokeLinecap="round"
            fill="none"
          />
          <path
            d="M35 30 C20 22, 8 25, 0 32"
            stroke="currentColor"
            strokeWidth="0.9"
            strokeLinecap="round"
            fill="none"
          />
          <path
            d="M35 30 C50 20, 62 22, 72 30"
            stroke="currentColor"
            strokeWidth="0.9"
            strokeLinecap="round"
            fill="none"
          />
          <path
            d="M35 30 C34 12, 33 4, 32 0"
            stroke="currentColor"
            strokeWidth="0.9"
            strokeLinecap="round"
            fill="none"
          />
        </svg>
      </div>
    </div>
  );
};

export default OrganicMuralBackground;
