import { Calendar, Video, Shield, CheckCircle2, Star, Trophy } from "lucide-react";
import vgHeadshot from "@/assets/vg.png";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export const BookingHero = () => {
  return (
    <section className="relative bg-background border-b border-border pt-32 pb-12 px-4 sm:px-6 lg:px-8 font-sans overflow-hidden">
      {/* Chess Pattern Background */}
      <div className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05] pointer-events-none"
        style={{
          backgroundImage: `radial-gradient(#9CA3AF 1px, transparent 1px)`,
          backgroundSize: '24px 24px'
        }}
      />

      <div className="max-w-5xl mx-auto relative z-10">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-8">

          {/* Left Side: Profile & Intro */}
          <div className="flex-1 space-y-6">
            <div className="flex items-center gap-4">
              <div className="relative group cursor-pointer">
                <Avatar className="h-24 w-24 border-4 border-background shadow-xl transition-transform group-hover:scale-105">
                  <AvatarImage src={vgHeadshot} alt="Vidit Gujrathi" className="object-cover" />
                  <AvatarFallback className="text-2xl font-bold bg-muted text-muted-foreground">VG</AvatarFallback>
                </Avatar>
                <div className="absolute bottom-1 right-1 bg-green-500 h-6 w-6 rounded-full border-4 border-background" title="Available"></div>
              </div>
              <div>
                <h1 className="text-4xl font-bold text-foreground tracking-tight flex items-center gap-2">

                  Vidit Gujrathi
                </h1>
              </div>
            </div>

            <div className="space-y-4 max-w-2xl">
              <h2 className="text-4xl sm:text-5xl font-extrabold text-foreground tracking-tight leading-tight">
                Master Your Game with <br className="hidden sm:block" />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-foreground to-muted-foreground">
                  Grandmaster Strategy
                </span>
              </h2>
              <p className="text-lg text-muted-foreground leading-relaxed">
                Book a personalized 1-on-1 consultation to analyze your games, build a solid opening repertoire, and refine your endgame technique.
              </p>
            </div>

            <div className="flex flex-wrap gap-3 pt-2">
              <div className="inline-flex items-center px-4 py-1.5 rounded-full bg-secondary/80 border border-border/50 text-secondary-foreground text-sm font-medium shadow-sm backdrop-blur-sm transition-colors hover:bg-secondary">
                <Video className="w-4 h-4 mr-2 text-primary" />
                Google Meet
              </div>
              <div className="inline-flex items-center px-4 py-1.5 rounded-full bg-secondary/80 border border-border/50 text-secondary-foreground text-sm font-medium shadow-sm backdrop-blur-sm transition-colors hover:bg-secondary">
                <Shield className="w-4 h-4 mr-2 text-primary" />
                Solana Payments
              </div>
              <div className="inline-flex items-center px-4 py-1.5 rounded-full bg-secondary/80 border border-border/50 text-secondary-foreground text-sm font-medium shadow-sm backdrop-blur-sm transition-colors hover:bg-secondary">
                <Calendar className="w-4 h-4 mr-2 text-primary" />
                Flexible Scheduling
              </div>
            </div>
          </div>

          {/* Right Side: Stats/Social Proof (Optional decorative element) */}
          <div className="hidden md:block w-full md:w-auto">
            <div className="bg-card rounded-2xl p-6 border border-border shadow-sm max-w-xs">
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="bg-green-100 dark:bg-green-900/30 p-2 rounded-lg">
                    <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">Verified GM</p>
                    <p className="text-sm text-muted-foreground">FIDE Certified</p>
                  </div>
                </div>
                <div className="h-px bg-border w-full"></div>
                <div className="flex items-start gap-3">
                  <div className="bg-blue-100 dark:bg-blue-900/30 p-2 rounded-lg">
                    <Shield className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">Secure Booking</p>
                    <p className="text-sm text-muted-foreground">Powered by Solana</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
