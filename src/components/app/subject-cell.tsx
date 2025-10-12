
"use client";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { ArrowLeftRight, Split, Loader2, X } from "lucide-react";
import React, { useState, KeyboardEvent } from 'react';
import type { UserProfile, Explanation } from "@/lib/types";
import { Button } from "../ui/button";
import { Label } from "../ui/label";
import { Input } from "../ui/input";
import { Badge } from "../ui/badge";
import { useFirestore } from "@/firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";


const subjectList = [
  "Arabic", "EN", "Bio", "CH", "PH", "MATH", "MEC", "CITZ", "ACTV", "ADV", "CAP", "REL", "F", "G", "PE", "CS", "Geo", "SOCIAL", "—", "Leave School"
];

const explainableSubjects = ["MATH", "PH", "MEC", "Geo", "CH", "Bio", "Arabic", "EN", "F", "G"];
const languageSubjects = ["Arabic", "EN", "F", "G"];


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

const ExplainDialog = ({ user, classroomId, day, session, subject, children, onOpenChange }: {
  user: UserProfile;
  classroomId: string;
  day: string;
  session: string;
  subject: string;
  children: React.ReactNode;
  onOpenChange: (open: boolean) => void;
}) => {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [learningOutcome, setLearningOutcome] = useState('');
  const [concepts, setConcepts] = useState<string[]>([]);
  const [currentConcept, setCurrentConcept] = useState('');

  const isLanguage = languageSubjects.includes(subject);

  const handleConceptKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && currentConcept.trim()) {
      e.preventDefault();
      if (!concepts.includes(currentConcept.trim())) {
        setConcepts(prev => [...prev, currentConcept.trim()]);
      }
      setCurrentConcept('');
    }
  };

  const removeConcept = (conceptToRemove: string) => {
    setConcepts(prev => prev.filter(c => c !== conceptToRemove));
  };

  const handleSubmit = async () => {
    if ((!isLanguage && !learningOutcome) || concepts.length === 0 || !firestore || !classroomId) {
      toast({
        variant: "destructive",
        title: "Missing Information",
        description: isLanguage
          ? "Please add at least one concept."
          : "Please select a learning outcome and add at least one concept.",
      });
      return;
    }

    setIsLoading(true);
    try {
      const explanationData: Omit<Explanation, 'id' | 'createdAt'> & { createdAt: any } = {
        userId: user.uid,
        userName: user.name,
        subject,
        day,
        session,
        concepts,
        createdAt: serverTimestamp(),
      };

      if (!isLanguage) {
        explanationData.learningOutcome = parseInt(learningOutcome, 10);
      }
      
      const explanationsColRef = collection(firestore, 'classrooms', classroomId, 'explanations');
      await addDoc(explanationsColRef, explanationData);

      toast({
        title: "Success!",
        description: `You've signed up to explain concepts for ${subject}.`,
      });

      // Reset state and close dialog
      setLearningOutcome('');
      setConcepts([]);
      setCurrentConcept('');
      onOpenChange(false);

    } catch (error) {
      console.error("Error submitting explanation:", error);
      toast({
        variant: "destructive",
        title: "Submission Failed",
        description: "Could not save your commitment. Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  };


  return (
    <Dialog onOpenChange={onOpenChange}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>I Will Explain: {subject}</DialogTitle>
          <DialogDescription>
            Volunteer to explain a topic for this session. Your classmates will see your commitment.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          {!isLanguage && (
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="lo-select" className="text-right">
                LO
              </Label>
              <Select onValueChange={setLearningOutcome} value={learningOutcome}>
                <SelectTrigger id="lo-select" className="col-span-3">
                  <SelectValue placeholder="Select an LO" />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 10 }, (_, i) => i + 1).map(lo => (
                    <SelectItem key={lo} value={String(lo)}>
                      Learning Outcome {lo}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="concepts-input" className="text-right">
              Concepts
            </Label>
            <div className="col-span-3">
              <div className="flex flex-wrap gap-2 rounded-md border border-input p-2">
                {concepts.map(concept => (
                  <Badge
                    key={concept}
                    variant="secondary"
                    className="flex items-center gap-1"
                  >
                    {concept}
                    <button
                      onClick={() => removeConcept(concept)}
                      className="rounded-full hover:bg-muted-foreground/20"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
                <Input
                  id="concepts-input"
                  placeholder="Type a concept and press Enter"
                  className="flex-1 border-0 shadow-none focus-visible:ring-0"
                  value={currentConcept}
                  onChange={(e) => setCurrentConcept(e.target.value)}
                  onKeyDown={handleConceptKeyDown}
                />
              </div>
            </div>
          </div>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="secondary">
              Cancel
            </Button>
          </DialogClose>
          <Button type="submit" onClick={handleSubmit} disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Submit
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function SubjectCell({ subject, isEditing, onChange, user, classroomId, day, session, explanations }: {
  subject: string;
  isEditing: boolean;
  onChange: (newSubject: string) => void;
  user: UserProfile | null;
  classroomId: string | null;
  day: string;
  session: string;
  explanations: Explanation[];
}) {
  const isSplit = subject.includes("/");
  const [dialogOpen, setDialogOpen] = useState(false);

  const handleSubjectSelect = (newSubject: string, part?: 'first' | 'second') => {
    if (!part) {
      onChange(newSubject);
      return;
    }
    
    const parts = subject.split('/');
    let firstPart = parts[0].trim();
    let secondPart = parts.length > 1 ? parts[1].trim() : '—';

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

  const renderCellContent = (sub: string, part: 'first' | 'second') => {
    const isSubjectSplit = sub.includes("/");
    const subjectPart = isSubjectSplit
      ? part === 'first'
        ? sub.split('/')[0].trim()
        : sub.split('/')[1].trim()
      : sub;
      
    const canExplain = explainableSubjects.includes(subjectPart);

    // Find explanations for this specific subject part
    const partExplanations = explanations.filter(e => e.subject === subjectPart);

    const cellWrapper = (
      <div
        className={cn(
          "flex-1 flex flex-col items-center justify-center p-1 transition-transform duration-200 ease-in-out group-hover:scale-105",
          "relative", // For positioning the badge
          {
            "hover:!scale-110 hover:shadow-lg hover:z-10": isSubjectSplit && canExplain,
            "p-2": !isSubjectSplit,
            "cursor-pointer": isEditing || canExplain,
          }
        )}
      >
        <span
          className={cn(
            !canExplain && subjectPart !== "—" && subjectPart !== "Leave School"
              ? "text-muted-foreground/50"
              : "font-semibold text-foreground"
          )}
        >
          {subjectPart}
        </span>
        {partExplanations.length > 0 && !isEditing && (
           <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="absolute top-1 right-1 flex items-center justify-center h-4 w-4 rounded-full bg-accent text-accent-foreground text-[10px] font-bold">
                  {partExplanations.length}
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>{partExplanations.length} student(s) will explain this.</p>
              </TooltipContent>
            </Tooltip>
           </TooltipProvider>
        )}
      </div>
    );
    
    if (isEditing) {
      return cellWrapper; // Dropdown is handled by the parent
    }

    if (canExplain && user && classroomId) {
      return (
        <ExplainDialog
          user={user}
          classroomId={classroomId}
          day={day}
          session={session}
          subject={subjectPart}
          onOpenChange={setDialogOpen}
        >
          {cellWrapper}
        </ExplainDialog>
      );
    }
    
    return cellWrapper;
  }
  
  const cellStructure = (
    <div className="flex flex-col min-h-[4rem] bg-card p-0 group">
      {isSplit ? (
        <>
          {renderCellContent(subject, 'first')}
          <div className="h-px bg-border/50 w-full" />
          {renderCellContent(subject, 'second')}
        </>
      ) : (
        renderCellContent(subject, 'first')
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
        {cellStructure}
      </SubjectDropdown>
    );
  }

  return <div>{cellStructure}</div>;
}
