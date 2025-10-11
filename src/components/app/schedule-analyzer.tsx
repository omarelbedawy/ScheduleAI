"use client";

import type { AnalyzeScheduleFromImageOutput } from "@/ai/flows/analyze-schedule-from-image";
import { ChangeEvent, DragEvent, useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  Check,
  Copy,
  FileImage,
  Loader2,
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

type AnalysisState = "idle" | "previewing" | "loading" | "displaying";

export function ScheduleAnalyzer() {
  const [state, setState] = useState<AnalysisState>("idle");
  const [isDragging, setIsDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [result, setResult] = useState<AnalyzeScheduleFromImageOutput | null>(null);
  const [isCopied, setIsCopied] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

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
    setResult(null);
    setState("idle");
  };

  const toBase64 = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
    });

  const onSubmit = async () => {
    if (!file) return;
    setState("loading");
    try {
      const base64Image = await toBase64(file);
      const analysisResult = await analyzeScheduleAction({ scheduleImage: base64Image });
      setResult(analysisResult);
      if (!analysisResult.schedule && !analysisResult.errors) {
        throw new Error("The AI failed to return a valid response.");
      }
      setState("displaying");
      if (!analysisResult.schedule && analysisResult.errors) {
        toast({
          title: "Analysis Failed",
          description: analysisResult.errors,
          variant: "destructive",
        });
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

  const onCopy = () => {
    if (!result?.schedule) return;
    navigator.clipboard.writeText(result.schedule);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  if (state === "loading") {
    return <LoadingState />;
  }

  if (state === "displaying" && result) {
    return (
      <ResultState result={result} onCopy={onCopy} isCopied={isCopied} onReset={onReset} />
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
        <CardTitle>Analysis in Progress</CardTitle>
        <CardDescription>
          Please wait while we extract and structure your schedule.
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

function ResultState({ result, onCopy, isCopied, onReset }: {
  result: AnalyzeScheduleFromImageOutput;
  onCopy: () => void;
  isCopied: boolean;
  onReset: () => void;
}) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Analyzed Schedule</CardTitle>
            <CardDescription>
              Your schedule is ready to copy and paste.
            </CardDescription>
          </div>
          <Button onClick={onCopy} variant="secondary" className="w-28">
            {isCopied ? (
              <Check className="text-green-500" />
            ) : (
              <Copy />
            )}
            {isCopied ? "Copied!" : "Copy Text"}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {result.errors && (
          <Alert variant="destructive" className="mb-4">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Ambiguities Found</AlertTitle>
            <AlertDescription>{result.errors}</AlertDescription>
          </Alert>
        )}
        <div className="rounded-md border bg-muted p-4">
          <pre className="font-code text-sm text-muted-foreground whitespace-pre-wrap">
            {result.schedule || "The AI could not extract a schedule from the image."}
          </pre>
        </div>
      </CardContent>
      <CardFooter>
        <Button onClick={onReset} variant="outline">
          Analyze Another
        </Button>
      </CardFooter>
    </Card>
  );
}
