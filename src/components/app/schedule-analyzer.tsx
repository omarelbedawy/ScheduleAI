
"use client";

import type { AnalyzeScheduleFromImageOutput } from "@/ai/flows/analyze-schedule-from-image";
import { ChangeEvent, DragEvent, useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  Check,
  Copy,
  FileImage,
  Loader2,
  Pencil,
  Save,
  UploadCloud,
  X,
} from "lucide-react";

import { analyzeScheduleAction } from "@/app/actions";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import Image from "next/image";
import { ScheduleTable } from "./schedule-table";
import { useUser } from "@/firebase/auth/use-user";
import { useFirestore, useDoc, useMemoFirebase } from "@/firebase";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import type { UserProfile } from "@/lib/types";
import { errorEmitter } from "@/firebase/error-emitter";
import { FirestorePermissionError, type SecurityRuleContext } from "@/firebase/errors";

type AnalysisState = "idle" | "previewing" | "loading" | "displaying";
type ScheduleRow = AnalyzeScheduleFromImageOutput["schedule"][number];

interface ClassroomSchedule {
  schedule: ScheduleRow[];
  lastUpdatedBy?: string;
  updatedAt?: any;
}


export function ScheduleAnalyzer() {
  const { user } = useUser();
  const firestore = useFirestore();
  const [state, setState] = useState<AnalysisState>("idle");
  const [isDragging, setIsDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [editableSchedule, setEditableSchedule] = useState<ScheduleRow[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const userProfileQuery = useMemoFirebase(() => user && firestore ? doc(firestore, "users", user.uid) : null, [firestore, user]);
  const { data: userProfile, loading: userProfileLoading } = useDoc<UserProfile>(userProfileQuery);

  const classroomId = userProfile ? `${userProfile.grade}-${userProfile.class}` : null;
  const classroomDocRef = useMemoFirebase(() => classroomId && firestore ? doc(firestore, 'classrooms', classroomId) : null, [firestore, classroomId]);
  const { data: classroomSchedule, loading: classroomLoading } = useDoc<ClassroomSchedule>(classroomDocRef);
  
  const isLoading = userProfileLoading || classroomLoading;

  useEffect(() => {
    if (isLoading) return;
    
    if (classroomSchedule?.schedule) {
      setEditableSchedule(JSON.parse(JSON.stringify(classroomSchedule.schedule)));
      setState("displaying");
    } else {
      setState("idle");
    }
  }, [classroomSchedule, isLoading]);


  const handleFileSelect = (selectedFile: File | null) => {
    if (selectedFile && selectedFile.type.startsWith("image/")) {
      setFile(selectedFile);
      const url = URL.createObjectURL(selectedFile);
      setPreviewUrl(url);
      setState("previewing");
    } else {
      toast({
        title: "Invalid File Type",
        description: "Please upload an image file (e.g., PNG, JPG, GIF).",
        variant: "destructive",
      });
    }
  };

  const onFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    handleFileSelect(e.target.files?.[0] ?? null);
  };

  const onDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const onDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    handleFileSelect(e.dataTransfer.files?.[0] ?? null);
  };

  const onReset = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setFile(null);
    setPreviewUrl(null);
    setEditableSchedule(classroomSchedule?.schedule || []);
    setIsEditing(false);
    setState(classroomSchedule?.schedule ? "displaying" : "idle");
  };

  const toBase64 = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
    });

  const onSubmit = async () => {
    if (!file || !classroomDocRef || !userProfile?.name) return;
    setState("loading");
    try {
      const base64Image = await toBase64(file);
      const analysisResult = await analyzeScheduleAction({ scheduleImage: base64Image });

      if (analysisResult.schedule && analysisResult.schedule.length > 0) {
        const newScheduleData = {
          schedule: analysisResult.schedule,
          lastUpdatedBy: userProfile.name,
          updatedAt: serverTimestamp(),
        };

        setDoc(classroomDocRef, newScheduleData, { merge: true }).catch(async (serverError) => {
          const permissionError = new FirestorePermissionError({
            path: classroomDocRef.path,
            operation: 'update',
            requestResourceData: newScheduleData,
          } satisfies SecurityRuleContext);
          errorEmitter.emit('permission-error', permissionError);
        });

        // Optimistically update UI
        setEditableSchedule(JSON.parse(JSON.stringify(analysisResult.schedule)));
        setState("displaying");
        toast({
          title: "Schedule Updated",
          description: `The new schedule was uploaded by ${userProfile.name}.`,
        });
      } else {
         throw new Error(analysisResult.errors || "The AI failed to return a valid response.");
      }
    } catch (error) {
      console.error(error);
      const errorMessage = error instanceof Error ? error.message : "Something went wrong. Please try again.";
      toast({
        title: "Analysis Error",
        description: errorMessage,
        variant: "destructive",
      });
      setState("previewing");
    }
  };
  
  const handleScheduleChange = (rowIndex: number, day: string, newSubject: string) => {
    setEditableSchedule(currentSchedule => {
      const newSchedule = [...currentSchedule];
      const row = { ...newSchedule[rowIndex] };
      (row as any)[day] = newSubject;
      newSchedule[rowIndex] = row;
      return newSchedule;
    });
  };

  const onSaveEdits = async () => {
    if (!classroomDocRef || !userProfile?.name) return;
    
    const updatedScheduleData = {
      schedule: editableSchedule,
      lastUpdatedBy: userProfile.name,
      updatedAt: serverTimestamp(),
    };

    setDoc(classroomDocRef, updatedScheduleData, { merge: true }).catch(async (serverError) => {
        const permissionError = new FirestorePermissionError({
          path: classroomDocRef.path,
          operation: 'update',
          requestResourceData: updatedScheduleData,
        } satisfies SecurityRuleContext);
        errorEmitter.emit('permission-error', permissionError);
    });

    setIsEditing(false);
    toast({
      title: "Schedule Saved",
      description: "Your changes have been saved for the class.",
    });
  };

  const onCopy = () => {
    if (!editableSchedule) return;
    // A simple text representation for copying
    const textToCopy = editableSchedule
      .map(row => `${row.session.padEnd(10)} | ${row.time.padEnd(12)} | ${row.sunday} | ${row.monday} | ${row.tuesday} | ${row.wednesday} | ${row.thursday}`)
      .join('\n');
    navigator.clipboard.writeText(textToCopy);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  if (state === "loading" || isLoading) {
    return <LoadingState />;
  }

  if (state === "displaying" && editableSchedule.length > 0) {
    return (
      <ResultState
        classroomSchedule={classroomSchedule}
        editableSchedule={editableSchedule}
        onCopy={onCopy}
        isCopied={isCopied}
        onReset={onReset}
        isEditing={isEditing}
        setIsEditing={setIsEditing}
        onScheduleChange={handleScheduleChange}
        onSaveEdits={onSaveEdits}
      />
    );
  }

  return (
    <Card
      className={cn(
        "border-2 border-dashed transition-colors",
        isDragging && "border-primary bg-primary/10"
      )}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      <CardHeader>
        <CardTitle>No Schedule Found</CardTitle>
        <CardDescription>Your class doesn't have a schedule yet. Upload one to get started!</CardDescription>
      </CardHeader>
      <CardContent className="p-6">
        <input
          type="file"
          ref={fileInputRef}
          onChange={onFileChange}
          className="hidden"
          accept="image/*"
        />
        {state === "idle" && (
          <div className="flex flex-col items-center justify-center space-y-4 py-16 text-center">
            <div className="rounded-full border border-dashed bg-secondary p-4">
              <UploadCloud className="size-10 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground">
              Drag & drop your schedule image here, or
            </p>
            <Button
              onClick={() => fileInputRef.current?.click()}
              className="bg-accent text-accent-foreground hover:bg-accent/90"
            >
              Browse Files
            </Button>
          </div>
        )}
        {state === "previewing" && previewUrl && (
          <div className="flex flex-col items-center gap-6">
            <div className="relative w-full max-w-md rounded-lg border p-2 shadow-sm">
              <Image
                src={previewUrl}
                alt="Schedule preview"
                width={600}
                height={400}
                className="max-h-80 w-full rounded-md object-contain"
              />
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-3 top-3 h-8 w-8 rounded-full bg-background/70 hover:bg-background"
                onClick={onReset}
              >
                <X className="size-4" />
              </Button>
            </div>
            <Button
              onClick={onSubmit}
              className="w-full max-w-md bg-accent text-accent-foreground hover:bg-accent/90"
            >
              Analyze Schedule
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function LoadingState() {
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState("Analyzing your schedule...");

  useEffect(() => {
    const messages = [
      "Extracting text from image...",
      "Identifying subjects and times...",
      "Checking for ambiguities...",
      "Formatting the schedule...",
      "Almost there...",
    ];

    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 95) {
          clearInterval(interval);
          return 95;
        }
        const next = prev + 5;
        const messageIndex = Math.floor(next / (100 / messages.length));
        setMessage(messages[messageIndex] || "Finalizing...");
        return next;
      });
    }, 800);

    return () => clearInterval(interval);
  }, []);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Loading Schedule...</CardTitle>
        <CardDescription>
          Please wait while we fetch the latest schedule for your class.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col items-center justify-center space-y-4 py-16 text-center">
        <Loader2 className="size-12 animate-spin text-primary" />
        <p className="text-muted-foreground">{message}</p>
        <Progress value={progress} className="w-full max-w-sm" />
      </CardContent>
    </Card>
  );
}

