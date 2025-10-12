
"use client";

import type { UserProfile, Explanation, ExplanationContributor } from "@/lib/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, BookUser, CalendarDays, Clock, Trash2, Check, X, Hourglass, ThumbsUp, ThumbsDown } from "lucide-react";
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
import { doc, deleteDoc, updateDoc } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import { format, formatDistanceToNow } from 'date-fns';
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"


function getInitials(name: string) {
    if (!name) return '';
    const names = name.split(' ');
    if (names.length === 1) return names[0].charAt(0).toUpperCase();
    return `${names[0].charAt(0)}${names[names.length - 1].charAt(0)}`.toUpperCase();
}


function ContributorList({ contributors }: { contributors: ExplanationContributor[] }) {
    const visibleContributors = contributors.filter(c => c.status === 'accepted' || c.status === 'pending');
    const acceptedCount = contributors.filter(c => c.status === 'accepted').length;

    if (visibleContributors.length === 0) return null;

    return (
        <div className="flex items-center space-x-2 text-xs text-muted-foreground">
            <div className="flex -space-x-2 overflow-hidden">
                 {visibleContributors.slice(0, 3).map(c => (
                    <TooltipProvider key={c.userId}>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Avatar className="h-5 w-5 border-2 border-background">
                                    <AvatarFallback className="text-[10px]">{getInitials(c.userName)}</AvatarFallback>
                                </Avatar>
                            </TooltipTrigger>
                            <TooltipContent>
                                <p>{c.userName} ({c.status})</p>
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                 ))}
            </div>
            {visibleContributors.length > 3 && (
                <span className="text-xs font-medium">+{visibleContributors.length - 3} more</span>
            )}
        </div>
    )
}

function InvitationManager({ 
    explanation,
    currentUser,
    classroomId,
} : {
    explanation: Explanation;
    currentUser: UserProfile | null;
    classroomId: string | null;
}) {
    const firestore = useFirestore();
    const { toast } = useToast();
    const userInvite = explanation.contributors.find(c => c.userId === currentUser?.uid && c.status === 'pending');

    if (!userInvite) return null;

    const handleInvitationResponse = async (accept: boolean) => {
        if (!firestore || !classroomId) return;
        const explanationRef = doc(firestore, 'classrooms', classroomId, 'explanations', explanation.id);

        const newContributors = explanation.contributors.map(c => 
            c.userId === currentUser?.uid ? { ...c, status: accept ? 'accepted' : 'declined' } : c
        );

        try {
            await updateDoc(explanationRef, { contributors: newContributors });
            toast({
                title: `Invitation ${accept ? 'Accepted' : 'Declined'}`,
            });
        } catch (error) {
            console.error("Error responding to invitation:", error);
            toast({
                variant: 'destructive',
                title: "Error",
                description: "Could not update your response. Please try again."
            })
        }
    }

    return (
        <Card className="my-2 bg-accent/20 border-accent/50">
            <CardContent className="p-3 flex items-center justify-between">
                <p className="text-sm font-medium">You were invited to explain this topic.</p>
                <div className="flex gap-2">
                    <Button size="sm" onClick={() => handleInvitationResponse(true)}><ThumbsUp className="mr-1 h-4 w-4"/> Accept</Button>
                    <Button size="sm" variant="destructive" onClick={() => handleInvitationResponse(false)}><ThumbsDown className="mr-1 h-4 w-4"/> Decline</Button>
                </div>
            </CardContent>
        </Card>
    )
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

    const isOwner = currentUser?.uid === explanation.ownerId;
    const dayCapitalized = explanation.day.charAt(0).toUpperCase() + explanation.day.slice(1);
    
    const createdAtDate = explanation.createdAt?.toDate();
    const timeAgo = createdAtDate ? formatDistanceToNow(createdAtDate, { addSuffix: true }) : 'a while ago';
    
    const explanationDate = explanation.explanationDate?.toDate();
    const fullDate = explanationDate ? format(explanationDate, 'EEEE, MMMM d') : dayCapitalized;

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
        <Card className="bg-card/50 relative group">
             <div className="absolute top-2 right-2 flex items-center gap-1">
                 {explanation.status === 'Upcoming' && <Badge variant="outline" className="border-green-500 text-green-500"><Check className="mr-1 h-3 w-3"/> Upcoming</Badge>}
                {explanation.status === 'Finished' && <Badge variant="outline"><Check className="mr-1 h-3 w-3"/> Finished</Badge>}
                
                {isOwner && explanation.status === 'Upcoming' && (
                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity">
                                <Trash2 className="size-4" />
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                            <AlertDialogDescription>
                                This action will permanently cancel your commitment to explain this topic. This cannot be undone.
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
            </div>

            <CardHeader className="p-4 pr-16">
                <CardTitle className="text-base flex items-center gap-2">
                    <BookUser className="size-5 text-primary" />
                    {explanation.subject}{loText}
                </CardTitle>
                <div className="space-y-1">
                    <CardDescription className="flex items-center gap-2 text-xs">
                        <CalendarDays className="size-4" />
                        Session {explanation.session} on {fullDate}
                    </CardDescription>
                     <CardDescription className="flex items-center gap-2 text-xs">
                        <Clock className="size-4" />
                        Committed {timeAgo}
                    </CardDescription>
                </div>
            </CardHeader>
            <CardContent className="p-4 pt-0 space-y-3">
                <div className="flex flex-wrap gap-2">
                    {explanation.concepts.map(concept => (
                        <Badge key={concept} variant="secondary">{concept}</Badge>
                    ))}
                </div>
                <ContributorList contributors={explanation.contributors} />
            </CardContent>
        </Card>
    )
}

export function ClassmatesDashboard({ classmates, explanations, currentUser, classroomId }: { 
    classmates: UserProfile[] | null;
    explanations: Explanation[] | null;
    currentUser: UserProfile | null;
    classroomId: string | null;
}) {

    const userExplanations = explanations?.filter(exp => exp.contributors.some(c => c.userId === currentUser?.uid)) || [];
    const pendingInvitations = userExplanations.filter(exp => exp.contributors.some(c => c.userId === currentUser?.uid && c.status === 'pending'));

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center gap-3">
                    <Users className="size-6 text-primary"/>
                    <div>
                        <CardTitle>Classmates & Commitments</CardTitle>
                        <CardDescription>
                            Students in your class and their commitments to explain topics.
                        </CardDescription>
                    </div>
                </div>
                 {pendingInvitations.length > 0 && (
                    <div className="!mt-4 space-y-2">
                        {pendingInvitations.map(exp => (
                            <InvitationManager
                                key={exp.id}
                                explanation={exp}
                                currentUser={currentUser}
                                classroomId={classroomId}
                            />
                        ))}
                    </div>
                )}
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
                        You're the first one here! Invite your classmates.
                    </div>
                ) : (
                    classmates.map(student => {
                        const studentExplanations = explanations
                            ?.filter(exp => exp.contributors.some(c => c.userId === student.uid && c.status === 'accepted'))
                            .sort((a, b) => b.createdAt.toDate() - a.createdAt.toDate()) || [];

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
