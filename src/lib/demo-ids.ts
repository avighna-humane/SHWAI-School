/** Client-safe mapping of demo role → stable user identity used in all DB operations. */
export interface DemoIdentity {
  userId: string;
  userName: string;
  classId?: string; // students only
}

export const DEMO_IDS: Record<string, DemoIdentity> = {
  teacher:   { userId: 'tch-1',          userName: 'Meera Iyer' },
  principal: { userId: 'demo-principal', userName: 'Dr. Vikram Nair' },
  admin:     { userId: 'demo-principal', userName: 'Dr. Vikram Nair' },
  owner:     { userId: 'demo-owner',     userName: 'Harish Agarwal' },
  student:   { userId: 'stu-1',          userName: 'Aarav Sharma', classId: 'cls-9A' },
  parent:    { userId: 'demo-parent',    userName: 'Rajesh Sharma' },
};

export function getDemoIds(role: string): DemoIdentity {
  return DEMO_IDS[role] ?? { userId: 'demo-unknown', userName: 'Unknown' };
}

/** Contacts available to each role in the chat demo. */
export const CHAT_CONTACTS: Record<string, Array<{ userId: string; userName: string; role: string }>> = {
  teacher: [
    { userId: 'stu-1', userName: 'Aarav Sharma', role: 'student' },
    { userId: 'stu-2', userName: 'Priya Mehta', role: 'student' },
    { userId: 'stu-3', userName: 'Rahul Joshi', role: 'student' },
  ],
  student: [
    { userId: 'tch-1', userName: 'Meera Iyer', role: 'teacher' },
  ],
  principal: [
    { userId: 'tch-1', userName: 'Meera Iyer', role: 'teacher' },
    { userId: 'tch-2', userName: 'Anil Kulkarni', role: 'teacher' },
  ],
  admin: [
    { userId: 'tch-1', userName: 'Meera Iyer', role: 'teacher' },
    { userId: 'tch-2', userName: 'Anil Kulkarni', role: 'teacher' },
  ],
};