function ResultState({ classroomSchedule, editableSchedule, onCopy, isCopied, onReset, isEditing, setIsEditing, onScheduleChange, onSaveEdits }: {
  classroomSchedule: ClassroomSchedule | null | undefined;
  editableSchedule: AnalyzeScheduleFromImageOutput['schedule'];
  onCopy: () => void;
  isCopied: boolean;
  onReset: () => void;
  isEditing: boolean;
  setIsEditing: (isEditing: boolean) => void;
  onScheduleChange: (rowIndex: number, day: string, newSubject: string) => void;
  onSaveEdits: () => void;
}) {
  const lastUpdated = classroomSchedule?.updatedAt?.toDate().toLocaleString();

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Classroom Schedule</CardTitle>
            <CardDescription>
              {isEditing ? 'Click on a cell to edit the subject.' : `Last updated by ${classroomSchedule?.lastUpdatedBy || 'N/A'} on ${lastUpdated || 'N/A'}`}
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button onClick={isEditing ? onSaveEdits : () => setIsEditing(true)} variant="outline" className="w-28">
              {isEditing ? <Save /> : <Pencil />}
              {isEditing ? "Save" : "Edit"}
            </Button>
            <Button onClick={onCopy} variant="secondary" className="w-28" disabled={isEditing}>
              {isCopied ? (
                <Check className="text-green-500" />
              ) : (
                <Copy />
              )}
              {isCopied ? "Copied!" : "Copy Text"}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {(editableSchedule && editableSchedule.length > 0) ? (
          <ScheduleTable
            scheduleData={editableSchedule}
            isEditing={isEditing}
            onScheduleChange={onScheduleChange}
          />
        ) : (
          <div className="rounded-md border bg-muted p-4">
            <p className="text-center text-muted-foreground">The AI could not extract a schedule from the image.</p>
          </div>
        )}
      </CardContent>
      <CardFooter>
        <Button onClick={onReset} variant="outline">
          Analyze Another
        </Button>
      </CardFooter>
    </Card>
  );
}

    