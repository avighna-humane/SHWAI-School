export function validateMarks(maximumMarks: number, obtainedMarks: number): string | null {
  if (!Number.isFinite(maximumMarks) || maximumMarks <= 0)
    return "Maximum marks must be greater than zero";
  if (!Number.isFinite(obtainedMarks) || obtainedMarks < 0)
    return "Obtained marks cannot be negative";
  if (obtainedMarks > maximumMarks) return "Obtained marks cannot exceed maximum marks";
  return null;
}

export function timetableRangesOverlap(
  startA: string,
  endA: string,
  startB: string,
  endB: string,
): boolean {
  return startA < endB && endA > startB;
}

export function canViewPublishedGrade(input: {
  role: string;
  gradePublished: boolean;
  isOwner: boolean;
  isLinkedChild: boolean;
}): boolean {
  if (!input.gradePublished)
    return (
      ["teacher", "staff", "principal", "admin", "owner"].includes(input.role) && input.isOwner
    );
  if (["teacher", "staff", "principal", "admin", "owner"].includes(input.role)) return true;
  if (input.role === "student") return input.isOwner;
  if (input.role === "parent") return input.isLinkedChild;
  return false;
}
