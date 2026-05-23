import { create } from 'zustand'

export type AppView = 'landing' | 'login' | 'signup' | 'dashboard' | 'ai-tutor' | 'notes' | 'flashcards' | 'quizzes' | 'focus' | 'analytics' | 'calendar' | 'files' | 'settings' | 'collaboration' | 'admin' | 'teacher' | 'ssa-studio' | 'pdf-tools'

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: number
}

export interface FlashcardData {
  id: string
  front: string
  back: string
  subject: string
  confidence: number
  reviewCount: number
  isFlipped: boolean
  // SM-2 Algorithm fields
  easeFactor: number  // Easiness factor (default 2.5)
  interval: number    // Repetition interval in days
  nextReview: number  // Timestamp for next review
  lastReview: number  // Timestamp of last review
}

export interface NoteData {
  id: string
  title: string
  content: string
  tags: string[]
  folder: string
  isPinned: boolean
  updatedAt: number
}

export interface FocusSessionData {
  id: string
  duration: number
  type: string
  environment: string
  completed: boolean
  startedAt: number
}

export interface QuizQuestion {
  id: string
  question: string
  options: string[]
  correctAnswer: number
  explanation: string
  userAnswer?: number
}

export interface UserProfile {
  id: string
  name: string
  email: string
  avatar?: string
  xp: number
  level: number
  streak: number
  role: 'student' | 'teacher' | 'admin'
  learningStyle?: 'visual' | 'auditory' | 'kinesthetic'
  isBanned?: boolean
  bio?: string
  university?: string
  major?: string
  graduationYear?: string
}

/* ─── Dashboard Stats Types ─── */

export interface DashboardStats {
  streak: number
  totalXP: number
  quizzesCompleted: number
  focusHours: number
  weeklyStudyHours: number[]
  quizScores: number[]
  focusStreak: number
  studyHoursThisWeek: number[]
  continueLearning: Array<{ subject: string; topic: string; progress: number }>
  todaySchedule: Array<{ time: string; title: string; type: string }>
  cardsMastered: number
  cardsTotal: number
  studyHoursChange: number
  quizScoreChange: number
  subjectDistribution: Array<{ name: string; value: number }>
  focusTimeData: Array<{ day: string; hours: number }>
  heatmapData: Array<{ week: number; day: number; sessions: number }>
  achievements: Array<{ id: string; earned: boolean }>
}

export interface PlatformStats {
  totalStudents: number
  totalStudySessions: number
  totalFocusSessions: number
  totalQuizAttempts: number
  averageRating: number
  totalFlashcardsReviewed: number
}

/* ─── Calendar Types ─── */

export interface CalendarEvent {
  id: string
  title: string
  description?: string
  date: string // ISO date string YYYY-MM-DD
  startTime?: string // HH:mm
  endTime?: string // HH:mm
  type: 'study' | 'exam' | 'assignment' | 'event' | 'meeting' | 'reminder'
  color: string
  isCompleted: boolean
  subject?: string
}

/* ─── Files Types ─── */

export interface FileItem {
  id: string
  name: string
  type: 'folder' | 'pdf' | 'text' | 'image' | 'doc' | 'audio' | 'video' | 'other'
  size: number
  parentId: string | null
  createdAt: number
  updatedAt: number
  content?: string
  url?: string
  isStarred: boolean
  tags: string[]
}

/* ─── Collaboration Types ─── */

export interface CollaborationPost {
  id: string
  authorId: string
  authorName: string
  authorAvatar?: string
  content: string
  type: 'introduction' | 'study-request' | 'resource' | 'question' | 'achievement'
  tags: string[]
  likes: number
  comments: number
  createdAt: number
  isLiked: boolean
}

export interface ChatRoom {
  id: string
  name: string
  type: 'private' | 'group'
  participants: Array<{ id: string; name: string; avatar?: string }>
  lastMessage?: string
  lastMessageTime?: number
  unreadCount: number
}

export interface RoomMessage {
  id: string
  roomId: string
  senderId: string
  senderName: string
  senderAvatar?: string
  content: string
  timestamp: number
  type: 'text' | 'system' | 'file'
}

