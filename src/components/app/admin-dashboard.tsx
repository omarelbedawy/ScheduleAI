
"use client";

import { useMemo, useState, useEffect } from "react";
import type { UserProfile, Explanation } from "@/lib/types";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { Input } from "@/components/ui/input";
import { ScheduleTable } from "./schedule-table";
import { useFirestore, useCollection, useDoc } from "@/firebase";
import { doc, collection, query, where, deleteDoc, getDocs, writeBatch } from "firebase/firestore";
import { ClassmatesDashboard } from "./classmates-dashboard";
import { Loader2, Trash2 } from "lucide-react";
import { schoolList } from "@/lib/schools";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { deleteUserAction } from "@/app/actions";

interface ClassroomSchedule {
  schedule: any[];
  lastUpdatedBy?: string;
  updatedAt?: any;
}


function UserManagement({ adminUser }: { adminUser: UserProfile }) {
  const firestore = useFirestore();
  const { toast } = useToast();
  const usersQuery = useMemo(() => {
    if (!firestore) return null;
    return collection(firestore, 'users');
  }, [firestore]);

  const { data: initialUsers, loading: usersLoading } = useCollection<UserProfile>(usersQuery);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [filter, setFilter] = useState("");

  useEffect(() => {
    if (initialUsers) {
      setUsers(initialUsers);
    }
  }, [initialUsers]);


  const handleDeleteUser = async (userId: string) => {
    if (!firestore) return;
    
    // Optimistic UI update
    const originalUsers = users;
    setUsers(currentUsers => currentUsers.filter(u => u.uid !== userId));
    
    toast({ title: "Deleting User Data...", description: "Removing user profile from the database."});

    try {
      const result = await deleteUserAction({ userId });

      if (result.success) {
        toast({ title: "User Data Deleted", description: "The user's profile has been removed. You may need to manually delete them from Firebase Authentication."});
      } else {
        throw new Error(result.message);
      }
    } catch (error: any) {
        // If anything fails, revert the UI and show an error
        setUsers(originalUsers);
        console.error("Error deleting user: ", error);
        toast({ variant: "destructive", title: "Deletion Failed", description: error.message || "Could not delete user's data."});
    }
  }

  const filteredUsers = useMemo(() => {
    if (!users) return [];
    return users.filter(u => u.uid !== adminUser.uid && (
        u.name.toLowerCase().includes(filter.toLowerCase()) ||
        u.email.toLowerCase().includes(filter.toLowerCase()) ||
        u.role.toLowerCase().includes(filter.toLowerCase())
    ));
  }, [users, filter, adminUser.uid]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>User Management</CardTitle>
        <CardDescription>View, edit, and delete users from the system.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Input 
            placeholder="Filter by name, email, or role..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
        />
        <div className="border rounded-md">
            <Table>
            <TableHeader>
                <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>School</TableHead>
                <TableHead>Grade</TableHead>
                <TableHead>Class</TableHead>
                <TableHead className="text-right">Actions</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {usersLoading ? (
                    <TableRow><TableCell colSpan={7} className="text-center"><Loader2 className="inline-block animate-spin" /></TableCell></TableRow>
                ) : filteredUsers.map(user => (
                    <TableRow key={user.uid}>
                        <TableCell className="font-medium">{user.name}</TableCell>
                        <TableCell>{user.email}</TableCell>
                        <TableCell><Badge variant={user.role === 'admin' ? 'destructive' : 'secondary'}>{user.role}</Badge></TableCell>
                        <TableCell>{schoolList.find(s => s.id === user.school)?.name || user.school}</TableCell>
                        <TableCell>{user.grade || 'N/A'}</TableCell>
                        <TableCell>{user.class?.toUpperCase() || 'N/A'}</TableCell>
                        <TableCell className="text-right">
                           <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <Button variant="ghost" size="icon" className="text-destructive"><Trash2 className="size-4"/></Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader><AlertDialogTitle>Delete {user.name}'s Data?</AlertDialogTitle><AlertDialogDescription>This action is irreversible and will permanently delete the user's profile data from the database. It will not delete their authentication account.</AlertDialogDescription></AlertDialogHeader>
                                    <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => handleDeleteUser(user.uid)} className="bg-destructive hover:bg-destructive/90">Delete User Data</AlertDialogAction></AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                        </TableCell>
                    </TableRow>
                ))}
            </TableBody>
            </Table>
        </div>
      </CardContent>
    </Card>
  );
}

