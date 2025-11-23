import { useState, useEffect } from "react";
import { useWallet, useConnection } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { PublicKey, Transaction, SystemProgram, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { Button } from "@/components/ui/button";
import { Calendar as CalendarIcon, Clock, Video, ArrowRight, CheckCircle2, Loader2, Globe, CreditCard, ChevronLeft, Copy, Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { addDays, format, setHours, setMinutes, isSameDay } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

const BOOKING_PRICE_SOL = 0.1;
const RECIPIENT_WALLET = "9YsbyWnNegmSvUPoXqt4qo1km9grX8dBc6gQz7PAKEGY";
const GOOGLE_MEET_URL = "https://meet.google.com/esx-yrtb-jxu";

interface TimeSlot {
  id: string;
  date: string;
  time: string;
  available: boolean;
  timestamp: Date;
}

export const BookingFlow = () => {
  const { connection } = useConnection();
  const { publicKey, sendTransaction } = useWallet();
  const { toast } = useToast();

  const [date, setDate] = useState<Date | undefined>(addDays(new Date(), 1));
  const [selectedSlot, setSelectedSlot] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [bookingComplete, setBookingComplete] = useState(false);
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [isLoadingSlots, setIsLoadingSlots] = useState(true);
  const [copiedDetail, setCopiedDetail] = useState<string | null>(null);

  // Generate dynamic time slots for the next few days
  useEffect(() => {
    const generateSlots = () => {
      setIsLoadingSlots(true);
      const slots: TimeSlot[] = [];
      const today = new Date();

      // Generate slots for next 7 days to populate the calendar better
      for (let i = 1; i <= 7; i++) {
        const currentDate = addDays(today, i);

        // Slot 1: 10:00 AM
        const slot1 = setHours(setMinutes(currentDate, 0), 10);
        slots.push({
          id: `${format(currentDate, 'yyyy-MM-dd')}-1000`,
          date: format(currentDate, 'MMM dd, yyyy'),
          time: "10:00 AM",
          available: true,
          timestamp: slot1
        });

        // Slot 2: 2:00 PM
        const slot2 = setHours(setMinutes(currentDate, 0), 14);
        slots.push({
          id: `${format(currentDate, 'yyyy-MM-dd')}-1400`,
          date: format(currentDate, 'MMM dd, yyyy'),
          time: "2:00 PM",
          available: true,
          timestamp: slot2
        });

        // Slot 3: 4:00 PM
        const slot3 = setHours(setMinutes(currentDate, 0), 16);
        slots.push({
          id: `${format(currentDate, 'yyyy-MM-dd')}-1600`,
          date: format(currentDate, 'MMM dd, yyyy'),
          time: "4:00 PM",
          available: true,
          timestamp: slot3
        });
      }

      setTimeout(() => {
        setTimeSlots(slots);
        setIsLoadingSlots(false);
      }, 500);
    };

    generateSlots();
  }, []);

  const handlePayment = async () => {
    if (!publicKey || !selectedSlot) {
      toast({
        title: "Error",
        description: "Please connect your wallet and select a time slot",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);

    try {
      // 1. Check availability first (Race condition fix)
      const selectedSlotInfo = timeSlots.find(slot => slot.id === selectedSlot);
      if (!selectedSlotInfo) throw new Error("Invalid slot");

      const slotText = `${selectedSlotInfo.date} at ${selectedSlotInfo.time}`;

      const { data: existingBooking } = await supabase
        .from("bookings")
        .select("id")
        .eq("selected_slot", slotText)
        .maybeSingle();

      if (existingBooking) {
        throw new Error("This slot has already been booked. Please select another time.");
      }

      // 2. Prepare Transaction
      const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();

      const transaction = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: publicKey,
          toPubkey: new PublicKey(RECIPIENT_WALLET),
          lamports: BOOKING_PRICE_SOL * LAMPORTS_PER_SOL,
        })
      );

      // 3. Send and Confirm Transaction (Modern Pattern)
      const signature = await sendTransaction(transaction, connection);

      toast({
        title: "Processing Payment",
        description: "Transaction sent. Waiting for confirmation...",
      });

      await connection.confirmTransaction({
        signature,
        blockhash,
        lastValidBlockHeight
      }, "confirmed");

      // 4. Save booking to database AFTER payment
      const { error: dbError } = await supabase
        .from("bookings")
        .insert({
          wallet_address: publicKey.toBase58(),
          transaction_signature: signature,
          selected_slot: slotText,
          amount_sol: BOOKING_PRICE_SOL,
          google_meet_url: GOOGLE_MEET_URL,
          booking_status: "confirmed",
        });

      if (dbError) {
        console.error("Error saving booking:", dbError);
        toast({
          title: "Booking Error",
          description: `Payment successful (Sig: ${signature.slice(0, 8)}...) but booking save failed. Please contact support with your signature.`,
          variant: "destructive",
          duration: 10000,
        });
        setBookingComplete(true);
        return;
      }

      toast({
        title: "Payment Successful!",
        description: "Your booking has been confirmed.",
      });

      setBookingComplete(true);
    } catch (error: any) {
      console.error("Payment error:", error);
      toast({
        title: "Payment Failed",
        description: error.message || "There was an error processing your payment. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedDetail(label);
    toast({
      title: "Copied!",
      description: `${label} copied to clipboard`,
    });
    setTimeout(() => setCopiedDetail(null), 2000);
  };

  const addToGoogleCalendar = () => {
    const selectedSlotInfo = timeSlots.find(slot => slot.id === selectedSlot);
    if (!selectedSlotInfo) return;

    const startTime = selectedSlotInfo.timestamp;
    const endTime = new Date(startTime.getTime() + 60 * 60 * 1000); // 1 hour later

    const googleCalendarUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=Chess+Consultation+with+Vidit+Gujrathi&dates=${format(startTime, "yyyyMMdd'T'HHmmss")}/${format(endTime, "yyyyMMdd'T'HHmmss")}&details=Online+chess+consultation+session.+Meet+link:+${encodeURIComponent(GOOGLE_MEET_URL)}&location=${encodeURIComponent(GOOGLE_MEET_URL)}`;

    window.open(googleCalendarUrl, '_blank');
  };

  // Filter slots for the selected date
  const availableSlotsForDate = date
    ? timeSlots.filter(slot => isSameDay(slot.timestamp, date))
    : [];

  if (bookingComplete) {
    const selectedSlotInfo = timeSlots.find(slot => slot.id === selectedSlot);

    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-card rounded-xl shadow-lg border border-border p-8 text-center animate-fade-in">
          <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-6 animate-bounce">
            <CheckCircle2 className="w-10 h-10 text-green-600 dark:text-green-400" />
          </div>
          <h2 className="text-3xl font-bold text-foreground mb-2">Booking Confirmed!</h2>
          <p className="text-muted-foreground mb-8">You are scheduled with Vidit Gujrathi.</p>

          <div className="space-y-3 text-left bg-muted/50 p-5 rounded-lg border border-border mb-8">
            <div className="flex items-center justify-between group">
              <div className="flex items-center gap-3 text-foreground">
                <CalendarIcon className="w-5 h-5 text-primary" />
                <span className="font-medium">{selectedSlotInfo?.date}</span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => copyToClipboard(selectedSlotInfo?.date || "", "Date")}
                className="opacity-0 group-hover:opacity-100 transition-opacity"
              >
                {copiedDetail === "Date" ? <CheckCircle2 className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              </Button>
            </div>

            <div className="flex items-center justify-between group">
              <div className="flex items-center gap-3 text-foreground">
                <Clock className="w-5 h-5 text-primary" />
                <span className="font-medium">{selectedSlotInfo?.time}</span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => copyToClipboard(selectedSlotInfo?.time || "", "Time")}
                className="opacity-0 group-hover:opacity-100 transition-opacity"
              >
                {copiedDetail === "Time" ? <CheckCircle2 className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              </Button>
            </div>

            <div className="flex items-center justify-between group">
              <div className="flex items-center gap-3 text-foreground">
                <Video className="w-5 h-5 text-primary" />
                <a href={GOOGLE_MEET_URL} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline font-medium truncate">
                  Google Meet
                </a>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => copyToClipboard(GOOGLE_MEET_URL, "Meet Link")}
                className="opacity-0 group-hover:opacity-100 transition-opacity"
              >
                {copiedDetail === "Meet Link" ? <CheckCircle2 className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              </Button>
            </div>
          </div>

          <div className="flex gap-3">
            <Button variant="outline" className="flex-1" onClick={() => window.location.reload()}>
              Book Another
            </Button>
            <Button
              onClick={addToGoogleCalendar}
              className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90"
            >
              <Download className="w-4 h-4 mr-2" />
              Add to Calendar
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <section id="booking" className="py-12 px-4 sm:px-6 lg:px-8 bg-background min-h-screen flex items-center justify-center font-sans">
      <div className="max-w-6xl w-full bg-card rounded-xl shadow-lg border border-border overflow-hidden flex flex-col md:flex-row min-h-[600px]">

        {/* Left Panel: Event Details */}
        <div className="w-full md:w-[30%] p-8 border-b md:border-b-0 md:border-r border-border bg-muted/30">
          <div className="mb-6">
            <span className="text-muted-foreground font-medium text-sm">Vidit Gujrathi</span>
            <h1 className="text-2xl font-bold text-foreground mt-1">Chess Consultation</h1>
          </div>

          <div className="space-y-4 text-muted-foreground">
            <div className="flex items-center gap-3">
              <Clock className="w-5 h-5 text-primary" />
              <span>60 min</span>
            </div>
            <div className="flex items-center gap-3">
              <Video className="w-5 h-5 text-primary" />
              <span>Google Meet</span>
            </div>
            <div className="flex items-center gap-3">
              <CreditCard className="w-5 h-5 text-primary" />
              <span className="font-semibold text-foreground">{BOOKING_PRICE_SOL} SOL</span>
            </div>
            <div className="flex items-center gap-3">
              <Globe className="w-5 h-5 text-primary" />
              <span>Asia/Calcutta</span>
            </div>
          </div>

          <div className="mt-8 pt-8 border-t border-border">
            <p className="text-sm text-muted-foreground leading-relaxed">
              Expert chess consultation to improve your game strategy, opening repertoire, and endgame techniques.
            </p>
          </div>
        </div>

        {/* Middle Panel: Calendar */}
        <div className="w-full md:w-[40%] p-8 border-b md:border-b-0 md:border-r border-border flex flex-col items-center relative">
          <h3 className="text-lg font-semibold text-foreground mb-6 self-start flex items-center gap-2">
            <CalendarIcon className="w-5 h-5 text-primary" />
            Select a Date
          </h3>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant={"outline"}
                className={cn(
                  "w-full justify-between text-left font-normal h-12 text-base border-2 hover:border-primary/50 transition-all hover:shadow-md",
                  !date && "text-muted-foreground"
                )}
              >
                <span className="flex items-center">
                  <CalendarIcon className="mr-3 h-5 w-5 text-muted-foreground" />
                  {date ? format(date, "PPP") : <span>Pick a date</span>}
                </span>
                <ChevronLeft className="h-4 w-4 rotate-270 text-muted-foreground" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="center">
              <Calendar
                mode="single"
                selected={date}
                onSelect={setDate}
                disabled={(day) => !timeSlots.some(slot => isSameDay(slot.timestamp, day))}
                initialFocus
                className="rounded-md border border-border p-4 shadow-xl bg-card"
                classNames={{
                  day_selected: "bg-primary text-primary-foreground hover:bg-primary/90 focus:bg-primary",
                  day_today: "bg-muted text-foreground font-bold ring-2 ring-primary/20",
                }}
              />
            </PopoverContent>
          </Popover>

          <p className="text-xs text-muted-foreground mt-4 text-center max-w-[250px]">
            Available dates are highlighted. Select a date to see available time slots.
          </p>
        </div>

        {/* Right Panel: Time Slots */}
        <div className="w-full md:w-[30%] p-6 bg-card flex flex-col">
          <h3 className="text-lg font-semibold text-foreground mb-6">
            {date ? format(date, "EEEE, MMM do") : "Select a date"}
          </h3>

          <div className="flex-1 overflow-y-auto pr-2 space-y-3">
            {isLoadingSlots ? (
              // Skeleton loader
              <>
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-12 bg-muted/50 rounded-md animate-pulse" />
                ))}
              </>
            ) : date && availableSlotsForDate.length > 0 ? (
              availableSlotsForDate.map((slot) => (
                <div key={slot.id} className="flex gap-2">
                  <button
                    onClick={() => setSelectedSlot(slot.id)}
                    className={cn(
                      "flex-1 py-3 px-4 rounded-md font-medium text-sm transition-all border-2 hover:scale-[1.02] active:scale-[0.98]",
                      selectedSlot === slot.id
                        ? "bg-primary text-primary-foreground border-primary shadow-lg shadow-primary/20"
                        : "bg-card text-foreground border-border hover:border-primary/50 hover:bg-muted hover:shadow-md"
                    )}
                  >
                    {slot.time}
                  </button>
                </div>
              ))
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-muted-foreground text-sm">
                <CalendarIcon className="w-12 h-12 mb-3 opacity-20" />
                <p className="font-medium">No slots available</p>
                <p className="text-xs mt-1">Please select another date</p>
              </div>
            )}
          </div>

          {/* Payment/Confirm Action - Only show when slot selected */}
          {selectedSlot && (
            <div className="mt-6 pt-6 border-t border-border animate-fade-in">
              {!publicKey ? (
                <WalletMultiButton className="!w-full !bg-primary hover:!bg-primary/90 !h-12 !rounded-md !font-medium !transition-all hover:!shadow-lg" />
              ) : (
                <Button
                  onClick={handlePayment}
                  disabled={isProcessing}
                  className="w-full bg-primary hover:bg-primary/90 text-primary-foreground h-12 font-medium text-base transition-all hover:shadow-lg hover:scale-[1.02] active:scale-[0.98]"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Processing
                    </>
                  ) : (
                    <>
                      Confirm Booking
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </>
                  )}
                </Button>
              )}
              {publicKey && (
                <p className="text-xs text-center text-muted-foreground mt-3">
                  Wallet: {publicKey.toBase58().slice(0, 4)}...{publicKey.toBase58().slice(-4)}
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  );
};
