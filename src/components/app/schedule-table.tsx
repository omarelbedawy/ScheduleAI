"use client";

import type { AnalyzeScheduleFromImageOutput } from "@/ai/flows/analyze-schedule-from-image";
import { cn } from "@/lib/utils";

type ScheduleData = AnalyzeScheduleFromImageOutput["schedule"];

const days = ["sunday", "monday", "tuesday", "wednesday", "thursday"];
const dayHeaders = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday"];

export function ScheduleTable({ scheduleData }: { scheduleData: ScheduleData }) {
  return (
    <div className="grid grid-cols-[auto_auto_1fr_1fr_1fr_1fr_1fr] gap-px overflow-hidden rounded-lg border bg-border text-center text-sm shadow-md">
      {/* Header */}
      <div className="bg-muted p-3 font-semibold text-muted-foreground">Session</div>
      <div className="bg-muted p-3 font-semibold text-muted-foreground">Time</div>
      {dayHeaders.map((day) => (
        <div key={day} className="bg-muted p-3 font-semibold text-muted-foreground">
          {day}
        </div>
      ))}

      {/* Body */}
      {scheduleData.map((row, rowIndex) => {
        if (row.session.toLowerCase().includes("break")) {
          return (
            <div
              key={rowIndex}
              className="col-span-7 flex items-center justify-center bg-card p-2 font-bold text-primary"
            >
              {row.session}
            </div>
          );
        }
        return (
          <React.Fragment key={rowIndex}>
            <div className="flex items-center justify-center bg-card p-2 font-medium">
              {row.session}
            </div>
            <div className="flex items-center justify-center whitespace-nowrap bg-card p-2 font-mono text-xs text-muted-foreground">
              {row.time}
            </div>
            {days.map((day) => {
              const subject = row[day as keyof typeof row] as string;
              const isSplit = subject.includes("/");
              return (
                <div
                  key={`${rowIndex}-${day}`}
                  className={cn(
                    "flex min-h-[4rem] items-center justify-center bg-card p-2 transition-transform duration-200 ease-in-out hover:scale-105 hover:shadow-lg hover:z-10",
                    { "bg-primary/10": subject !== "—" && subject !== "" }
                  )}
                >
                  {isSplit ? (
                    <div className="flex flex-col items-center justify-center">
                      <span>{subject.split('/')[0].trim()}</span>
                      <span className="text-xs text-muted-foreground">/</span>
                      <span>{subject.split('/')[1].trim()}</span>
                    </div>
                  ) : (
                    <span className={cn(
                      subject === "—" || subject === "" ? "text-muted-foreground/50" : "font-semibold text-foreground"
                    )}>
                      {subject}
                    </span>
                  )}
                </div>
              );
            })}
          </React.Fragment>
        );
      })}
    </div>
  );
}
// This needs to be a default import for React.lazy to work
import React from 'react';
