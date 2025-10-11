import { CalendarCheck } from "lucide-react";

export function Header() {
  return (
    <header className="border-b">
      <div className="container mx-auto flex h-16 items-center gap-3 px-4">
        <CalendarCheck className="size-7 text-primary" />
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          ScheduleAI
        </h1>
      </div>
    </header>
  );
}
