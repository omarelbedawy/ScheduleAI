
"use client";

import type { UserProfile, Explanation, ExplanationContributor } from "@/lib/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, BookUser, CalendarDays, Clock, Trash2, Check, X, Hourglass, ThumbsUp, ThumbsDown, CheckCircle, XCircle, HelpCircle } from "lucide-react";
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
import { doc, deleteDoc, updateDoc, writeBatch, collection, getDocs, query } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import { format, formatDistanceToNow } from 'date-fns';
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { useState } from "react";
import { Input } from "../ui/input";
import { Label } from "../ui/label";


function getInitials(name: string) {
    if (!name) return '';
    const names = name.split(' ');
    if (names.length === 1) return names[0].charAt(0).toUpperCase();
    return `${names[0].charAt(0)}${names[names.length - 1].charAt(0)}`.toUpperCase();
}


function ContributorList({ contributors }: { contributors: ExplanationContributor[] }) {
    const acceptedContributors = (contributors || []).filter(c => c.status === 'accepted');

    if (acceptedContributors.length === 0) return null;

    return (
        <div className="text-xs text-muted-foreground space-y-1">
            <p className="font-medium">Explaining:</p>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                 {acceptedContributors.map(c => (
                    <div key={c.userId} className="flex items-center gap-1.5">
                        <Avatar className="h-5 w-5 border-2 border-background">
                            <AvatarFallback className="text-[10px]">{getInitials(c.userName)}</AvatarFallback>
                        </Avatar>
                        <span className="text-xs font-medium">{c.userName}</span>
                    </div>
                 ))}
            </div>
        </div>
    )
}

