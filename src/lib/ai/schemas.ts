import { z } from "zod";

export const difficultySchema = z.enum(["foundation", "standard", "advanced"]);
export const questionTypeSchema = z.enum([
  "mcq",
  "true_false",
  "short_answer",
  "subjective",
  "application",
]);

export const generatedQuestionSchema = z.object({
  question: z.string().trim().min(2).max(2000),
  questionType: questionTypeSchema,
  options: z.array(z.string().trim().min(1).max(300)).max(6),
  correctAnswer: z.string().trim().max(500).nullable(),
  marks: z.number().int().positive().max(100),
  difficulty: difficultySchema,
  topic: z.string().trim().min(1).max(160),
  learningObjective: z.string().trim().max(400),
  expectedAnswer: z.string().trim().max(1200).nullable(),
  explanation: z.string().trim().max(1200).nullable(),
});

export const generatedQuestionSetSchema = z.object({
  title: z.string().trim().min(2).max(180),
  instructions: z.string().trim().max(2000),
  questions: z.array(generatedQuestionSchema).min(1).max(30),
});

export const lessonPlanSchema = z.object({
  title: z.string().trim().min(2).max(180),
  objective: z.string().trim().min(2).max(500),
  prerequisites: z.array(z.string().trim().min(1).max(300)).max(10),
  introduction: z.string().trim().max(1500),
  explanation: z.string().trim().max(3000),
  examples: z.array(z.string().trim().min(1).max(1000)).max(10),
  activity: z.string().trim().max(1800),
  assessment: z.string().trim().max(1200),
  differentiation: z.array(z.string().trim().min(1).max(600)).max(10),
  homeworkSuggestion: z.string().trim().max(1000),
});

export const slideSchema = z.object({
  title: z.string().trim().min(2).max(180),
  teachingContent: z.string().trim().max(2500),
  keyPoints: z.array(z.string().trim().min(1).max(400)).max(8),
  example: z.string().trim().max(1000).nullable(),
  activity: z.string().trim().max(1000).nullable(),
  teacherNotes: z.string().trim().max(1200).nullable(),
});
export const lessonSlidesSchema = z.object({
  title: z.string().trim().min(2).max(180),
  slides: z.array(slideSchema).min(1).max(20),
});

export const worksheetSchema = z.object({
  title: z.string().trim().min(2).max(180),
  questions: z.array(generatedQuestionSchema).min(1).max(30),
});

export const studyNotesSchema = z.object({
  title: z.string().trim().min(2).max(180),
  summary: z.string().trim().max(3000),
  keyConcepts: z.array(z.string().trim().min(1).max(600)).max(20),
  definitions: z
    .array(
      z.object({ term: z.string().trim().min(1).max(120), definition: z.string().trim().max(800) }),
    )
    .max(20),
  relationships: z.array(z.string().trim().min(1).max(600)).max(20),
  examples: z.array(z.string().trim().min(1).max(800)).max(15),
  revisionPoints: z.array(z.string().trim().min(1).max(500)).max(20),
});

export const revisionSheetSchema = z.object({
  title: z.string().trim().min(2).max(180),
  keyConcepts: z.array(z.string().trim().min(1).max(600)).max(20),
  formulas: z.array(z.string().trim().min(1).max(500)).max(15),
  definitions: z.array(z.string().trim().min(1).max(600)).max(20),
  commonMistakes: z.array(z.string().trim().min(1).max(600)).max(20),
  examples: z.array(z.string().trim().min(1).max(800)).max(15),
  practiceQuestions: z.array(generatedQuestionSchema).max(20),
  quickReview: z.array(z.string().trim().min(1).max(500)).max(20),
});

export const flashcardSchema = z.object({
  front: z.string().trim().min(1).max(600),
  back: z.string().trim().min(1).max(1200),
  concept: z.string().trim().min(1).max(160),
});
export const flashcardsSchema = z.object({
  title: z.string().trim().min(2).max(180),
  cards: z.array(flashcardSchema).min(1).max(50),
});

export const mindMapNodeSchema: z.ZodType<{
  label: string;
  description?: string;
  children: Array<{ label: string; description?: string; children: unknown[] }>;
}> = z.object({
  label: z.string().trim().min(1).max(180),
  description: z.string().trim().max(500).optional(),
  children: z.array(z.any()).max(20),
});
export const mindMapSchema = z.object({
  title: z.string().trim().min(2).max(180),
  root: mindMapNodeSchema,
});

export const activitySchema = z.object({
  title: z.string().trim().min(2).max(180),
  objective: z.string().trim().max(600),
  materials: z.array(z.string().trim().min(1).max(300)).max(20),
  instructions: z.array(z.string().trim().min(1).max(700)).max(20),
  expectedOutcome: z.string().trim().max(800),
  approximateDurationMinutes: z.number().int().positive().max(240),
});

export const answerKeySchema = z.object({
  suggestedAnswer: z.string().trim().min(1).max(2000),
  keyConcepts: z.array(z.string().trim().min(1).max(400)).max(20),
  markingGuidance: z.array(z.string().trim().min(1).max(600)).max(20),
  rubric: z
    .array(
      z.object({
        criterion: z.string().trim().min(1).max(200),
        guidance: z.string().trim().max(600),
        marks: z.number().positive().max(100),
      }),
    )
    .max(20),
});

export const tutorResponseSchema = z.object({
  response: z.string().trim().min(1).max(5000),
  hintLevel: z.number().int().min(0).max(5),
  nextStep: z.string().trim().max(700),
  safetyNote: z.string().trim().max(500).nullable(),
  suggestedPractice: z.array(z.string().trim().min(1).max(600)).max(5),
});

export const parentMessageSchema = z.object({
  subject: z.string().trim().min(2).max(180),
  body: z.string().trim().min(2).max(3000),
  suggestedAction: z.string().trim().max(800),
});

export const generatedObjectJsonSchema = {
  type: "object",
  additionalProperties: true,
} as const;

export type GeneratedQuestionSet = z.infer<typeof generatedQuestionSetSchema>;
export type TutorResponse = z.infer<typeof tutorResponseSchema>;
