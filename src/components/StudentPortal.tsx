import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase, getStudentProfileEditPermission, calculateProfileCompleteness } from '@/lib/supabase';
import type { Student, StudyDay, Lesson, QuizResult } from '@/lib/supabase';
import type { SessionUser } from '@/App';
import { formatDayDate } from '@/lib/time';
import { QuizModal } from '@/components/QuizModal';
import { StudentProfileModal } from '@/components/StudentProfileModal';
import { StudentAvatar } from '@/components/StudentAvatar';
import { updateAppFavicon } from '@/lib/favicon';
import { getInitialTheme, applyTheme, ThemeMode } from '@/lib/theme';
import {
  GraduationCap,
  LogOut,
  FileText,
  CheckCircle2,
  Loader2,
  BookOpen,
  Pencil,
  Search,
  Sun,
  Moon,
  X,
  UserCheck,
  ArrowRight,
} from 'lucide-react';

interface Props {
  user: Extract<SessionUser, { role: 'student' }>;
  onLogout: () => void;
}

interface DayWithLessons extends StudyDay {
  lessons: Lesson[];
}

export function StudentPortal({ user, onLogout }: Props) {
  const [student, setStudent] = useState<Student | null>(null);
  const [days, setDays] = useState<DayWithLessons[]>([]);
  const [results, setResults] = useState<Map<string, QuizResult>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [quizState, setQuizState] = useState<{ lessonId: string; subject: string } | null>(null);
  const [quizResultView, setQuizResultView] = useState<QuizResult | null>(null);

  // Search popup modal state
  const [searchModalOpen, setSearchModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Close search modal on Escape key
  useEffect(() => {
    if (!searchModalOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSearchModalOpen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [searchModalOpen]);

  // Eye-care / Reading theme state ('light' | 'dark')
  const [theme, setTheme] = useState<ThemeMode>(getInitialTheme);

  useEffect(() => {
    applyTheme(theme);
    const handleThemeChange = (e: Event) => {
      const custom = e as CustomEvent<ThemeMode>;
      if (custom.detail && (custom.detail === 'light' || custom.detail === 'dark')) {
        setTheme(custom.detail);
      }
    };
    window.addEventListener('studywise_theme_change', handleThemeChange);
    return () => {
      window.removeEventListener('studywise_theme_change', handleThemeChange);
    };
  }, [theme]);

  const toggleTheme = () => {
    const nextTheme: ThemeMode = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    applyTheme(nextTheme);
  };

  // Profile modal and permission
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [canEditProfile, setCanEditProfile] = useState(() =>
    getStudentProfileEditPermission(user.studentId)
  );

  // Profile update welcome prompt modal for student
  const [showUpdatePrompt, setShowUpdatePrompt] = useState(false);

  useEffect(() => {
    const handlePermissionChange = () => {
      const allowed = getStudentProfileEditPermission(user.studentId, student);
      setCanEditProfile(allowed);
      if (student) {
        const comp = calculateProfileCompleteness(student);
        if (allowed && !comp.isComplete) {
          setShowUpdatePrompt(true);
        } else {
          setShowUpdatePrompt(false);
        }
      }
    };
    window.addEventListener('studywise_permission_changed', handlePermissionChange);
    return () => {
      window.removeEventListener('studywise_permission_changed', handlePermissionChange);
    };
  }, [user.studentId, student]);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [studRes, daysRes, resultsRes] = await Promise.all([
        supabase.from('students').select('*').eq('id', user.studentId).maybeSingle(),
        supabase.from('study_days').select('*').eq('student_id', user.studentId).order('day_date', { ascending: false }),
        supabase.from('quiz_results').select('*').eq('student_id', user.studentId),
      ]);

      if (studRes.error) throw studRes.error;
      if (daysRes.error) throw daysRes.error;
      if (resultsRes.error) throw resultsRes.error;

      const stud = studRes.data as Student | null;
      setStudent(stud);

      if (stud) {
        updateAppFavicon(stud.gender);
        const allowed = getStudentProfileEditPermission(user.studentId, stud);
        setCanEditProfile(allowed);

        // Prompt whenever student visits the website if profile is not 100% complete and editing is enabled
        const comp = calculateProfileCompleteness(stud);
        if (allowed && !comp.isComplete) {
          setShowUpdatePrompt(true);
        } else {
          setShowUpdatePrompt(false);
        }
      }

      const studyDays = (daysRes.data || []) as StudyDay[];

      const lessonsByDay = await Promise.all(
        studyDays.map(async (d) => {
          const { data: lessons, error: lErr } = await supabase
            .from('lessons')
            .select('*')
            .eq('study_day_id', d.id)
            .order('created_at', { ascending: true });
          if (lErr) throw lErr;
          return { ...d, lessons: (lessons || []) as Lesson[] };
        })
      );

      lessonsByDay.sort((a, b) => {
        const dateA = new Date(a.day_date).getTime();
        const dateB = new Date(b.day_date).getTime();
        return dateB - dateA;
      });

      setDays(lessonsByDay);

      const resMap = new Map<string, QuizResult>();
      for (const r of (resultsRes.data || []) as QuizResult[]) {
        resMap.set(r.lesson_id, r);
      }
      setResults(resMap);
    } catch {
      setError('Unable to load class activity.');
    } finally {
      setLoading(false);
    }
  }, [user.studentId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSkipPrompt = () => {
    setShowUpdatePrompt(false);
  };

  const handleAcceptPrompt = () => {
    setShowUpdatePrompt(false);
    setShowProfileModal(true);
  };

  const handleQuizComplete = () => {
    setQuizState(null);
    setQuizResultView(null);
    loadData();
  };

  const handleViewResult = (result: QuizResult, subject: string) => {
    setQuizResultView(result);
    setQuizState({ lessonId: result.lesson_id, subject });
  };

  const handleStudentUpdated = (updated: Student) => {
    setStudent(updated);
    user.imageUrl = updated.image_url || '';
    user.name = updated.name;
    user.className = updated.class_name;
    user.subjects = updated.subjects;
    user.gender = updated.gender;
    updateAppFavicon(updated.gender);
    const comp = calculateProfileCompleteness(updated);
    if (comp.isComplete) {
      setShowUpdatePrompt(false);
    }
  };

  const formatDate = (dateStr: string) => formatDayDate(dateStr);

  // List of all lessons matching search query for mobile popup
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase().trim();
    const matches: { day: StudyDay; lesson: Lesson }[] = [];
    for (const d of days) {
      for (const l of d.lessons) {
        if (
          l.subject.toLowerCase().includes(q) ||
          (l.short_note && l.short_note.toLowerCase().includes(q)) ||
          d.day_label.toLowerCase().includes(q) ||
          d.day_date.toLowerCase().includes(q)
        ) {
          matches.push({ day: d, lesson: l });
        }
      }
    }
    return matches;
  }, [days, searchQuery]);

  // Extract unique subjects for quick pills in search popup
  const uniqueSubjects = useMemo(() => {
    const set = new Set<string>();
    for (const d of days) {
      for (const l of d.lessons) {
        if (l.subject) set.add(l.subject.trim());
      }
    }
    return Array.from(set);
  }, [days]);

  return (
    <div className="min-h-screen bg-[#fbf8ee] dark:bg-[#1a1715] text-[#2c2825] dark:text-[#f2ece4] font-sans transition-colors duration-200">
      {/* Header with Reading/Eye-Care Palette & Glassmorphic Navigation Icons */}
      <header className="bg-[#fffefb]/90 dark:bg-[#23201d]/90 backdrop-blur-md border-b border-[#ece4d6] dark:border-[#38322c] sticky top-0 z-20 shadow-2xs">
        <div className="max-w-3xl mx-auto px-4 py-2.5 sm:py-3 flex items-center justify-between gap-3">
          {/* Logo / Brand - Iconic Blue Accent */}
          <div className="flex items-center gap-2.5 sm:gap-3 flex-shrink-0">
            <div className="w-9 h-9 sm:w-10 sm:h-10 bg-gradient-to-br from-blue-600 via-sky-600 to-blue-700 rounded-xl flex items-center justify-center shadow-md text-white">
              <GraduationCap className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#2c2825] dark:text-[#f5f0e8] leading-tight tracking-tight">
                StudyWise
              </h2>
              <p className="text-[11px] sm:text-xs text-blue-700 dark:text-sky-300 font-semibold tracking-wide">
                Student Portal
              </p>
            </div>
          </div>

          {/* Navigation Icon Buttons: Search, Theme, Edit Profile, Logout — Unified Identical Design */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* 1. Search Button */}
            <button
              onClick={() => setSearchModalOpen(true)}
              title="Search Lessons"
              aria-label="Search Lessons"
              className="w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center rounded-xl bg-white/80 dark:bg-stone-800/80 border border-stone-200/90 dark:border-stone-700/80 shadow-2xs hover:bg-stone-100 dark:hover:bg-stone-700/80 hover:border-stone-300 dark:hover:border-stone-600 active:scale-95 transition-all text-stone-700 dark:text-stone-200 cursor-pointer"
            >
              <Search className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
            </button>

            {/* 2. Light / Dark Theme Button */}
            <button
              onClick={toggleTheme}
              title={theme === 'dark' ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
              aria-label={theme === 'dark' ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
              className="w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center rounded-xl bg-white/80 dark:bg-stone-800/80 border border-stone-200/90 dark:border-stone-700/80 shadow-2xs hover:bg-stone-100 dark:hover:bg-stone-700/80 hover:border-stone-300 dark:hover:border-stone-600 active:scale-95 transition-all text-stone-700 dark:text-stone-200 cursor-pointer"
            >
              {theme === 'dark' ? (
                <Sun className="w-4 h-4 sm:w-4.5 sm:h-4.5 text-amber-500" />
              ) : (
                <Moon className="w-4 h-4 sm:w-4.5 sm:h-4.5 text-blue-600" />
              )}
            </button>

            {/* 3. Edit Profile Button */}
            <button
              onClick={() => setShowProfileModal(true)}
              title="Edit Profile"
              aria-label="Edit Profile"
              className="w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center rounded-xl bg-white/80 dark:bg-stone-800/80 border border-stone-200/90 dark:border-stone-700/80 shadow-2xs hover:bg-stone-100 dark:hover:bg-stone-700/80 hover:border-stone-300 dark:hover:border-stone-600 active:scale-95 transition-all text-stone-700 dark:text-stone-200 cursor-pointer"
            >
              <Pencil className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
            </button>

            {/* 4. Logout Button */}
            <button
              onClick={onLogout}
              title="Logout"
              aria-label="Logout"
              className="w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center rounded-xl bg-white/80 dark:bg-stone-800/80 border border-stone-200/90 dark:border-stone-700/80 shadow-2xs hover:bg-stone-100 dark:hover:bg-stone-700/80 hover:border-stone-300 dark:hover:border-stone-600 active:scale-95 transition-all text-stone-700 dark:text-stone-200 cursor-pointer"
            >
              <LogOut className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 py-5 sm:py-6 space-y-4 sm:space-y-5">
        {/* Profile Card: Warm Reading Surface, Left Avatar with 1:1 Photo Upload Badge, Beside it Name, Class, Subject */}
        <div className="bg-[#fffefb] dark:bg-[#23201d] rounded-2xl border border-[#ece4d6] dark:border-[#38322c] shadow-xs p-3.5 sm:p-5 transition-shadow">
          <div className="flex items-center gap-3.5 sm:gap-5">
            {/* Student Avatar (Clickable to edit profile) */}
            <div
              className="cursor-pointer group flex-shrink-0"
              onClick={() => setShowProfileModal(true)}
              title="Click to edit profile"
            >
              <StudentAvatar
                imageUrl={student?.image_url !== undefined ? student?.image_url : (user.imageUrl || null)}
                gender={student?.gender || user.gender}
                name={student?.name || user.name}
                size="lg"
                className="w-16 h-16 sm:w-20 sm:h-20 shadow-xs ring-2 ring-blue-300 dark:ring-blue-800 group-hover:ring-blue-500 transition-all rounded-2xl"
              />
            </div>

            {/* Name, Class, Subject - ALWAYS Beside Each Other on Same Line, Harmonized Typography */}
            <div className="flex-1 min-w-0 space-y-1 sm:space-y-1.5">
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="text-xs sm:text-sm font-medium text-stone-500 dark:text-stone-400 flex-shrink-0">
                  Name:
                </span>
                <span className="text-sm sm:text-base font-bold text-[#2c2825] dark:text-[#f5f0e8] truncate">
                  {student?.name || user.name}
                </span>
              </div>
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="text-xs sm:text-sm font-medium text-stone-500 dark:text-stone-400 flex-shrink-0">
                  Class:
                </span>
                <span className="text-xs sm:text-sm font-semibold text-stone-700 dark:text-stone-200 truncate">
                  {student?.class_name || user.className}
                </span>
              </div>
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="text-xs sm:text-sm font-medium text-stone-500 dark:text-stone-400 flex-shrink-0">
                  Subject:
                </span>
                <span className="text-xs sm:text-sm font-semibold text-blue-700 dark:text-sky-300 truncate">
                  {student?.subjects || user.subjects}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Lessons Feed */}
        <div className="bg-[#fffefb] dark:bg-[#23201d] rounded-2xl border border-[#ece4d6] dark:border-[#38322c] shadow-xs overflow-hidden">
          <div className="px-5 py-3.5 sm:py-4 border-b border-[#ece4d6] dark:border-[#38322c] bg-[#faf6eb]/70 dark:bg-[#201d1a]/80 flex items-center justify-between">
            <div>
              <h3 className="text-sm sm:text-base font-bold text-[#2c2825] dark:text-[#f5f0e8]">
                Class &amp; Lessons
              </h3>
              <p className="text-[11px] sm:text-xs text-stone-500 dark:text-stone-400 mt-0.5">
                Study records, reading notes and online quizzes
              </p>
            </div>
          </div>

          <div className="p-3.5 sm:p-4 space-y-3.5 sm:space-y-4">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
              </div>
            ) : error ? (
              <div className="text-center py-12 text-sm text-rose-600 dark:text-rose-400">{error}</div>
            ) : days.length === 0 ? (
              <div className="text-center py-12 text-sm text-stone-500 dark:text-stone-400">
                No lessons logged yet.
              </div>
            ) : (
              days.map((day, idx) => (
                <div
                  key={`${day.id}-${idx}`}
                  id={`day-${day.id}`}
                  className="border border-[#ece4d6] dark:border-[#38322c] rounded-xl overflow-hidden bg-white dark:bg-[#1f1c19] shadow-2xs"
                >
                  {/* Day Header */}
                  <div className="flex items-center justify-between px-3.5 sm:px-4 py-2.5 bg-[#fbf8ee] dark:bg-[#282420] border-b border-[#ece4d6] dark:border-[#38322c]">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-white bg-blue-600 px-2.5 py-0.5 rounded shadow-2xs">
                        {day.day_label}
                      </span>
                      <span className="text-xs text-stone-700 dark:text-stone-300 font-semibold">
                        {formatDate(day.day_date)}
                      </span>
                    </div>
                    <span className="text-[11px] text-stone-400 dark:text-stone-500 font-medium">Activity</span>
                  </div>

                  {/* Lessons */}
                  <div className="divide-y divide-[#f2ebd9] dark:divide-[#322c26]">
                    {day.lessons.length === 0 ? (
                      <div className="px-4 py-3 text-xs text-stone-400 dark:text-stone-500">No topics recorded.</div>
                    ) : (
                      day.lessons.map((lesson, lIdx) => {
                        const completed = results.get(lesson.id);
                        return (
                          <div key={`${lesson.id}-${lIdx}`} className="px-3.5 sm:px-4 py-3.5 space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="inline-block text-xs font-bold text-blue-800 dark:text-blue-200 bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-900/60 px-2.5 py-0.5 rounded">
                                {lesson.subject}
                              </span>
                            </div>
                            <div className="bg-[#faf6eb]/80 dark:bg-[#25211e] border border-[#ebe3d3] dark:border-[#38322c] rounded-lg px-3.5 py-2.5">
                              <div className="text-[11px] font-bold text-stone-600 dark:text-stone-400">
                                Topics &amp; Notes:
                              </div>
                              <div className="text-xs sm:text-sm text-stone-800 dark:text-stone-200 mt-0.5 whitespace-pre-line leading-relaxed">
                                {lesson.short_note || 'Class notes recorded.'}
                              </div>
                            </div>
                            <div className="flex flex-wrap items-center gap-2 pt-0.5">
                              {lesson.pdf_url && (
                                <a
                                  href={lesson.pdf_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-800 dark:text-blue-200 bg-blue-50 hover:bg-blue-100 dark:bg-stone-800 dark:hover:bg-stone-700 border border-blue-200 dark:border-stone-700 px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
                                >
                                  <FileText className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                                  View PDF
                                </a>
                              )}
                              {lesson.test_enabled ? (
                                completed ? (
                                  <button
                                    onClick={() => handleViewResult(completed, lesson.subject)}
                                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 border border-emerald-300 dark:border-emerald-800 px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
                                  >
                                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                                    <span>Score: {completed.percentage}%</span>
                                  </button>
                                ) : (
                                  <button
                                    onClick={() => setQuizState({ lessonId: lesson.id, subject: lesson.subject })}
                                    className="inline-flex items-center gap-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 active:scale-95 px-3.5 py-1.5 rounded-lg transition-all shadow-xs cursor-pointer"
                                  >
                                    <BookOpen className="w-3.5 h-3.5" />
                                    Take Quiz
                                  </button>
                                )
                              ) : (
                                <span className="text-[11px] text-stone-400 dark:text-stone-500 italic">
                                  (Quiz not required)
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Search Popup Dialog positioned at the top of the display */}
      {searchModalOpen && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setSearchModalOpen(false);
          }}
          className="fixed inset-0 z-50 bg-stone-900/60 dark:bg-black/80 backdrop-blur-xs flex items-start justify-center p-2 sm:p-4 pt-2 sm:pt-6 overflow-hidden animate-in fade-in duration-150"
        >
          <div className="bg-[#fffefb] dark:bg-[#23201d] rounded-2xl border border-[#ece4d6] dark:border-[#38322c] shadow-2xl w-full max-w-lg max-h-[80vh] sm:max-h-[85vh] flex flex-col overflow-hidden animate-in slide-in-from-top-4 duration-200 mt-1 sm:mt-2">

            {/* Search Header */}
            <div className="px-4 py-3 border-b border-[#ece4d6] dark:border-[#38322c] flex items-center gap-2.5">
              <Search className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0" />
              <input
                type="text"
                autoFocus
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search subject, note or day..."
                className="w-full text-sm sm:text-base bg-transparent text-[#2c2825] dark:text-[#f5f0e8] placeholder-stone-400 focus:outline-none"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="p-1 text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 cursor-pointer"
                  title="Clear search"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
              <button
                type="button"
                onClick={() => setSearchModalOpen(false)}
                className="px-2.5 py-1 text-xs font-semibold bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 rounded-lg hover:bg-stone-200 dark:hover:bg-stone-700 cursor-pointer"
              >
                Done
              </button>
            </div>

            {/* Quick Subject Pills */}
            {uniqueSubjects.length > 0 && (
              <div className="px-4 py-2.5 bg-[#fbf8ee] dark:bg-[#1a1715] border-b border-[#ece4d6] dark:border-[#38322c] flex items-center gap-1.5 overflow-x-auto">
                <span className="text-[11px] font-bold text-stone-400 dark:text-stone-500 whitespace-nowrap">
                  Subjects:
                </span>
                {uniqueSubjects.map((sub) => (
                  <button
                    key={sub}
                    type="button"
                    onClick={() => setSearchQuery(sub)}
                    className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200/80 dark:border-blue-900 hover:bg-blue-100 dark:hover:bg-blue-900/80 cursor-pointer whitespace-nowrap"
                  >
                    {sub}
                  </button>
                ))}
              </div>
            )}

            {/* Search Results List */}
            <div className="p-4 flex-1 overflow-y-auto space-y-3">
              {searchQuery.trim() === '' ? (
                <div className="text-center py-8 text-xs text-stone-400 dark:text-stone-500">
                  Type any keyword or choose a subject pill above to view lessons.
                </div>
              ) : searchResults.length === 0 ? (
                <div className="text-center py-8 text-xs text-stone-400 dark:text-stone-500">
                  No lesson records found for &ldquo;{searchQuery}&rdquo;.
                </div>
              ) : (
                searchResults.map(({ day, lesson }, sIdx) => (
                  <div
                    key={`${lesson.id}-${sIdx}`}
                    onClick={() => {
                      setSearchModalOpen(false);
                      const el = document.getElementById(`day-${day.id}`);
                      if (el) el.scrollIntoView({ behavior: 'smooth' });
                    }}
                    className="p-3 rounded-xl border border-[#ece4d6] dark:border-[#38322c] bg-white dark:bg-[#1e1b18] hover:border-blue-400 transition-colors cursor-pointer group"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold text-blue-800 dark:text-blue-200 bg-blue-50 dark:bg-stone-800 px-2 py-0.5 rounded">
                        {lesson.subject}
                      </span>
                      <span className="text-[11px] text-stone-400">
                        {day.day_label} &middot; {formatDate(day.day_date)}
                      </span>
                    </div>
                    <p className="text-xs text-stone-700 dark:text-stone-300 mt-1 line-clamp-2">
                      {lesson.short_note || 'Class notes recorded.'}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Profile Incomplete & Edit Enabled Prompt Modal */}
      {showUpdatePrompt && student && (
        <div className="fixed inset-0 z-50 bg-stone-900/60 dark:bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in zoom-in-95 duration-150">
          <div className="bg-[#fffefb] dark:bg-[#23201d] rounded-2xl border border-[#ece4d6] dark:border-[#38322c] shadow-2xl w-full max-w-sm p-5 sm:p-6 text-center space-y-4">
            <div className="w-14 h-14 bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-sky-300 rounded-2xl flex items-center justify-center mx-auto shadow-xs border border-blue-200 dark:border-blue-900">
              <UserCheck className="w-7 h-7" />
            </div>

            <div>
              <h3 className="text-base sm:text-lg font-bold text-[#2c2825] dark:text-[#f2ece4]">
                Update Profile Information
              </h3>
              <p className="text-xs text-stone-600 dark:text-stone-300 mt-2 leading-relaxed">
                Profile editing has been enabled for your account. Your profile is not yet 100% complete ({calculateProfileCompleteness(student).percent}% completed). Please update your information.
              </p>

              {/* Progress Bar */}
              <div className="mt-3.5 bg-stone-200 dark:bg-stone-800 rounded-full h-2 overflow-hidden border border-stone-200 dark:border-stone-700">
                <div
                  className="bg-gradient-to-r from-blue-600 to-sky-500 h-full rounded-full transition-all duration-300"
                  style={{ width: `${calculateProfileCompleteness(student).percent}%` }}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2.5 pt-1">
              <button
                type="button"
                onClick={handleSkipPrompt}
                className="px-4 py-2.5 text-xs font-bold text-stone-600 dark:text-stone-300 bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 rounded-xl transition-colors cursor-pointer"
              >
                Skip
              </button>
              <button
                type="button"
                onClick={handleAcceptPrompt}
                className="px-4 py-2.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 active:scale-95 rounded-xl transition-all shadow-md flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <span>Update Now</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Quiz Modal */}
      {quizState && (
        <QuizModal
          lessonId={quizState.lessonId}
          subject={quizState.subject}
          studentId={user.studentId}
          existingResult={quizResultView}
          onClose={() => {
            setQuizState(null);
            setQuizResultView(null);
          }}
          onComplete={handleQuizComplete}
        />
      )}



      {/* Direct Student Profile Edit Modal */}
      {showProfileModal && (
        <StudentProfileModal
          student={
            student || {
              id: user.studentId,
              name: user.name,
              class_name: user.className,
              subjects: user.subjects,
              image_url: user.imageUrl || null,
              pin: '',
              created_at: '',
              gender: user.gender || 'Female',
              edit_allowed: canEditProfile,
            }
          }
          canEdit={canEditProfile}
          onClose={() => setShowProfileModal(false)}
          onUpdated={handleStudentUpdated}
        />
      )}

      <footer className="text-center text-xs text-stone-400 dark:text-stone-500 py-6 border-t border-[#ece4d6] dark:border-[#38322c] mt-8">
        Developed by{' '}
        <a
          href="https://fahimshahriar.com.bd"
          target="_blank"
          rel="noopener noreferrer"
          className="text-stone-600 dark:text-stone-300 font-semibold hover:text-amber-700 dark:hover:text-amber-400 transition-colors"
        >
          Fahim Shahriar
        </a>
      </footer>
    </div>
  );
}
