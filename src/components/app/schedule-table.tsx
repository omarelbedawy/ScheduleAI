"use client";

import type { AnalyzeScheduleFromImageOutput } from "@/ai/flows/analyze-schedule-from-image";
import { cn } from "@/lib/utils";
import React from 'react';

type ScheduleData = AnalyzeScheduleFromImageOutput["schedule"];

const days = ["sunday", "monday", "tuesday", "wednesday", "thursday"];
const dayHeaders = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday"];

export function ScheduleTable({ scheduleData }: { scheduleData: ScheduleData }) {
  if (!scheduleData) return null;

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
                    "flex flex-col min-h-[4rem] bg-card p-0",
                    "group"
                  )}
                >
                  {isSplit ? (
                    <>
                      <div className="flex-1 flex items-center justify-center p-1 border-b border-border/50 transition-transform duration-200 ease-in-out group-hover:scale-105 hover:!scale-110 hover:shadow-lg hover:z-10 bg-primary/5">
                        <span className="font-semibold text-foreground">
                          {subject.split('/')[0].trim()}
                        </span>
                      </div>
                      <div className="flex-1 flex items-center justify-center p-1 transition-transform duration-200 ease-in-out group-hover:scale-105 hover:!scale-110 hover:shadow-lg hover:z-10 bg-primary/5">
                        <span className="font-semibold text-foreground">
                          {subject.split('/')[1].trim()}
                        </span>
                      </div>
                    </>
                  ) : (
                     <div className={cn("flex-1 flex items-center justify-center p-2 transition-transform duration-200 ease-in-out hover:scale-105 hover:shadow-lg hover:z-10",
                      { "bg-primary/10": subject !== "—" && subject !== "" }
                     )}>
                      <span className={cn(
                        subject === "—" || subject === "" ? "text-muted-foreground/50" : "font-semibold text-foreground"
                      )}>
                        {subject}
                      </span>
                    </div>
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
