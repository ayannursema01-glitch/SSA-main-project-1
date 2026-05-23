import { z } from "zod"

// ── Auth ────────────────────────────────────────────────────────────────
export const loginSchema = z.object({
  email: z.email(),
  password: z.string().min(4).optional(),
  name: z.string().max(100).optional(),
})

export const signupSchema = z.object({
  name: z.string().min(2),
  email: z.email(),
  password: z.string().min(6),
  role: z.enum(["student", "teacher"]),
  agreeTerms: z.literal(true),
})

// ── Flashcards ──────────────────────────────────────────────────────────
export const flashcardSchema = z.object({
  front: z.string().min(1).max(500),
  back: z.string().min(1).max(1000),
  subject: z.string().max(50).optional(),
})

/** Full POST body for creating a flashcard (includes userId) */
export const flashcardCreateSchema = z.object({
  userId: z.string().min(1),
  front: z.string().min(1).max(500),
  back: z.string().min(1).max(1000),
  subject: z.string().max(50).optional(),
})

/** PATCH body for reviewing a flashcard with SM-2 */
export const flashcardReviewSchema = z.object({
  id: z.string().min(1),
  userId: z.string().min(1),
  quality: z.number().int().min(1).max(5),
})

/** DELETE body for soft-deleting a flashcard */
export const flashcardDeleteSchema = z.object({
  id: z.string().min(1),
  userId: z.string().min(1),
})

// ── Notes ───────────────────────────────────────────────────────────────
export const noteSchema = z.object({
  title: z.string().min(1).max(200),
  content: z.string().max(50000).optional(),
  tags: z.string().max(200).optional(),
  folder: z.string().max(50).optional(),
})

/** Full POST body for creating a note (includes userId) */
export const noteCreateSchema = z.object({
  userId: z.string().min(1),
  title: z.string().min(1).max(200),
  content: z.string().max(50000).optional(),
  tags: z.string().max(200).optional(),
  folder: z.string().max(50).optional(),
})

/** PATCH body for updating a note */
export const noteUpdateSchema = z.object({
  id: z.string().min(1),
  userId: z.string().min(1),
  title: z.string().min(1).max(200).optional(),
  content: z.string().max(50000).optional(),
  tags: z.string().max(200).optional(),
  folder: z.string().max(50).optional(),
  isPinned: z.boolean().optional(),
  isStarred: z.boolean().optional(),
})

/** DELETE body for soft-deleting a note */
export const noteDeleteSchema = z.object({
  id: z.string().min(1),
  userId: z.string().min(1),
})

// ── Classrooms ──────────────────────────────────────────────────────────
export const classroomSchema = z.object({
  name: z.string().min(2).max(100),
  description: z.string().max(500).optional(),
  subject: z.string().max(50).optional(),
})

/** Full POST body for creating a classroom (includes userId) */
export const classroomCreateSchema = z.object({
  userId: z.string().min(1),
  name: z.string().min(2).max(100),
  description: z.string().max(500).optional(),
  subject: z.string().max(50).optional(),
})

/** POST body for joining a classroom via invite code */
export const joinClassroomSchema = z.object({
  inviteCode: z.string().min(6).max(6),
  userId: z.string().min(1),
})

// ── Quiz ────────────────────────────────────────────────────────────────
export const quizSetupSchema = z.object({
  subject: z.string().min(2),
  questionCount: z.number().min(1).max(20),
  difficulty: z.enum(["easy", "medium", "hard"]),
})

// ── Resource Push ───────────────────────────────────────────────────────
export const resourcePushSchema = z.object({
  teacherId: z.string().min(1),
  classroomId: z.string().min(1),
  type: z.enum(["note", "flashcard-deck", "quiz"]),
  title: z.string().min(1).max(200),
  content: z.string().min(1).optional(),
  description: z.string().max(500).optional(),
  isVerified: z.boolean().optional(),
})

// ── AI Chat ─────────────────────────────────────────────────────────────
const AI_CHAT_MODES = [
  "tutor",
  "explain",
  "deep-learning",
  "exam-prep",
  "flashcard-gen",
  "quiz-gen",
  "socratic",
  "paper-grader",
  "essay-architect",
  "study-planner",
  "writing-audit",
] as const

const chatMessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().min(1).max(4000),
})

export const aiChatSchema = z.object({
  messages: z.array(chatMessageSchema).min(1).max(50),
  mode: z.enum(AI_CHAT_MODES).optional(),
  userId: z.string().min(1).optional(),
})

// ── Admin User Update ───────────────────────────────────────────────────
export const adminUserPatchSchema = z.object({
  userId: z.string().min(1),
  role: z.enum(["student", "teacher", "admin"]).optional(),
  isBanned: z.boolean().optional(),
  xp: z.number().int().min(0).optional(),
})

// ── Inferred Types ──────────────────────────────────────────────────────
export type LoginInput = z.infer<typeof loginSchema>
export type SignupInput = z.infer<typeof signupSchema>
export type FlashcardInput = z.infer<typeof flashcardSchema>
export type FlashcardCreateInput = z.infer<typeof flashcardCreateSchema>
export type FlashcardReviewInput = z.infer<typeof flashcardReviewSchema>
export type FlashcardDeleteInput = z.infer<typeof flashcardDeleteSchema>
export type NoteInput = z.infer<typeof noteSchema>
export type NoteCreateInput = z.infer<typeof noteCreateSchema>
export type NoteUpdateInput = z.infer<typeof noteUpdateSchema>
export type NoteDeleteInput = z.infer<typeof noteDeleteSchema>
export type ClassroomInput = z.infer<typeof classroomSchema>
export type ClassroomCreateInput = z.infer<typeof classroomCreateSchema>
export type JoinClassroomInput = z.infer<typeof joinClassroomSchema>
export type QuizSetupInput = z.infer<typeof quizSetupSchema>
export type ResourcePushInput = z.infer<typeof resourcePushSchema>
export type AiChatInput = z.infer<typeof aiChatSchema>
export type AdminUserPatchInput = z.infer<typeof adminUserPatchSchema>