function InvitationManager({ 
    explanation,
    currentUser,
    classroomId,
    classmates,
} : {
    explanation: Explanation;
    currentUser: UserProfile | null;
    classroomId: string | null;
    classmates: UserProfile[] | null;
}) {
    const firestore = useFirestore();
    const { toast } = useToast();
    const userInvite = (explanation.contributors || []).find(c => c.userId === currentUser?.uid && c.status === 'pending');
    
    const owner = (classmates || []).find(c => c.uid === explanation.ownerId);

    if (!userInvite) return null;

    const handleInvitationResponse = async (accept: boolean) => {
        if (!firestore || !classroomId || !currentUser?.uid) return;
        const explanationRef = doc(firestore, 'classrooms', classroomId, 'explanations', explanation.id);

        const newContributors = (explanation.contributors || []).map(c => 
            c.userId === currentUser.uid ? { ...c, status: accept ? 'accepted' : 'declined' } : c
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
                <p className="text-sm font-medium">
                  <span className="font-bold">{owner?.name || 'A classmate'}</span> invited you to explain <span className="font-bold">{explanation.subject}</span>.
                </p>
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

    const isTeacher = currentUser?.role === 'teacher';
    const isAdmin = currentUser?.role === 'admin';
    const isReviewed = explanation.completionStatus === 'explained' || explanation.completionStatus === 'not-explained';

    const createdAtDate = explanation.createdAt?.toDate();
    const timeAgo = createdAtDate ? formatDistanceToNow(createdAtDate, { addSuffix: true }) : 'a while ago';
    
    const explanationDate = explanation.explanationDate?.toDate();
    const fullDate = explanationDate ? format(explanationDate, 'EEEE, MMMM d') : explanation.day.charAt(0).toUpperCase() + explanation.day.slice(1);

    const loText = explanation.learningOutcome ? ` - LO ${explanation.learningOutcome}` : '';

    const handleCompletionStatus = async (status: 'explained' | 'not-explained') => {
        if (!firestore || !classroomId || !isTeacher) return;
        const explanationRef = doc(firestore, 'classrooms', classroomId, 'explanations', explanation.id);
        try {
            await updateDoc(explanationRef, { completionStatus: status });
            toast({
                title: 'Status Updated',
                description: `Marked as ${status === 'explained' ? 'Explained' : 'Not Explained'}.`
            });
        } catch (error) {
            console.error('Error updating completion status:', error);
            toast({ variant: 'destructive', title: 'Error', description: 'Could not update status.'});
        }
    };


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
                title: "Commitment Deleted",
                description: "The commitment to explain this topic has been removed.",
            });
        } catch (error) {
            console.error("Error deleting explanation: ", error);
            toast({
                variant: "destructive",
                title: "Deletion Failed",
                description: "There was a problem deleting this commitment. Please try again.",
            });
        }
    }

    const CompletionStatusIcon = () => {
        switch (explanation.completionStatus) {
            case 'explained':
                return <TooltipProvider><Tooltip><TooltipTrigger asChild><CheckCircle className="size-4 text-green-500" /></TooltipTrigger><TooltipContent><p>Explained</p></TooltipContent></Tooltip></TooltipProvider>;
            case 'not-explained':
                return <TooltipProvider><Tooltip><TooltipTrigger asChild><XCircle className="size-4 text-red-500" /></TooltipTrigger><TooltipContent><p>Not Explained</p></TooltipContent></Tooltip></TooltipProvider>;
            default:
                 return <TooltipProvider><Tooltip><TooltipTrigger asChild><HelpCircle className="size-4 text-muted-foreground" /></TooltipTrigger><TooltipContent><p>Pending Teacher Feedback</p></TooltipContent></Tooltip></TooltipProvider>;
        }
    }

    const cardClasses = cn(
        "bg-card/50 relative group transition-colors",
        explanation.completionStatus === 'explained' && 'bg-green-500/10 border-green-500/50',
        explanation.completionStatus === 'not-explained' && 'bg-red-500/10 border-red-500/50'
    );


    return (
        <Card className={cardClasses}>
             <div className="absolute top-2 right-2 flex items-center gap-2">
                {explanation.status === 'Finished' && <CompletionStatusIcon />}

                {explanation.status === 'Upcoming' 
                    ? <Badge variant="outline" className="border-green-500 text-green-500"><Check className="mr-1 h-3 w-3"/> Upcoming</Badge>
                    : <Badge variant="outline"><Clock className="mr-1 h-3 w-3"/> Finished</Badge>
                }
                
                {isAdmin && (
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
                                This action will permanently delete this explanation commitment. This cannot be undone.
                            </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                            <AlertDialogCancel>Keep Commitment</AlertDialogCancel>
                            <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">
                                Yes, Delete It
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
                {isTeacher && explanation.status === 'Finished' && !isReviewed && (
                    <div className="flex items-center justify-end gap-2 pt-2 border-t mt-3">
                        <span className="text-xs text-muted-foreground">Was it explained?</span>
                        <Button size="icon" variant="outline" className="h-7 w-7 hover:bg-green-100 dark:hover:bg-green-900" onClick={() => handleCompletionStatus('explained')}>
                            <Check className="size-4 text-green-600" />
                        </Button>
                        <Button size="icon" variant="outline" className="h-7 w-7 hover:bg-red-100 dark:hover:bg-red-900" onClick={() => handleCompletionStatus('not-explained')}>
                            <X className="size-4 text-red-600" />
                        </Button>
                    </div>
                )}
            </CardContent>
        </Card>
    )
}

function DeleteAllDialog({ classroomId }: { classroomId: string | null }) {
    const firestore = useFirestore();
    const { toast } = useToast();
    const [password, setPassword] = useState("");
    const [isOpen, setIsOpen] = useState(false);
    const correctPassword = "Iamtheonlyadminonearth";

    const handleDeleteAll = async () => {
        if (password !== correctPassword) {
            toast({
                variant: "destructive",
                title: "Incorrect Password",
                description: "You are not authorized to perform this action.",
            });
            return;
        }

        if (!firestore || !classroomId) {
            toast({
                variant: "destructive",
                title: "Error",
                description: "Could not connect to the database.",
            });
            return;
        }

        try {
            const explanationsRef = collection(firestore, "classrooms", classroomId, "explanations");
            const q = query(explanationsRef);
            const querySnapshot = await getDocs(q);
            
            if (querySnapshot.empty) {
                 toast({
                    title: "Nothing to Delete",
                    description: "There are no explanation commitments to delete.",
                });
                setIsOpen(false);
                return;
            }

            const batch = writeBatch(firestore);
            querySnapshot.forEach((doc) => {
                batch.delete(doc.ref);
            });
            await batch.commit();

            toast({
                title: "Success!",
                description: "All explanation commitments have been deleted.",
            });
            setPassword("");
            setIsOpen(false);
        } catch (error) {
            console.error("Error deleting all explanations: ", error);
            toast({
                variant: "destructive",
                title: "Deletion Failed",
                description: "There was a problem deleting the commitments. Please try again.",
            });
        }
    };

    return (
        <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
            <AlertDialogTrigger asChild>
                <Button variant="destructive" size="sm" className="font-bold"><Trash2 className="mr-2"/>Delete all sessions</Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Are you the admin?</AlertDialogTitle>
                    <AlertDialogDescription>
                        This is a destructive action and will permanently delete all student commitments for this classroom. To proceed, please enter the admin password.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <div className="space-y-2">
                    <Label htmlFor="admin-password">Admin Password</Label>
                    <Input
                        id="admin-password"
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Enter the secret password"
                    />
                </div>
                <AlertDialogFooter>
                    <AlertDialogCancel onClick={() => setPassword("")}>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDeleteAll} disabled={password !== correctPassword}>
                        Confirm Deletion
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}

export function ClassmatesDashboard({ classmates, explanations, currentUser, classroomId }: { 
    classmates: UserProfile[] | null;
    explanations: Explanation[] | null;
    currentUser: UserProfile | null;
    classroomId: string | null;
}) {

    const pendingInvitations = (explanations || []).filter(exp => 
        (exp.contributors || []).some(c => c.userId === currentUser?.uid && c.status === 'pending')
    );
    const isAdmin = currentUser?.role === 'admin';

    return (
        <Card>
            <CardHeader>
                <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <Users className="size-6 text-primary"/>
                        <div>
                            <CardTitle>Classmates & Commitments</CardTitle>
                            <CardDescription>
                                Students in your class and their commitments to explain topics.
                            </CardDescription>
                        </div>
                    </div>
                    {isAdmin && <DeleteAllDialog classroomId={classroomId} />}
                </div>
                 {pendingInvitations.length > 0 && (
                    <div className="!mt-4 space-y-2">
                        {pendingInvitations.map(exp => (
                            <InvitationManager
                                key={exp.id}
                                explanation={exp}
                                currentUser={currentUser}
                                classroomId={classroomId}
                                classmates={classmates}
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
                        This class has no students yet.
                    </div>
                ) : (
                    classmates.map(student => {
                        const studentExplanations = (explanations || [])
                            .filter(exp => (exp.contributors || []).some(c => c.userId === student.uid && c.status === 'accepted'))
                            .sort((a, b) => {
                                const dateA = a.createdAt?.toDate()?.getTime() || 0;
                                const dateB = b.createdAt?.toDate()?.getTime() || 0;
                                return dateB - dateA;
                            });

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