/* ─── Knowledge State Types ─── */

export interface KnowledgeConcept {
  id: string
  name: string
  subject: string
  state: 'unfamiliar' | 'learning' | 'familiar' | 'mastered'
  lastReviewed: number
  nextReview: number
  confidence: number
}

/* ─── SSA Studio Types ─── */

export interface AudioPrimer {
  id: string
  title: string
  subject: string
  sourceText: string
  audioUrl: string | null
  duration: number // seconds
  voice: string
  speed: number
  status: 'draft' | 'generating' | 'ready' | 'error'
  createdAt: number
  chapters: AudioChapter[]
}

export interface AudioChapter {
  id: string
  title: string
  text: string
  audioUrl: string | null
  duration: number
  order: number
}

/* ─── Writing Audit Types ─── */

export interface WritingAuditResult {
  id: string
  overallScore: number // 0-100
  logicalGaps: LogicalGap[]
  citationAnalysis: CitationAnalysis
  suggestions: WritingSuggestion[]
  structureAnalysis: StructureAnalysis
  analyzedAt: number
}

export interface LogicalGap {
  id: string
  type: 'missing-premise' | 'weak-inference' | 'unsupported-claim' | 'contradiction' | 'circular-reasoning'
  description: string
  location: string
  severity: 'critical' | 'major' | 'minor'
  suggestion: string
}

export interface CitationAnalysis {
  totalCitations: number
  strongCitations: number
  weakCitations: number
  missingCitations: number
  citationScore: number // 0-100
  details: CitationDetail[]
}

export interface CitationDetail {
  id: string
  claim: string
  hasCitation: boolean
  citationQuality: 'strong' | 'weak' | 'missing' | 'unnecessary'
  suggestion: string
}

export interface WritingSuggestion {
  id: string
  category: 'logic' | 'citation' | 'structure' | 'clarity' | 'evidence'
  priority: 'high' | 'medium' | 'low'
  title: string
  description: string
}

export interface StructureAnalysis {
  hasThesis: boolean
  thesisClarity: number // 0-100
  paragraphCount: number
  hasIntroduction: boolean
  hasConclusion: boolean
  transitionQuality: number // 0-100
  flowScore: number // 0-100
}

interface AppState {
  // Navigation
  currentView: AppView
  sidebarOpen: boolean
  sidebarCollapsed: boolean

  // Auth
  isAuthenticated: boolean
  user: UserProfile | null

  // AI Tutor
  chatMessages: ChatMessage[]
  chatMode: string
  isChatStreaming: boolean

  // Flashcards
  flashcards: FlashcardData[]
  currentFlashcardIndex: number

  // Notes
  notes: NoteData[]
  activeNoteId: string | null

  // Focus
  focusSessions: FocusSessionData[]
  isFocusActive: boolean
  focusTimeRemaining: number
  focusEnvironment: string
  focusMode: 'pomodoro' | 'short-break' | 'long-break'

  // Quizzes
  quizQuestions: QuizQuestion[]
  currentQuizIndex: number
  quizActive: boolean
  quizSubject: string

  // Analytics
  studyHoursThisWeek: number[]
  quizScores: number[]
  focusStreak: number
  totalXP: number

  // Dashboard Stats (real-time)
  dashboardStats: DashboardStats | null
  platformStats: PlatformStats | null
  isStatsLoading: boolean

  // Calendar
  calendarEvents: CalendarEvent[]
  selectedCalendarDate: string | null
  calendarView: 'month' | 'week'

  // Files
  files: FileItem[]
  currentFolderId: string | null
  selectedFileId: string | null

  // Collaboration
  collabPosts: CollaborationPost[]
  chatRooms: ChatRoom[]
  activeRoomId: string | null
  roomMessages: RoomMessage[]

  // Knowledge / Mastery
  knowledgeConcepts: KnowledgeConcept[]

  // SSA Studio
  audioPrimers: AudioPrimer[]
  activePrimerId: string | null
  isPrimerGenerating: boolean

