
"use client";

import type { UserProfile, Explanation } from "@/lib/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, BookUser, Tag, CalendarDays } from "lucide-react";
import { Badge } from "../ui/badge";

function getInitials(name: string) {
    if (!name) return '';
    const names = name.split(' ');
    if (names.length === 1) return names[0].charAt(0).toUpperCase();
    return `${names[0].charAt(0)}${names[names.length - 1].charAt(0)}`.toUpperCase();
}

function ExplanationCard({ explanation }: { explanation: Explanation }) {
    const dayCapitalized = explanation.day.charAt(0).toUpperCase() + explanation.day.slice(1);
    return (
        <Card className="bg-card/50">
            <CardHeader className="p-4">
                <CardTitle className="text-base flex items-center gap-2">
                    <BookUser className="size-5 text-primary" />
                    {explanation.subject} - LO {explanation.learningOutcome}
                </CardTitle>
                <CardDescription className="flex items-center gap-2 text-xs">
                     <CalendarDays className="size-4" />
                    Session {explanation.session} on {dayCapitalized}
                </CardDescription>
            </CardHeader>
            <CardContent className="p-4 pt-0">
                <div className="flex flex-wrap gap-2">
                    {explanation.concepts.map(concept => (
                        <Badge key={concept} variant="outline">{concept}</Badge>
                    ))}
                </div>
            </CardContent>
        </Card>
    )
}

export function ClassmatesDashboard({ classmates, explanations, currentUser }: { 
    classmates: UserProfile[] | null;
    explanations: Explanation[] | null;
    currentUser: UserProfile | null;
}) {
    const otherClassmates = classmates?.filter(cm => cm.uid !== currentUser?.uid);

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
                        const studentExplanations = explanations?.filter(exp => exp.userId === student.uid) || [];
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
                                                <ExplanationCard key={exp.id} explanation={exp} />
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
