
export interface UserProfile {
  uid: string;
  name: string;
  email: string;
  age: number;
  school: string;
  grade: '10' | '11' | '12';
  class: 'a' | 'b' | 'c' | 'd' | 'e' | 'f';
}

export interface Explanation {
  id: string;
  userId: string;
  userName: string;
  subject: string;
  day: string;
  session: string;
  learningOutcome: number;
  concepts: string[];
  createdAt: any; // Firestore timestamp
}
