'use client';

import { Header } from "@/components/app/header";
import { ScheduleAnalyzer } from "@/components/app/schedule-analyzer";
import { useUser } from "@/firebase/auth/use-user";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Loader2 } from "lucide-react";
import { useFirestore } from "@/firebase";

export default function Home() {
  const { user, loading: userLoading } = useUser();
  const firestore = useFirestore(); // Get firestore instance
  const router = useRouter();

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!userLoading && !user) {
      router.push('/login');
    }
  }, [user, userLoading, router]);
  
  // The firestore instance is also initialized asynchronously. 
  // We need to wait for both the user and firestore to be ready.
  const isReady = !userLoading && !!user && !!firestore;

  if (!isReady) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="sr-only">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />
      <main className="container mx-auto px-4 pb-12">
        <ScheduleAnalyzer />
      </main>
    </div>
  );
}