  // Writing Audit
  writingAudits: WritingAuditResult[]
  activeAuditId: string | null
  isAuditRunning: boolean

  // Actions
  setCurrentView: (view: AppView) => void
  setSidebarOpen: (open: boolean) => void
  setSidebarCollapsed: (collapsed: boolean) => void
  login: (user: UserProfile) => void
  logout: () => void
  updateUser: (updates: Partial<UserProfile>) => void
  addChatMessage: (message: ChatMessage) => void
  setChatMessages: (messages: ChatMessage[]) => void
  setChatMode: (mode: string) => void
  setIsChatStreaming: (streaming: boolean) => void
  addFlashcard: (flashcard: FlashcardData) => void
  setFlashcards: (flashcards: FlashcardData[]) => void
  flipFlashcard: (id: string) => void
  setCurrentFlashcardIndex: (index: number) => void
  addNote: (note: NoteData) => void
  updateNote: (id: string, updates: Partial<NoteData>) => void
  deleteNote: (id: string) => void
  setActiveNoteId: (id: string | null) => void
  setNotes: (notes: NoteData[]) => void
  addFocusSession: (session: FocusSessionData) => void
  setIsFocusActive: (active: boolean) => void
  setFocusTimeRemaining: (time: number) => void
  setFocusEnvironment: (env: string) => void
  setFocusMode: (mode: 'pomodoro' | 'short-break' | 'long-break') => void
  setQuizQuestions: (questions: QuizQuestion[]) => void
  setCurrentQuizIndex: (index: number) => void
  setQuizActive: (active: boolean) => void
  setQuizSubject: (subject: string) => void
  answerQuizQuestion: (questionId: string, answerIndex: number) => void

  // Stats Actions
  fetchDashboardStats: (userId?: string) => Promise<void>
  fetchPlatformStats: () => Promise<void>
  fetchUserData: (userId: string) => Promise<void>

  // Calendar Actions
  addCalendarEvent: (event: CalendarEvent) => void
  updateCalendarEvent: (id: string, updates: Partial<CalendarEvent>) => void
  deleteCalendarEvent: (id: string) => void
  setSelectedCalendarDate: (date: string | null) => void
  setCalendarView: (view: 'month' | 'week') => void
  toggleCalendarEventComplete: (id: string) => void

  // Files Actions
  addFile: (file: FileItem) => void
  updateFile: (id: string, updates: Partial<FileItem>) => void
  deleteFile: (id: string) => void
  setCurrentFolderId: (id: string | null) => void
  setSelectedFileId: (id: string | null) => void
  toggleFileStar: (id: string) => void

  // Collaboration Actions
  addCollabPost: (post: CollaborationPost) => void
  togglePostLike: (id: string) => void
  addChatRoom: (room: ChatRoom) => void
  setActiveRoomId: (id: string | null) => void
  addRoomMessage: (message: RoomMessage) => void
  setRoomMessages: (messages: RoomMessage[]) => void

  // Knowledge Actions
  addKnowledgeConcept: (concept: KnowledgeConcept) => void
  updateKnowledgeConcept: (id: string, updates: Partial<KnowledgeConcept>) => void
  setKnowledgeConcepts: (concepts: KnowledgeConcept[]) => void

  // SSA Studio Actions
  addAudioPrimer: (primer: AudioPrimer) => void
  updateAudioPrimer: (id: string, updates: Partial<AudioPrimer>) => void
  deleteAudioPrimer: (id: string) => void
  setActivePrimerId: (id: string | null) => void
  setIsPrimerGenerating: (generating: boolean) => void

  // Writing Audit Actions
  addWritingAudit: (audit: WritingAuditResult) => void
  setActiveAuditId: (id: string | null) => void
  setIsAuditRunning: (running: boolean) => void

  // Teacher Portal Actions
  teacherClassrooms: TeacherClassroom[]
  setTeacherClassrooms: (classrooms: TeacherClassroom[]) => void
  fetchTeacherClassrooms: (userId: string) => Promise<void>
}

/* ─── Teacher Portal Types ─── */

