import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import type { Question, QuizResult, ReviewItem } from '@/lib/supabase';
import { getBangladeshTimeString } from '@/lib/time';
import { X, Clock, Loader2, CheckCircle2, XCircle, MinusCircle } from 'lucide-react';

interface Props {
  lessonId: string;
  subject: string;
  studentId: string;
  existingResult: QuizResult | null;
  onClose: () => void;
  onComplete: () => void;
}

const QUESTION_TIME = 45;

export function QuizModal({
  lessonId,
  subject,
  studentId,
  existingResult,
  onClose,
  onComplete,
}: Props) {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [timeLeft, setTimeLeft] = useState(QUESTION_TIME);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<QuizResult | null>(existingResult);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const fetchQuestions = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { data, error: qErr } = await supabase
        .from('questions')
        .select('*')
        .eq('lesson_id', lessonId)
        .order('created_at', { ascending: true });
      if (qErr) throw qErr;
      const qs = (data || []) as Question[];
      if (qs.length === 0) {
        setError('No quiz questions available for this lesson.');
        return;
      }
      setQuestions(qs);
      setCurrentIndex(0);
      setAnswers({});
      setTimeLeft(QUESTION_TIME);
    } catch {
      setError('Error loading quiz questions.');
    } finally {
      setLoading(false);
    }
  }, [lessonId]);

  useEffect(() => {
    if (existingResult) {
      setResult(existingResult);
      setLoading(false);
      return;
    }
    fetchQuestions();
  }, [fetchQuestions, existingResult]);

  // Timer effect
  useEffect(() => {
    if (result || loading || error || questions.length === 0) return;

    stopTimer();
    setTimeLeft(QUESTION_TIME);
    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          stopTimer();
          handleNext();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => stopTimer();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIndex, result, loading, error, questions.length]);

  const handleAnswer = (questionId: string, choice: string) => {
    setAnswers((prev) => ({ ...prev, [questionId]: choice }));
  };

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      submitQuiz();
    }
  };

  const handleSubmitClick = () => {
    stopTimer();
    handleNext();
  };

  const submitQuiz = async () => {
    stopTimer();
    setSubmitting(true);
    let score = 0;
    const review: ReviewItem[] = [];

    for (const q of questions) {
      const studentChoice = answers[q.id] || null;
      const isCorrect = studentChoice === q.answer;
      if (isCorrect) score++;

      const optMap: Record<string, string> = {
        A: q.option_a,
        B: q.option_b,
        C: q.option_c,
        D: q.option_d,
      };
      const studentText = studentChoice ? optMap[studentChoice] || '' : 'Unanswered (Time Expired)';
      const correctText = optMap[q.answer] || '';

      review.push({
        question: q.question,
        studentChoice,
        studentText,
        correctChoice: q.answer,
        correctText,
        isCorrect,
        explanation: q.explanation || '',
      });
    }

    const total = questions.length;
    const percentage = Math.round((score / (total || 1)) * 100);

    try {
      const { data: existing } = await supabase
        .from('quiz_results')
        .select('id')
        .eq('student_id', studentId)
        .eq('lesson_id', lessonId)
        .maybeSingle();

      let savedResult: QuizResult;

      if (existing) {
        const { data: updated, error: uErr } = await supabase
          .from('quiz_results')
          .update({
            score,
            total,
            percentage,
            review: review as unknown as Record<string, unknown>[],
            created_at: getBangladeshTimeString(),
          })
          .eq('id', existing.id)
          .select('*')
          .single();
        if (uErr) throw uErr;
        savedResult = updated as QuizResult;
      } else {
        const { data: inserted, error: iErr } = await supabase
          .from('quiz_results')
          .insert({
            student_id: studentId,
            lesson_id: lessonId,
            score,
            total,
            percentage,
            review: review as unknown as Record<string, unknown>[],
            created_at: getBangladeshTimeString(),
          })
          .select('*')
          .single();
        if (iErr) throw iErr;
        savedResult = inserted as QuizResult;
      }

      setResult(savedResult);
    } catch {
      setResult({
        id: 'local',
        student_id: studentId,
        lesson_id: lessonId,
        score,
        total,
        percentage,
        review,
        created_at: getBangladeshTimeString(),
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    stopTimer();
    if (result) {
      onComplete();
    } else {
      onClose();
    }
  };

  // Render result view
  if (result) {
    const correct = result.review.filter((r) => r.isCorrect).length;
    const wrong = result.review.filter((r) => !r.isCorrect && r.studentChoice).length;
    const unanswered = result.review.filter((r) => !r.studentChoice).length;
    const pct = result.percentage;

    let title = '';
    if (pct >= 80) title = 'Excellent Score!';
    else if (pct >= 50) title = 'Good Effort!';

    const correctDeg = (correct / (result.total || 1)) * 360;
    const wrongDeg = (wrong / (result.total || 1)) * 360;

    let donutBg = '';
    if (correct === result.total) donutBg = '#16a34a';
    else if (wrong === result.total && unanswered === 0) donutBg = '#dc2626';
    else if (unanswered === result.total) donutBg = '#ca8a04';
    else {
      donutBg = `conic-gradient(#16a34a 0deg ${correctDeg}deg, #dc2626 ${correctDeg}deg ${correctDeg + wrongDeg}deg, #ca8a04 ${correctDeg + wrongDeg}deg 360deg)`;
    }

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/60 dark:bg-black/80 backdrop-blur-xs p-3 sm:p-4 animate-in fade-in">
        <div className="bg-[#fffefb] dark:bg-[#1f1d1b] rounded-2xl shadow-2xl border border-[#ece4d6] dark:border-[#38322c] w-full max-w-md max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150">
          <div className="flex items-center justify-between px-5 py-4 border-b border-[#ece4d6] dark:border-[#38322c] bg-[#faf6ed] dark:bg-[#262320]">
            <div>
              <h3 className="text-base font-bold text-[#2c2825] dark:text-[#f2ece4]">{subject} Quiz Result</h3>
              <p className="text-xs text-stone-500 dark:text-stone-400">Summary of test performance</p>
            </div>
            <button
              onClick={handleClose}
              className="text-stone-400 hover:text-stone-700 dark:text-stone-400 dark:hover:text-stone-200 p-1.5 rounded-lg hover:bg-stone-200/60 dark:hover:bg-stone-800 transition-colors cursor-pointer"
              title="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="overflow-y-auto p-5 space-y-5 bg-[#fffefb] dark:bg-[#1f1d1b]">
            {/* Score Donut */}
            <div className="flex flex-col items-center">
              {title ? (
                <h2 className="text-base font-bold text-[#2c2825] dark:text-[#f2ece4] mb-4">{title}</h2>
              ) : (
                <div className="mb-2" />
              )}
              <div
                className="relative w-32 h-32 rounded-full flex items-center justify-center shadow-xs"
                style={{ background: donutBg }}
              >
                <div className="w-24 h-24 bg-[#fffefb] dark:bg-[#1f1d1b] rounded-full flex flex-col items-center justify-center shadow-inner">
                  <div className="text-2xl font-black text-[#2c2825] dark:text-[#f2ece4]">{pct}%</div>
                  <div className="text-xs font-semibold text-stone-500 dark:text-stone-400">
                    {result.score} / {result.total}
                  </div>
                </div>
              </div>
            </div>

            {/* Breakdown */}
            <div className="flex justify-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 px-2.5 py-1 rounded-full">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" /> Correct: <b>{correct}</b>
              </span>
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-rose-800 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 px-2.5 py-1 rounded-full">
                <XCircle className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" /> Wrong: <b>{wrong}</b>
              </span>
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 px-2.5 py-1 rounded-full">
                <MinusCircle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" /> Unanswered: <b>{unanswered}</b>
              </span>
            </div>

            {/* Review */}
            <div className="space-y-3">
              {result.review.map((r, i) => (
                <div
                  key={i}
                  className={`rounded-xl border p-3.5 transition-colors ${
                    r.isCorrect
                      ? 'border-emerald-200 dark:border-emerald-800/60 bg-emerald-50/50 dark:bg-emerald-950/30'
                      : 'border-rose-200 dark:border-rose-800/60 bg-rose-50/50 dark:bg-rose-950/30'
                  }`}
                >
                  <div className="flex items-start gap-2.5">
                    {r.isCorrect ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 mt-0.5 flex-shrink-0" />
                    ) : (
                      <XCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 mt-0.5 flex-shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-[#2c2825] dark:text-[#f2ece4]">{r.question}</div>
                      <div className="text-xs text-stone-600 dark:text-stone-300 mt-1">
                        Your choice:{' '}
                        <span
                          className={`font-semibold ${
                            r.isCorrect ? 'text-emerald-700 dark:text-emerald-300' : 'text-rose-700 dark:text-rose-300'
                          }`}
                        >
                          {r.studentText}
                        </span>
                      </div>
                      {!r.isCorrect && (
                        <div className="text-xs text-stone-600 dark:text-stone-300 mt-0.5">
                          Correct:{' '}
                          <span className="text-emerald-700 dark:text-emerald-300 font-semibold">{r.correctText}</span>
                        </div>
                      )}
                      {r.explanation && (
                        <div className="text-xs text-stone-600 dark:text-stone-300 mt-2 italic bg-[#f5efe3] dark:bg-[#292521] p-2.5 rounded-lg border border-[#ece4d6] dark:border-[#3d3731]">
                          {r.explanation}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="px-5 py-3.5 border-t border-[#ece4d6] dark:border-[#38322c] bg-[#faf6ed] dark:bg-[#262320]">
            <button
              onClick={handleClose}
              className="w-full bg-gradient-to-r from-blue-600 via-sky-600 to-blue-700 hover:from-blue-700 hover:to-sky-700 active:scale-[0.99] text-white font-semibold py-2.5 rounded-xl transition-all shadow-sm hover:shadow-md cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Loading state
  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/60 dark:bg-black/80 backdrop-blur-xs p-4 animate-in fade-in">
        <div className="bg-[#fffefb] dark:bg-[#1f1d1b] rounded-2xl shadow-2xl border border-[#ece4d6] dark:border-[#38322c] w-full max-w-md p-8 flex flex-col items-center">
          <Loader2 className="w-8 h-8 text-blue-600 dark:text-sky-400 animate-spin mb-3" />
          <p className="text-sm font-medium text-stone-700 dark:text-stone-300">Loading quiz questions...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/60 dark:bg-black/80 backdrop-blur-xs p-4 animate-in fade-in">
        <div className="bg-[#fffefb] dark:bg-[#1f1d1b] rounded-2xl shadow-2xl border border-[#ece4d6] dark:border-[#38322c] w-full max-w-md p-8 flex flex-col items-center">
          <XCircle className="w-8 h-8 text-rose-600 dark:text-rose-400 mb-3" />
          <p className="text-sm text-stone-700 dark:text-stone-300 text-center font-medium">{error}</p>
          <button
            onClick={onClose}
            className="mt-4 px-5 py-2 text-sm font-semibold text-white bg-gradient-to-r from-blue-600 to-sky-600 hover:from-blue-700 hover:to-sky-700 rounded-xl cursor-pointer shadow-sm transition-all"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  // Quiz question view
  const q = questions[currentIndex];
  const isLast = currentIndex === questions.length - 1;
  const progressPct = Math.round(((currentIndex + 1) / questions.length) * 100);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/60 dark:bg-black/80 backdrop-blur-xs p-3 sm:p-4 animate-in fade-in">
      <div className="bg-[#fffefb] dark:bg-[#1f1d1b] rounded-2xl shadow-2xl border border-[#ece4d6] dark:border-[#38322c] w-full max-w-md max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-5 py-4 border-b border-[#ece4d6] dark:border-[#38322c] bg-[#faf6ed] dark:bg-[#262320]">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-white bg-gradient-to-r from-blue-600 to-sky-600 px-2.5 py-0.5 rounded-lg shadow-xs">
                {subject} Quiz
              </span>
              <span
                className={`text-xs font-bold px-2.5 py-0.5 rounded-lg flex items-center gap-1.5 border transition-colors ${
                  timeLeft <= 10
                    ? 'text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/60 border-rose-200 dark:border-rose-800 animate-pulse'
                    : 'text-stone-700 dark:text-stone-300 bg-[#f0e8db] dark:bg-[#342e29] border-[#dfd4c2] dark:border-[#484039]'
                }`}
              >
                <Clock className="w-3.5 h-3.5" />
                {timeLeft}s
              </span>
            </div>
            <button
              onClick={onClose}
              className="text-stone-400 hover:text-stone-700 dark:text-stone-400 dark:hover:text-stone-200 p-1.5 rounded-lg hover:bg-stone-200/60 dark:hover:bg-stone-800 transition-colors cursor-pointer"
              title="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">
            Question {currentIndex + 1} of {questions.length}
          </p>
          {/* Progress bar */}
          <div className="mt-2.5 h-1.5 bg-[#ebdcc7] dark:bg-[#38322c] rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-blue-600 via-sky-600 to-blue-700 transition-all duration-300 rounded-full"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>

        {/* Question */}
        <div className="overflow-y-auto p-5 bg-[#fffefb] dark:bg-[#1f1d1b]">
          <div className="mb-4">
            <div className="flex items-start gap-2.5 mb-4">
              <span className="text-xs font-bold text-white bg-blue-600 dark:bg-sky-600 px-2.5 py-1 rounded-lg shadow-xs flex-shrink-0">
                Q{currentIndex + 1}
              </span>
              <div className="text-sm sm:text-base font-semibold text-[#2c2825] dark:text-[#f2ece4] leading-relaxed">
                {q.question}
              </div>
            </div>
          </div>

          {/* Options */}
          <div className="space-y-2.5">
            {(['A', 'B', 'C', 'D'] as const).map((opt) => {
              const text =
                opt === 'A'
                  ? q.option_a
                  : opt === 'B'
                  ? q.option_b
                  : opt === 'C'
                  ? q.option_c
                  : q.option_d;
              const selected = answers[q.id] === opt;
              return (
                <label
                  key={opt}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl border cursor-pointer transition-all ${
                    selected
                      ? 'border-blue-600 dark:border-sky-500 bg-blue-50/90 dark:bg-sky-950/50 text-blue-950 dark:text-sky-100 ring-2 ring-blue-500/25 dark:ring-sky-500/30 shadow-xs font-semibold'
                      : 'border-[#ece4d6] dark:border-[#38322c] bg-[#faf6ee] dark:bg-[#272320] hover:border-[#dfd3be] dark:hover:border-[#4c443c] hover:bg-[#f5efe3] dark:hover:bg-[#2f2b27] text-[#2c2825] dark:text-[#f2ece4]'
                  }`}
                >
                  <input
                    type="radio"
                    name={`q_${q.id}`}
                    value={opt}
                    checked={selected}
                    onChange={() => handleAnswer(q.id, opt)}
                    className="w-4 h-4 text-blue-600 accent-blue-600 dark:accent-sky-500 focus:ring-blue-500"
                  />
                  <span className="text-sm font-medium leading-normal">{text}</span>
                </label>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 border-t border-[#ece4d6] dark:border-[#38322c] bg-[#faf6ed] dark:bg-[#262320]">
          <button
            onClick={handleSubmitClick}
            disabled={submitting}
            className="w-full bg-gradient-to-r from-blue-500 via-sky-500 to-blue-600 hover:from-blue-600 hover:to-sky-600 active:scale-[0.99] text-white font-semibold py-2.5 rounded-xl transition-all shadow-sm hover:shadow-md disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Submitting...</span>
              </>
            ) : isLast ? (
              'Submit Quiz'
            ) : (
              'Next Question'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
