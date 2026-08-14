export type ScenarioInputs = {
  availableTeachers: number;
  availableRooms: number;
  roomCapacity: number;
  groupSize: number;
  addedSessions: number;
  sessionMinutes: number;
  assignedTeachers: number;
  assignedRooms: number;
};

export type ScenarioOutput = {
  metrics: {
    timetableConflicts: number;
    teacherWorkloadDeltaMinutes: number;
    roomUtilizationDeltaPercent: number;
    studentsServed: number;
    teacherCapacityRemaining: number;
    roomCapacityRemaining: number;
  };
  warnings: string[];
  tradeoffs: string[];
  certainty: Array<{
    field: string;
    state: "KNOWN" | "CALCULATED" | "ASSUMED" | "UNKNOWN";
    reason: string;
  }>;
};

export function calculateScenario(inputs: ScenarioInputs): ScenarioOutput {
  const timetableConflicts = Math.max(
    0,
    inputs.assignedRooms + inputs.addedSessions - inputs.availableRooms,
  );
  const teacherWorkloadDeltaMinutes = Math.max(
    0,
    inputs.addedSessions * inputs.sessionMinutes * Math.max(1, inputs.assignedTeachers),
  );
  const roomUtilizationDeltaPercent =
    inputs.availableRooms > 0
      ? Number(((inputs.addedSessions / inputs.availableRooms) * 100).toFixed(2))
      : 0;
  const studentsServed = Math.max(
    0,
    Math.min(inputs.groupSize, inputs.roomCapacity || inputs.groupSize),
  );
  const teacherCapacityRemaining = Math.max(0, inputs.availableTeachers - inputs.assignedTeachers);
  const roomCapacityRemaining = Math.max(
    0,
    inputs.availableRooms - inputs.assignedRooms - inputs.addedSessions,
  );
  const warnings: string[] = [];
  const tradeoffs: string[] = [];
  if (timetableConflicts > 0)
    warnings.push(`${timetableConflicts} room allocation conflict(s) require resolution.`);
  if (teacherCapacityRemaining === 0)
    warnings.push("No unassigned teacher capacity remains under these assumptions.");
  if (roomCapacityRemaining === 0)
    warnings.push("No unassigned room capacity remains under these assumptions.");
  if (teacherWorkloadDeltaMinutes > 0)
    tradeoffs.push(
      `Teacher workload increases by ${teacherWorkloadDeltaMinutes} minutes per week under the supplied schedule.`,
    );
  if (roomUtilizationDeltaPercent > 0)
    tradeoffs.push(
      `Room utilization increases by ${roomUtilizationDeltaPercent} percentage points under the supplied room assumptions.`,
    );
  return {
    metrics: {
      timetableConflicts,
      teacherWorkloadDeltaMinutes,
      roomUtilizationDeltaPercent,
      studentsServed,
      teacherCapacityRemaining,
      roomCapacityRemaining,
    },
    warnings,
    tradeoffs,
    certainty: [
      {
        field: "timetableConflicts",
        state: "CALCULATED",
        reason: "Calculated from rooms, sessions, and explicit assignment inputs.",
      },
      {
        field: "teacherWorkloadDeltaMinutes",
        state: "CALCULATED",
        reason: "Calculated from session duration and assigned teachers.",
      },
      {
        field: "studentsServed",
        state: "CALCULATED",
        reason: "Bounded by explicit group size and room capacity.",
      },
      {
        field: "futureAcademicPerformance",
        state: "UNKNOWN",
        reason: "No validated predictive model is used in V5.",
      },
    ],
  };
}

export type WorkloadTask = {
  estimatedMinutes: number;
  actualMinutes?: number | null;
  dueAt?: string | null;
  status: string;
  taskType: string;
};
export function calculateWorkload(tasks: WorkloadTask[], thresholdMinutes: number) {
  const active = tasks.filter((task) => task.status !== "cancelled");
  const estimatedMinutes = active.reduce(
    (sum, task) => sum + Math.max(0, task.estimatedMinutes),
    0,
  );
  const actualMinutes = active.reduce((sum, task) => sum + Math.max(0, task.actualMinutes ?? 0), 0);
  const deadlines = active
    .filter((task) => task.dueAt)
    .map((task) => new Date(task.dueAt!).getTime())
    .sort((a, b) => a - b);
  const deadlineClusters = deadlines.reduce(
    (count, date, index) =>
      count + (index > 0 && date - deadlines[index - 1]! < 48 * 60 * 60 * 1000 ? 1 : 0),
    0,
  );
  return {
    taskCount: active.length,
    estimatedMinutes,
    actualMinutes,
    thresholdMinutes,
    exceedsThreshold: estimatedMinutes > thresholdMinutes,
    deadlineClusters,
    message:
      estimatedMinutes > thresholdMinutes
        ? "Workload exceeds the configured planning threshold."
        : "Workload is within the configured planning threshold.",
  };
}
