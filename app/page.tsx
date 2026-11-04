import { PublicLanguageSelector } from "@/components/PublicLanguageSelector";
import { LandingContent } from "@/components/LandingContent";

export default function Home() {
  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden bg-v-navy">
      <PublicLanguageSelector />
      {/* Background Image with Overlay */}
      <div className="absolute inset-0 z-0 overflow-hidden">
        <video
          className="h-full w-full object-cover scale-100 blur-md"
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          poster="/videos/aimers-2027-poster.webp"
          aria-hidden="true"
        >
          <source
            src="/videos/aimers-2027.mp4"
            type="video/mp4"
            media="(min-width: 640px) and (prefers-reduced-motion: no-preference)"
          />
        </video>

        {/* Overlay para contraste */}
        <div className="absolute inset-0 bg-linear-to-b from-v-navy/30 via-v-navy/70 to-v-navy" />
      </div>

      {/* Content */}
      <LandingContent />

      {/* Floating HUD elements for flavor */}
      <div className="absolute bottom-10 left-10 w-24 h-px bg-v-white/10 hidden sm:block" />
      <div className="absolute top-1/2 -right-12 w-32 h-px bg-v-white/10 rotate-90 hidden sm:block" />
    </div>
  );
}
