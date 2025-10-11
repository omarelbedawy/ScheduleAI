import { Header } from "@/components/app/header";
import { ScheduleAnalyzer } from "@/components/app/schedule-analyzer";

export default function Home() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />
      <main className="container mx-auto px-4 pb-12">
        <ScheduleAnalyzer />
      </main>
    </div>
  );
}
