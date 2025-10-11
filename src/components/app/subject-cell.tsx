"use client";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { ArrowLeftRight, Split } from "lucide-react";
import React from 'react';

const subjectList = [
  "Arabic", "EN", "Bio", "CH", "PH", "MATH", "MEC", "CITZ", "ACTV", "ADV", "CAP", "REL", "F", "G", "PE", "CS", "Geo", "SOCIAL", "—", "Leave School"
];

const renderSubject = (subject: string, part: 'first' | 'second', isEditing: boolean) => {
  const isSplit = subject.includes("/");
  const subjectPart = isSplit
    ? part === 'first'
      ? subject.split('/')[0].trim()
      : subject.split('/')[1].trim()
    : subject;

  return (
    <div
      className={cn(
        "flex-1 flex items-center justify-center p-1 transition-transform duration-200 ease-in-out group-hover:scale-105",
        {
          "hover:!scale-110 hover:shadow-lg hover:z-10 bg-primary/5": isSplit,
          "p-2": !isSplit,
          "bg-primary/10": subjectPart !== "—" && subjectPart !== "",
          "cursor-pointer": isEditing,
        }
      )}
    >
      <span
        className={cn(
          subjectPart === "—" || subjectPart === ""
            ? "text-muted-foreground/50"
            : "font-semibold text-foreground"
        )}
      >
        {subjectPart}
      </span>
    </div>
  );
};

const SubjectDropdown = ({
  children,
  subject,
  onSubjectSelect,
  onSplit,
  onUnsplit,
}: {
  children: React.ReactNode;
  subject: string;
  onSubjectSelect: (subject: string, part?: 'first' | 'second') => void;
  onSplit: () => void;
  onUnsplit: () => void;
}) => {
  const isSplit = subject.includes("/");

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>{children}</DropdownMenuTrigger>
      <DropdownMenuContent className="w-48">
        {isSplit ? (
          <>
            <DropdownMenuItem onSelect={onUnsplit}>
              <ArrowLeftRight className="mr-2 h-4 w-4" />
              Unsplit Session
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <ScrollArea className="h-48">
              <p className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">First Half</p>
              {subjectList.map((s) => (
                <DropdownMenuItem key={`part1-${s}`} onSelect={() => onSubjectSelect(s, 'first')}>
                  {s}
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
              <p className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">Second Half</p>
              {subjectList.map((s) => (
                <DropdownMenuItem key={`part2-${s}`} onSelect={() => onSubjectSelect(s, 'second')}>
                  {s}
                </DropdownMenuItem>
              ))}
            </ScrollArea>
          </>
        ) : (
          <>
            <DropdownMenuItem onSelect={onSplit}>
              <Split className="mr-2 h-4 w-4" />
              Split Session
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <ScrollArea className="h-64">
              {subjectList.map((s) => (
                <DropdownMenuItem key={s} onSelect={() => onSubjectSelect(s)}>
                  {s}
                </DropdownMenuItem>
              ))}
            </ScrollArea>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export function SubjectCell({ subject, isEditing, onChange }: {
  subject: string;
  isEditing: boolean;
  onChange: (newSubject: string) => void;
}) {
  const isSplit = subject.includes("/");

  const handleSubjectSelect = (newSubject: string, part?: 'first' | 'second') => {
    if (!part) {
      onChange(newSubject);
      return;
    }
    
    const parts = subject.split('/');
    let firstPart = parts[0].trim();
    let secondPart = parts[1].trim();

    if (part === 'first') {
      firstPart = newSubject;
    } else {
      secondPart = newSubject;
    }
    
    if (firstPart === secondPart) {
      onChange(firstPart);
    } else {
      onChange(`${firstPart} / ${secondPart}`);
    }
  };

  const handleSplit = () => {
    onChange(`${subject} / —`);
  };

  const handleUnsplit = () => {
    onChange(subject.split('/')[0].trim());
  };
  
  const cellContent = (
    <div className="flex flex-col min-h-[4rem] bg-card p-0 group">
      {isSplit ? (
        <>
          {renderSubject(subject, 'first', isEditing)}
          <div className="h-px bg-border/50 w-full" />
          {renderSubject(subject, 'second', isEditing)}
        </>
      ) : (
        renderSubject(subject, 'first', isEditing)
      )}
    </div>
  );

  if (isEditing) {
    return (
      <SubjectDropdown
        subject={subject}
        onSubjectSelect={handleSubjectSelect}
        onSplit={handleSplit}
        onUnsplit={handleUnsplit}
      >
        {cellContent}
      </SubjectDropdown>
    );
  }

  return <div>{cellContent}</div>;
}