export function AdminDashboard({ admin }: { admin: UserProfile }) {
  const [selectedSchool, setSelectedSchool] = useState<string>(schoolList[0].id);
  const [selectedGrade, setSelectedGrade] = useState<string>("11");
  const [selectedClass, setSelectedClass] = useState<string>("c");
  const [view, setView] = useState<'users' | 'classrooms'>('classrooms');

  const firestore = useFirestore();
  const { toast } = useToast();

  const classroomId = useMemo(() => {
    if (!selectedSchool || !selectedGrade || !selectedClass) return null;
    return `${selectedSchool}-${selectedGrade}-${selectedClass}`;
  }, [selectedSchool, selectedGrade, selectedClass]);

  const classroomDocRef = useMemo(() => {
    if (!firestore || !classroomId) return null;
    return doc(firestore, 'classrooms', classroomId);
  }, [firestore, classroomId]);
  const { data: classroomSchedule, loading: classroomLoading } = useDoc<ClassroomSchedule>(classroomDocRef);

  const classmatesQuery = useMemo(() => {
    if (!firestore || !selectedSchool || !selectedGrade || !selectedClass) return null;
    return query(
      collection(firestore, "users"),
      where("school", "==", selectedSchool),
      where("grade", "==", selectedGrade),
      where("class", "==", selectedClass)
    );
  }, [firestore, selectedSchool, selectedGrade, selectedClass]);
  const { data: classmates, loading: classmatesLoading } = useCollection<UserProfile>(classmatesQuery);

  const explanationsQuery = useMemo(() => {
    if (!firestore || !classroomId) return null;
    return collection(firestore, 'classrooms', classroomId, 'explanations');
  }, [firestore, classroomId]);
  const { data: explanations, loading: explanationsLoading } = useCollection<Explanation>(explanationsQuery);

  const isLoading = classroomLoading || classmatesLoading || explanationsLoading;
  const schoolName = schoolList.find(s => s.id === selectedSchool)?.name || selectedSchool;
  
  const handleDeleteSchedule = async () => {
    if (!firestore || !classroomId) return;
    try {
      await deleteDoc(doc(firestore, 'classrooms', classroomId));
      toast({ title: "Schedule Deleted", description: "The schedule for this class has been removed."});
    } catch (error) {
      console.error("Error deleting schedule: ", error);
      toast({ variant: "destructive", title: "Deletion Failed", description: "Could not delete schedule."});
    }
  };

  const handleDeleteAllExplanations = async () => {
    if (!firestore || !classroomId) return;
     try {
        const explanationsRef = collection(firestore, "classrooms", classroomId, "explanations");
        const q = query(explanationsRef);
        const querySnapshot = await getDocs(q);
        
        if (querySnapshot.empty) {
            toast({ title: "Nothing to Delete", description: "This classroom has no commitments." });
            return;
        }

        const batch = writeBatch(firestore);
        querySnapshot.forEach((doc) => batch.delete(doc.ref));
        await batch.commit();

        toast({ title: "All Commitments Deleted", description: "All student commitments for this classroom have been cleared." });
    } catch (error) {
        console.error("Error deleting all explanations: ", error);
        toast({ variant: "destructive", title: "Deletion Failed", description: "Could not clear commitments."});
    }
  }

  return (
    <div className="space-y-8">
        <Card>
            <CardHeader>
                <div className="flex justify-between items-center">
                    <div>
                        <CardTitle>Admin Dashboard</CardTitle>
                        <CardDescription>Oversee all schools, classes, and users.</CardDescription>
                    </div>
                     <div className="flex gap-2">
                        <Button variant={view === 'classrooms' ? 'default' : 'outline'} onClick={() => setView('classrooms')}>Classrooms</Button>
                        <Button variant={view === 'users' ? 'default' : 'outline'} onClick={() => setView('users')}>Users</Button>
                    </div>
                </div>
            </CardHeader>
        </Card>

      {view === 'classrooms' && (
        <>
            <Card>
                <CardHeader>
                    <CardTitle>Classroom Browser</CardTitle>
                    <CardDescription>Select a school, grade, and class to view its details.</CardDescription>
                </CardHeader>
                <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Select value={selectedSchool} onValueChange={setSelectedSchool}>
                    <SelectTrigger><SelectValue placeholder="Select School" /></SelectTrigger>
                    <SelectContent>{schoolList.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
                    </Select>
                    <Select value={selectedGrade} onValueChange={setSelectedGrade}>
                    <SelectTrigger><SelectValue placeholder="Select Grade" /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="10">Grade 10</SelectItem>
                        <SelectItem value="11">Grade 11</SelectItem>
                        <SelectItem value="12">Grade 12</SelectItem>
                    </SelectContent>
                    </Select>
                    <Select value={selectedClass} onValueChange={setSelectedClass}>
                    <SelectTrigger><SelectValue placeholder="Select Class" /></SelectTrigger>
                    <SelectContent>{['a','b','c','d','e','f'].map(c => <SelectItem key={c} value={c}>Class {c.toUpperCase()}</SelectItem>)}</SelectContent>
                    </Select>
                </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                  <div className="flex flex-wrap justify-between items-center gap-4">
                      <div>
                        <CardTitle>Schedule for Class {selectedGrade}{selectedClass.toUpperCase()} at {schoolName}</CardTitle>
                        <CardDescription>Viewing as an administrator.</CardDescription>
                      </div>
                      {classroomSchedule?.schedule && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                              <Button variant="destructive" size="sm"><Trash2 className="mr-2"/>Delete Schedule</Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                              <AlertDialogHeader><AlertDialogTitle>Delete Schedule?</AlertDialogTitle><AlertDialogDescription>This action cannot be undone. This will permanently delete the schedule for this classroom.</AlertDialogDescription></AlertDialogHeader>
                              <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={handleDeleteSchedule} className="bg-destructive hover:bg-destructive/90">Delete Schedule</AlertDialogAction></AlertDialogFooter>
                          </AlertDialogContent>
                      </AlertDialog>
                      )}
                  </div>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="flex justify-center items-center h-48"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
                    ) : (classroomSchedule?.schedule && classroomSchedule.schedule.length > 0) ? (
                        <ScheduleTable
                            scheduleData={classroomSchedule.schedule}
                            isEditing={false} // Admins probably shouldn't edit schedules directly
                            user={admin}
                            classroomId={classroomId}
                            explanations={explanations || []}
                            classmates={classmates}
                        />
                    ) : (
                        <div className="text-center text-muted-foreground py-10">The schedule for this class has not been uploaded yet.</div>
                    )}
                </CardContent>
            </Card>

            {classroomId && !isLoading && (
                <ClassmatesDashboard 
                    classmates={classmates} 
                    explanations={explanations} 
                    currentUser={admin}
                    classroomId={classroomId}
                    onDeleteAllExplanations={handleDeleteAllExplanations}
                />
            )}
        </>
      )}
       {view === 'users' && (
           <UserManagement adminUser={admin} />
       )}
    </div>
  );
}
