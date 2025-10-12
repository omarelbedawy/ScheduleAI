
"use client";

import { UserProfile } from "@/lib/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Users } from "lucide-react";

function getInitials(name: string) {
    const names = name.split(' ');
    if (names.length === 1) return names[0].charAt(0).toUpperCase();
    return `${names[0].charAt(0)}${names[names.length - 1].charAt(0)}`.toUpperCase();
}

export function ClassmatesDashboard({ classmates }: { classmates: UserProfile[] | null }) {
    return (
        <Card>
            <CardHeader>
                <div className="flex items-center gap-3">
                    <Users className="size-6 text-primary"/>
                    <div>
                        <CardTitle>Classmates</CardTitle>
                        <CardDescription>
                            Students in your class will appear here.
                        </CardDescription>
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-[80px]">Avatar</TableHead>
                            <TableHead>Name</TableHead>
                            <TableHead>Email</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {!classmates ? (
                             Array.from({ length: 3 }).map((_, i) => (
                                <TableRow key={i}>
                                    <TableCell>
                                        <Skeleton className="h-10 w-10 rounded-full" />
                                    </TableCell>
                                    <TableCell>
                                        <Skeleton className="h-4 w-48" />
                                    </TableCell>
                                    <TableCell>
                                        <Skeleton className="h-4 w-64" />
                                    </TableCell>
                                </TableRow>
                            ))
                        ) : classmates.length === 0 ? (
                             <TableRow>
                                <TableCell colSpan={3} className="h-24 text-center">
                                    No classmates found.
                                </TableCell>
                            </TableRow>
                        ) : (
                            classmates.map(student => (
                                <TableRow key={student.uid}>
                                    <TableCell>
                                        <Avatar>
                                            <AvatarFallback>{getInitials(student.name)}</AvatarFallback>
                                        </Avatar>
                                    </TableCell>
                                    <TableCell className="font-medium">{student.name}</TableCell>
                                    <TableCell>{student.email}</TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
}
