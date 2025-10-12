
export interface UserProfile {
  uid: string;
  name: string;
  email: string;
  age: number;
  school: string;
  grade: '10' | '11' | '12';
  class: 'a' | 'b' | 'c' | 'd' | 'e' | 'f';
}

export interface ExplanationContributor {
  userId: string;
  userName: string;
  status: 'pending' | 'accepted' | 'declined';
}


export interface Explanation {
  id: string;
  // userId: string; - Replaced by ownerId
  // userName: string; - Replaced by contributors
  ownerId: string;
  contributors: ExplanationContributor[];
  subject: string;
  day: string;
  session: string;
  learningOutcome?: number;
  concepts: string[];
  explanationDate: any; // Firestore Timestamp
  status: 'Upcoming' | 'Finished';
  createdAt: any; // Firestore timestamp
}
