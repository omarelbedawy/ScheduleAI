
"use client";

import type { UserProfile, Explanation } from "@/lib/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, BookUser, CalendarDays, Clock, Trash2 } from "lucide-react";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useFirestore } from "@/firebase";
import { doc, deleteDoc } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from 'date-fns';


function getInitials(name: string) {
    if (!name) return '';
    const names = name.split(' ');
    if (names.length === 1) return names[0].charAt(0).toUpperCase();
    return `${names[0].charAt(0)}${names[names.length - 1].charAt(0)}`.toUpperCase();
}

function ExplanationCard({ 
    explanation, 
    currentUser, 
    classroomId 
}: { 
    explanation: Explanation; 
    currentUser: UserProfile | null;
    classroomId: string | null;
}) {
    const firestore = useFirestore();
    const { toast } = useToast();

    const isOwner = currentUser?.uid === explanation.userId;
    const dayCapitalized = explanation.day.charAt(0).toUpperCase() + explanation.day.slice(1);
    const createdAtDate = explanation.createdAt?.toDate();
    const timeAgo = createdAtDate ? formatDistanceToNow(createdAtDate, { addSuffix: true }) : 'a while ago';
    const loText = explanation.learningOutcome ? ` - LO ${explanation.learningOutcome}` : '';

    const handleDelete = async () => {
        if (!firestore || !classroomId || !explanation.id) {
            toast({
                variant: "destructive",
                title: "Error",
                description: "Could not connect to the database to cancel commitment."
            });
            return;
        }

        const explanationRef = doc(firestore, "classrooms", classroomId, "explanations", explanation.id);
        try {
            await deleteDoc(explanationRef);
            toast({
                title: "Commitment Canceled",
                description: "Your commitment to explain this topic has been removed.",
            });
        } catch (error) {
            console.error("Error deleting explanation: ", error);
            toast({
                variant: "destructive",
                title: "Deletion Failed",
                description: "There was a problem canceling your commitment. Please try again.",
            });
        }
    }

    return (
        <Card className="bg-card/50 relative">
            <CardHeader className="p-4 pr-12">
                <CardTitle className="text-base flex items-center gap-2">
                    <BookUser className="size-5 text-primary" />
                    {explanation.subject}{loText}
                </CardTitle>
                <div className="space-y-1">
                    <CardDescription className="flex items-center gap-2 text-xs">
                        <CalendarDays className="size-4" />
                        Session {explanation.session} on {dayCapitalized}
                    </CardDescription>
                     <CardDescription className="flex items-center gap-2 text-xs">
                        <Clock className="size-4" />
                        Committed {timeAgo}
                    </CardDescription>
                </div>
            </CardHeader>
            <CardContent className="p-4 pt-0">
                <div className="flex flex-wrap gap-2">
                    {explanation.concepts.map(concept => (
                        <Badge key={concept} variant="outline">{concept}</Badge>
                    ))}
                </div>
            </CardContent>

             {isOwner && (
                <AlertDialog>
                    <AlertDialogTrigger asChild>
                         <Button variant="ghost" size="icon" className="absolute top-2 right-2 h-7 w-7 text-muted-foreground hover:text-destructive">
                            <Trash2 className="size-4" />
                        </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This action will permanently cancel your commitment to explain this topic. Your classmates will be notified.
                        </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                        <AlertDialogCancel>Keep Commitment</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">
                            Yes, Cancel It
                        </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            )}
        </Card>
    )
}

export function ClassmatesDashboard({ classmates, explanations, currentUser, classroomId }: { 
    classmates: UserProfile[] | null;
    explanations: Explanation[] | null;
    currentUser: UserProfile | null;
    classroomId: string | null;
}) {
    return (
        <Card>
            <CardHeader>
                <div className="flex items-center gap-3">
                    <Users className="size-6 text-primary"/>
                    <div>
                        <CardTitle>Classmates</CardTitle>
                        <CardDescription>
                            Students in your class and their commitments will appear here.
                        </CardDescription>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="space-y-6">
                {!classmates ? (
                     Array.from({ length: 3 }).map((_, i) => (
                        <div key={`skeleton-classmate-${i}`} className="flex items-start gap-4">
                            <Skeleton className="h-10 w-10 rounded-full" />
                            <div className="w-full space-y-2">
                                <Skeleton className="h-4 w-1/4" />
                                <Skeleton className="h-3 w-1/3" />
                                <Skeleton className="h-20 w-full" />
                            </div>
                        </div>
                    ))
                ) : classmates.length === 0 ? (
                     <div className="h-24 text-center flex items-center justify-center">
                        You're the first one here!
                    </div>
                ) : (
                    classmates.map(student => {
                        const studentExplanations = explanations?.filter(exp => exp.userId === student.uid).sort((a, b) => b.createdAt.toDate() - a.createdAt.toDate()) || [];
                        return (
                            <div key={student.uid} className="flex items-start gap-4">
                                <Avatar>
                                    <AvatarFallback>{getInitials(student.name)}</AvatarFallback>
                                </Avatar>
                                <div className="w-full space-y-3">
                                    <div>
                                        <p className="font-medium">{student.name} {student.uid === currentUser?.uid && "(You)"}</p>
                                        <p className="text-sm text-muted-foreground">{student.email}</p>
                                    </div>
                                    {studentExplanations.length > 0 && (
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                                            {studentExplanations.map(exp => (
                                                <ExplanationCard 
                                                    key={exp.id} 
                                                    explanation={exp} 
                                                    currentUser={currentUser} 
                                                    classroomId={classroomId}
                                                />
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )
                    })
                )}
            </CardContent>
        </Card>
    );
}
