
'use client';

import { Header } from "@/components/app/header";
import { ScheduleAnalyzer } from "@/components/app/schedule-analyzer";
import { useUser } from "@/firebase/auth/use-user";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Loader2 } from "lucide-react";
import { useFirestore, useDoc, useMemoFirebase } from "@/firebase";
import type { UserProfile } from "@/lib/types";
import { doc } from "firebase/firestore";
import { TeacherDashboard } from "@/components/app/teacher-dashboard";

export default function Home() {
  const { user, loading: userLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!userLoading && !user) {
      router.push('/login');
    }
  }, [user, userLoading, router]);

  const userProfileQuery = useMemoFirebase(() => {
    if (!firestore || !user?.uid) return null;
    return doc(firestore, "users", user.uid);
  }, [firestore, user?.uid]);
  const { data: userProfile, loading: userProfileLoading } = useDoc<UserProfile>(userProfileQuery);

  const isReady = !userLoading && !!user && !userProfileLoading && !!userProfile && !!firestore;

  if (!isReady) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="sr-only">Loading...</p>
      </div>
    );
  }

  // TODO: Add Teacher and Admin dashboards
  if (userProfile.role === 'teacher') {
    return (
        <div className="min-h-screen bg-background text-foreground">
         <Header />
         <main className="container mx-auto px-4 pb-12">
            <TeacherDashboard teacher={userProfile} />
         </main>
        </div>
    )
  }

  if (userProfile.role === 'admin') {
     return (
        <div className="min-h-screen bg-background text-foreground">
         <Header />
         <main className="container mx-auto px-4 pb-12">
            <h1 className="text-3xl font-bold my-6">Admin Dashboard</h1>
            <p>Welcome, {userProfile.name}! Your admin dashboard is under construction.</p>
         </main>
        </div>
    )
  }

  // Default to student dashboard
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />
      <main className="container mx-auto px-4 pb-12">
        <ScheduleAnalyzer />
      </main>
    </div>
  );
}
