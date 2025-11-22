import { useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { Connection, PublicKey, Transaction, SystemProgram, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, Clock, Video, ArrowRight, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const BOOKING_PRICE_SOL = 0.1;
const RECIPIENT_WALLET = "9YsbyWnNegmSvUPoXqt4qo1km9grX8dBc6gQz7PAKEGY";
const GOOGLE_MEET_URL = "https://meet.google.com/esx-yrtb-jxu";

export const BookingFlow = () => {
  const { publicKey, sendTransaction } = useWallet();
  const { toast } = useToast();
  const [selectedSlot, setSelectedSlot] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [bookingComplete, setBookingComplete] = useState(false);

  const timeSlots = [
    { id: "1", date: "Jan 28, 2025", time: "10:00 AM - 11:00 AM", available: true },
    { id: "2", date: "Jan 28, 2025", time: "2:00 PM - 3:00 PM", available: true },
    { id: "3", date: "Jan 29, 2025", time: "11:00 AM - 12:00 PM", available: true },
    { id: "4", date: "Jan 29, 2025", time: "4:00 PM - 5:00 PM", available: true },
  ];

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
      const connection = new Connection("https://api.mainnet-beta.solana.com", "confirmed");
      
      const transaction = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: publicKey,
          toPubkey: new PublicKey(RECIPIENT_WALLET),
          lamports: BOOKING_PRICE_SOL * LAMPORTS_PER_SOL,
        })
      );

      const signature = await sendTransaction(transaction, connection);
      await connection.confirmTransaction(signature, "confirmed");

      // Save booking to database
      const selectedSlotInfo = timeSlots.find(slot => slot.id === selectedSlot);
      const slotText = selectedSlotInfo 
        ? `${selectedSlotInfo.date} at ${selectedSlotInfo.time}` 
        : selectedSlot;

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
          title: "Warning",
          description: "Payment confirmed but failed to save booking. Please contact support.",
          variant: "destructive",
        });
      }

      toast({
        title: "Payment Successful!",
        description: "Your booking has been confirmed.",
      });

      setBookingComplete(true);
    } catch (error) {
      console.error("Payment error:", error);
      toast({
        title: "Payment Failed",
        description: "There was an error processing your payment. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  if (bookingComplete) {
    return (
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl mx-auto">
          <Card className="border-chess-gold/20 bg-gradient-to-br from-background to-chess-gold/5">
            <CardHeader className="text-center">
              <div className="flex justify-center mb-4">
                <div className="w-16 h-16 rounded-full bg-chess-gold/20 flex items-center justify-center">
                  <CheckCircle className="w-10 h-10 text-chess-gold" />
                </div>
              </div>
              <CardTitle className="text-3xl font-display">Booking Confirmed!</CardTitle>
              <CardDescription>Your chess consultation is all set</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="p-6 bg-muted rounded-lg space-y-4">
                <div className="flex items-start gap-3">
                  <Calendar className="w-5 h-5 text-chess-gold mt-0.5" />
                  <div>
                    <p className="font-semibold">Selected Time</p>
                    <p className="text-muted-foreground">
                      {timeSlots.find(slot => slot.id === selectedSlot)?.date} at{" "}
                      {timeSlots.find(slot => slot.id === selectedSlot)?.time}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Video className="w-5 h-5 text-chess-gold mt-0.5" />
                  <div>
                    <p className="font-semibold">Meeting Link</p>
                    <a 
                      href={GOOGLE_MEET_URL}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-chess-gold hover:underline break-all"
                    >
                      {GOOGLE_MEET_URL}
                    </a>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-chess-gold mt-0.5" />
                  <div>
                    <p className="font-semibold">Payment Confirmed</p>
                    <p className="text-muted-foreground">0.1 SOL</p>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-chess-gold/10 border border-chess-gold/20 rounded-lg">
                <p className="text-sm text-center">
                  A confirmation email has been sent with all the details. See you soon!
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>
    );
  }

  return (
    <section className="py-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto">
        <div className="grid lg:grid-cols-2 gap-8">
          {/* Time Slot Selection */}
          <Card className="border-border">
            <CardHeader>
              <CardTitle className="font-display">Select Your Time Slot</CardTitle>
              <CardDescription>Choose a convenient time for your consultation</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {timeSlots.map((slot) => (
                  <button
                    key={slot.id}
                    onClick={() => setSelectedSlot(slot.id)}
                    disabled={!slot.available}
                    className={`w-full p-4 rounded-lg border-2 transition-all text-left ${
                      selectedSlot === slot.id
                        ? "border-chess-gold bg-chess-gold/10"
                        : "border-border hover:border-chess-gold/50 hover:bg-muted"
                    } ${!slot.available && "opacity-50 cursor-not-allowed"}`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold">{slot.date}</p>
                        <p className="text-sm text-muted-foreground flex items-center gap-2 mt-1">
                          <Clock className="w-4 h-4" />
                          {slot.time}
                        </p>
                      </div>
                      {selectedSlot === slot.id && (
                        <CheckCircle className="w-5 h-5 text-chess-gold" />
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Payment Section */}
          <Card className="border-chess-gold/20 bg-gradient-to-br from-background to-chess-gold/5">
            <CardHeader>
              <CardTitle className="font-display">Complete Your Booking</CardTitle>
              <CardDescription>Connect your Solana wallet and confirm payment</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="p-6 bg-background rounded-lg space-y-4">
                <div className="flex justify-between items-center pb-4 border-b border-border">
                  <span className="text-muted-foreground">Session Duration</span>
                  <span className="font-semibold">60 minutes</span>
                </div>
                <div className="flex justify-between items-center pb-4 border-b border-border">
                  <span className="text-muted-foreground">Platform</span>
                  <span className="font-semibold">Google Meet</span>
                </div>
                <div className="flex justify-between items-center text-lg">
                  <span className="font-semibold">Total Amount</span>
                  <span className="font-bold text-chess-gold">{BOOKING_PRICE_SOL} SOL</span>
                </div>
              </div>

              <div className="space-y-4">
                {!publicKey ? (
                  <div className="flex flex-col items-center gap-4 p-6 bg-muted rounded-lg">
                    <p className="text-center text-sm text-muted-foreground">
                      Connect your Solana wallet to proceed with booking
                    </p>
                    <WalletMultiButton className="!bg-chess-gold hover:!bg-chess-gold/90 !text-chess-dark !font-semibold !rounded-lg" />
                  </div>
                ) : (
                  <>
                    <div className="p-4 bg-chess-gold/10 border border-chess-gold/20 rounded-lg">
                      <p className="text-sm text-center">
                        Wallet connected: {publicKey.toBase58().slice(0, 4)}...
                        {publicKey.toBase58().slice(-4)}
                      </p>
                    </div>
                    <Button
                      onClick={handlePayment}
                      disabled={!selectedSlot || isProcessing}
                      className="w-full bg-chess-gold hover:bg-chess-gold/90 text-chess-dark font-semibold h-12 text-lg"
                    >
                      {isProcessing ? (
                        "Processing..."
                      ) : (
                        <>
                          Pay {BOOKING_PRICE_SOL} SOL & Book
                          <ArrowRight className="ml-2 w-5 h-5" />
                        </>
                      )}
                    </Button>
                  </>
                )}
              </div>

              {!selectedSlot && publicKey && (
                <p className="text-sm text-center text-muted-foreground">
                  Please select a time slot to continue
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
};