export interface TeacherClassroom {
  id: string
  name: string
  description?: string
  subject?: string
  inviteCode: string
  memberCount: number
  assignmentCount: number
  isArchived: boolean
  createdAt: string
}

export const useAppStore = create<AppState>((set) => ({
  // Navigation
  currentView: 'landing',
  sidebarOpen: false,
  sidebarCollapsed: false,

  // Auth
  isAuthenticated: false,
  user: null,

  // AI Tutor
  chatMessages: [],
  chatMode: 'tutor',
  isChatStreaming: false,

  // Flashcards
  flashcards: [],
  currentFlashcardIndex: 0,

  // Notes
  notes: [],
  activeNoteId: null,

  // Focus
  focusSessions: [],
  isFocusActive: false,
  focusTimeRemaining: 25 * 60,
  focusEnvironment: 'none',
  focusMode: 'pomodoro',

  // Quizzes
  quizQuestions: [],
  currentQuizIndex: 0,
  quizActive: false,
  quizSubject: '',

  // Analytics (empty defaults — sourced from dashboardStats via fetchDashboardStats)
  studyHoursThisWeek: [],
  quizScores: [],
  focusStreak: 0,
  totalXP: 0,

  // Dashboard Stats (real-time)
  dashboardStats: null,
  platformStats: null,
  isStatsLoading: false,

  // Calendar - populated from DB after login
  calendarEvents: [],
  selectedCalendarDate: null,
  calendarView: 'month',

  // Files - populated from DB after login
  files: [],
  currentFolderId: null,
  selectedFileId: null,

  // Collaboration - populated from DB after login
  collabPosts: [],
  chatRooms: [],
  activeRoomId: null,
  roomMessages: [],

  // Knowledge / Mastery - populated from DB after login
  knowledgeConcepts: [],

  // Actions
  setCurrentView: (view) => set({ currentView: view }),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),

  login: (user) => set({ isAuthenticated: true, user, currentView: 'dashboard' }),
  logout: () => set({
    isAuthenticated: false,
    user: null,
    currentView: 'landing',
    // Clear all user-specific data on logout
    chatMessages: [],
    flashcards: [],
    currentFlashcardIndex: 0,
    notes: [],
    activeNoteId: null,
    focusSessions: [],
    isFocusActive: false,
    focusTimeRemaining: 25 * 60,
    focusEnvironment: 'none',
    focusMode: 'pomodoro',
    quizQuestions: [],
    currentQuizIndex: 0,
    quizActive: false,
    quizSubject: '',
    studyHoursThisWeek: [],
    quizScores: [],
    focusStreak: 0,
    totalXP: 0,
    dashboardStats: null,
    platformStats: null,
    isStatsLoading: false,
    calendarEvents: [],
    files: [],
    collabPosts: [],
    chatRooms: [],
    activeRoomId: null,
    roomMessages: [],
    knowledgeConcepts: [],
    audioPrimers: [],
    activePrimerId: null,
    isPrimerGenerating: false,
    writingAudits: [],
    activeAuditId: null,
    isAuditRunning: false,
  }),
  updateUser: (updates) => set((state) => ({
    user: state.user ? { ...state.user, ...updates } : null,
  })),

  addChatMessage: (message) =>
    set((state) => ({ chatMessages: [...state.chatMessages, message] })),
  setChatMessages: (messages) => set({ chatMessages: messages }),
  setChatMode: (mode) => set({ chatMode: mode }),
  setIsChatStreaming: (streaming) => set({ isChatStreaming: streaming }),

  addFlashcard: (flashcard) =>
    set((state) => ({ flashcards: [...state.flashcards, flashcard] })),
  setFlashcards: (flashcards) => set({ flashcards }),
  flipFlashcard: (id) =>
    set((state) => ({
      flashcards: state.flashcards.map((fc) =>
        fc.id === id ? { ...fc, isFlipped: !fc.isFlipped } : fc
      ),
    })),
  setCurrentFlashcardIndex: (index) => set({ currentFlashcardIndex: index }),

  addNote: (note) =>
    set((state) => ({ notes: [note, ...state.notes] })),
  updateNote: (id, updates) =>
    set((state) => ({
      notes: state.notes.map((n) => (n.id === id ? { ...n, ...updates } : n)),
    })),
  deleteNote: (id) =>
    set((state) => ({
      notes: state.notes.filter((n) => n.id !== id),
      activeNoteId: state.activeNoteId === id ? null : state.activeNoteId,
    })),
  setActiveNoteId: (id) => set({ activeNoteId: id }),
  setNotes: (notes) => set({ notes }),

  addFocusSession: (session) =>
    set((state) => ({ focusSessions: [...state.focusSessions, session] })),
  setIsFocusActive: (active) => set({ isFocusActive: active }),
  setFocusTimeRemaining: (time) => set({ focusTimeRemaining: time }),
  setFocusEnvironment: (env) => set({ focusEnvironment: env }),
  setFocusMode: (mode) => set({ focusMode: mode }),

  setQuizQuestions: (questions) => set({ quizQuestions: questions }),
  setCurrentQuizIndex: (index) => set({ currentQuizIndex: index }),
  setQuizActive: (active) => set({ quizActive: active }),
  setQuizSubject: (subject) => set({ quizSubject: subject }),
  answerQuizQuestion: (questionId, answerIndex) =>
    set((state) => ({
      quizQuestions: state.quizQuestions.map((q) =>
        q.id === questionId ? { ...q, userAnswer: answerIndex } : q
      ),
    })),

  // Stats Actions
  fetchDashboardStats: async (userId?: string) => {
    set({ isStatsLoading: true })
    try {
      const url = userId
        ? `/api/stats/dashboard?userId=${encodeURIComponent(userId)}`
        : '/api/stats/dashboard'
      const res = await fetch(url)
      if (!res.ok) throw new Error(`Failed to fetch dashboard stats: ${res.status}`)
      const data: DashboardStats = await res.json()
      set({
        dashboardStats: data,
        // Backward compatibility: update legacy analytics fields
        studyHoursThisWeek: data.studyHoursThisWeek ?? [],
        quizScores: data.quizScores ?? [],
        focusStreak: data.focusStreak ?? 0,
        totalXP: data.totalXP ?? 0,
        isStatsLoading: false,
      })
    } catch (error) {
      console.error('Failed to fetch dashboard stats:', error)
      set({ isStatsLoading: false })
    }
  },

  fetchPlatformStats: async () => {
    try {
      const res = await fetch('/api/stats/platform')
      if (!res.ok) throw new Error(`Failed to fetch platform stats: ${res.status}`)
      const data: PlatformStats = await res.json()
      set({ platformStats: data })
    } catch (error) {
      console.error('Failed to fetch platform stats:', error)
    }
  },

  fetchUserData: async (userId: string) => {
    try {
      const res = await fetch(`/api/user/data?userId=${encodeURIComponent(userId)}`)
      if (!res.ok) throw new Error(`Failed to fetch user data: ${res.status}`)
      const data = await res.json()
      set({
        calendarEvents: data.calendarEvents ?? [],
        files: data.files ?? [],
        knowledgeConcepts: data.knowledgeConcepts ?? [],
        collabPosts: data.collabPosts ?? [],
        chatRooms: data.chatRooms ?? [],
      })
    } catch (error) {
      console.error('Failed to fetch user data:', error)
    }
  },

  // Calendar Actions
  addCalendarEvent: (event) =>
    set((state) => ({ calendarEvents: [...state.calendarEvents, event] })),
  updateCalendarEvent: (id, updates) =>
    set((state) => ({
      calendarEvents: state.calendarEvents.map((e) =>
        e.id === id ? { ...e, ...updates } : e
      ),
    })),
  deleteCalendarEvent: (id) =>
    set((state) => ({
      calendarEvents: state.calendarEvents.filter((e) => e.id !== id),
    })),
  setSelectedCalendarDate: (date) => set({ selectedCalendarDate: date }),
  setCalendarView: (view) => set({ calendarView: view }),
  toggleCalendarEventComplete: (id) =>
    set((state) => ({
      calendarEvents: state.calendarEvents.map((e) =>
        e.id === id ? { ...e, isCompleted: !e.isCompleted } : e
      ),
    })),

  // Files Actions
  addFile: (file) =>
    set((state) => ({ files: [...state.files, file] })),
  updateFile: (id, updates) =>
    set((state) => ({
      files: state.files.map((f) => f.id === id ? { ...f, ...updates } : f),
    })),
  deleteFile: (id) =>
    set((state) => ({
      files: state.files.filter((f) => f.id !== id),
      selectedFileId: state.selectedFileId === id ? null : state.selectedFileId,
    })),
  setCurrentFolderId: (id) => set({ currentFolderId: id }),
  setSelectedFileId: (id) => set({ selectedFileId: id }),
  toggleFileStar: (id) =>
    set((state) => ({
      files: state.files.map((f) =>
        f.id === id ? { ...f, isStarred: !f.isStarred } : f
      ),
    })),

  // Collaboration Actions
  addCollabPost: (post) =>
    set((state) => ({ collabPosts: [post, ...state.collabPosts] })),
  togglePostLike: (id) =>
    set((state) => ({
      collabPosts: state.collabPosts.map((p) =>
        p.id === id ? { ...p, isLiked: !p.isLiked, likes: p.isLiked ? p.likes - 1 : p.likes + 1 } : p
      ),
    })),
  addChatRoom: (room) =>
    set((state) => ({ chatRooms: [room, ...state.chatRooms] })),
  setActiveRoomId: (id) => set({ activeRoomId: id }),
  addRoomMessage: (message) =>
    set((state) => ({ roomMessages: [...state.roomMessages, message] })),
  setRoomMessages: (messages) => set({ roomMessages: messages }),

  // Knowledge Actions
  addKnowledgeConcept: (concept) =>
    set((state) => ({ knowledgeConcepts: [...state.knowledgeConcepts, concept] })),
  updateKnowledgeConcept: (id, updates) =>
    set((state) => ({
      knowledgeConcepts: state.knowledgeConcepts.map((kc) =>
        kc.id === id ? { ...kc, ...updates } : kc
      ),
    })),
  setKnowledgeConcepts: (concepts) => set({ knowledgeConcepts: concepts }),

  // SSA Studio
  audioPrimers: [],
  activePrimerId: null,
  isPrimerGenerating: false,

  // Writing Audit
  writingAudits: [],
  activeAuditId: null,
  isAuditRunning: false,

  // Teacher Portal
  teacherClassrooms: [],
  setTeacherClassrooms: (classrooms) => set({ teacherClassrooms: classrooms }),
  fetchTeacherClassrooms: async (userId: string) => {
    try {
      const res = await fetch(`/api/teacher/classrooms?userId=${encodeURIComponent(userId)}`)
      if (!res.ok) throw new Error('Failed to fetch classrooms')
      const data = await res.json()
      set({ teacherClassrooms: data.classrooms ?? [] })
    } catch (error) {
      console.error('Failed to fetch teacher classrooms:', error)
    }
  },

  // SSA Studio Actions
  addAudioPrimer: (primer) =>
    set((state) => ({ audioPrimers: [primer, ...state.audioPrimers] })),
  updateAudioPrimer: (id, updates) =>
    set((state) => ({
      audioPrimers: state.audioPrimers.map((p) =>
        p.id === id ? { ...p, ...updates } : p
      ),
    })),
  deleteAudioPrimer: (id) =>
    set((state) => ({
      audioPrimers: state.audioPrimers.filter((p) => p.id !== id),
      activePrimerId: state.activePrimerId === id ? null : state.activePrimerId,
    })),
  setActivePrimerId: (id) => set({ activePrimerId: id }),
  setIsPrimerGenerating: (generating) => set({ isPrimerGenerating: generating }),

  // Writing Audit Actions
  addWritingAudit: (audit) =>
    set((state) => ({ writingAudits: [audit, ...state.writingAudits] })),
  setActiveAuditId: (id) => set({ activeAuditId: id }),
  setIsAuditRunning: (running) => set({ isAuditRunning: running }),
}))
