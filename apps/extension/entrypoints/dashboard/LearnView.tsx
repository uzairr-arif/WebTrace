import {
  LESSONS,
  lessonById,
  lessonProgressSummary,
  type Lesson,
  type LessonProgress,
} from '@webtrace/core';
import { browser } from '#imports';
import { useCallback, useEffect, useState } from 'react';
import { Term } from '../../components/Term';

const PROGRESS_KEY = 'lessonProgress';

export function LearnView() {
  const [progress, setProgress] = useState<LessonProgress>({});
  const [openLessonId, setOpenLessonId] = useState<string | null>(null);

  useEffect(() => {
    void browser.storage.local.get(PROGRESS_KEY).then((stored) => {
      const value = (stored as Record<string, unknown>)[PROGRESS_KEY];
      if (value && typeof value === 'object') setProgress(value as LessonProgress);
    });
  }, []);

  const saveProgress = useCallback((next: LessonProgress) => {
    setProgress(next);
    void browser.storage.local.set({ [PROGRESS_KEY]: next });
  }, []);

  const summary = lessonProgressSummary(progress);
  const openLesson = openLessonId ? lessonById(openLessonId) : undefined;

  if (openLesson) {
    return (
      <LessonReader
        lesson={openLesson}
        progress={progress[openLesson.id]}
        onBack={() => setOpenLessonId(null)}
        onComplete={(correct, total) =>
          saveProgress({
            ...progress,
            [openLesson.id]: { completed: correct === total, correct, total },
          })
        }
        onNext={() => {
          const idx = LESSONS.findIndex((l) => l.id === openLesson.id);
          const next = LESSONS[idx + 1];
          if (next) {
            setOpenLessonId(next.id);
            window.scrollTo({ top: 0 });
          }
        }}
      />
    );
  }

  return (
    <div className="h-full overflow-y-auto p-4">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-[15px] font-semibold">Learn networking from real traffic</h2>
          <p className="text-[11.5px] text-dim">
            Short lessons on the concepts you are literally watching in the Flow — with quizzes that explain the answers.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-2 w-36 overflow-hidden rounded-full bg-raised">
            <div
              className="h-full rounded-full bg-accent transition-all"
              style={{ width: `${(summary.completed / Math.max(summary.total, 1)) * 100}%` }}
            />
          </div>
          <span className="font-mono text-[11px] text-dim">
            {summary.completed}/{summary.total}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
        {LESSONS.map((lesson) => {
          const done = progress[lesson.id]?.completed === true;
          return (
            <button
              key={lesson.id}
              type="button"
              onClick={() => setOpenLessonId(lesson.id)}
              className="rounded-xl border border-line bg-surface p-4 text-left transition-colors hover:border-accent/50"
            >
              <div className="flex items-center gap-2">
                <span className="rounded-full border border-line px-2 py-0.5 text-[9.5px] uppercase tracking-wider text-faint">
                  {lesson.category}
                </span>
                {done && (
                  <span className="ml-auto rounded-full border border-ok/40 bg-ok/10 px-2 py-0.5 text-[9.5px] font-semibold text-ok">
                    ✓ done
                  </span>
                )}
              </div>
              <p className="mt-2.5 text-[13.5px] font-semibold leading-snug">{lesson.title}</p>
              <p className="mt-1 text-[11.5px] leading-relaxed text-dim">{lesson.summary}</p>
              <p className="mt-2.5 text-[10px] text-faint">
                {lesson.minutes} min · {lesson.quiz.length} quiz question{lesson.quiz.length === 1 ? '' : 's'}
              </p>
            </button>
          );
        })}
      </div>

      <div className="mt-5 rounded-xl border border-accent/30 bg-accent-soft p-4">
        <p className="text-[12px] font-semibold text-accent">Make it stick</p>
        <p className="mt-1 text-[11.5px] leading-relaxed text-dim">
          Run the demo fixture (<code className="font-mono text-accent">node tests/fixtures/demo-site/server.mjs</code>)
          and read its pages while a lesson is fresh — redirects, a 404, a 500 and
          a CORS preflight all happen on cue. Then open the Live Flow and find
          each one.
        </p>
      </div>
    </div>
  );
}

function LessonReader({
  lesson,
  progress,
  onBack,
  onComplete,
  onNext,
}: {
  lesson: Lesson;
  progress?: { completed: boolean; correct: number; total: number };
  onBack: () => void;
  onComplete: (correct: number, total: number) => void;
  onNext: () => void;
}) {
  const [answers, setAnswers] = useState<Record<number, number>>({});

  const allAnswered = lesson.quiz.every((_, i) => answers[i] !== undefined);
  const correctCount = lesson.quiz.reduce(
    (sum, q, i) => sum + (answers[i] === q.answer ? 1 : 0),
    0,
  );

  const answer = (index: number, option: number) => {
    if (answers[index] !== undefined) return;
    const next = { ...answers, [index]: option };
    setAnswers(next);
    const correct = lesson.quiz.reduce(
      (sum, q, i) => sum + (next[i] === q.answer ? 1 : 0),
      0,
    );
    onComplete(correct, lesson.quiz.length);
  };

  return (
    <div className="h-full overflow-y-auto p-4" key={lesson.id}>
      <button
        type="button"
        onClick={onBack}
        className="mb-3 text-[11.5px] text-dim transition-colors hover:text-accent"
      >
        ← All lessons
      </button>

      <div className="max-w-2xl">
        <span className="rounded-full border border-line px-2 py-0.5 text-[9.5px] uppercase tracking-wider text-faint">
          {lesson.category} · {lesson.minutes} min
        </span>
        <h2 className="mt-2 text-[19px] font-semibold leading-tight">{lesson.title}</h2>

        <div className="mt-4 space-y-4">
          {lesson.sections.map((section, i) => (
            <section key={i} className="rounded-xl border border-line bg-surface p-4">
              <h3 className="text-[12.5px] font-semibold text-accent">{section.heading}</h3>
              <p className="mt-1.5 text-[12.5px] leading-relaxed text-ink">{section.body}</p>
            </section>
          ))}
        </div>

        {lesson.terms.length > 0 && (
          <div className="mt-4 flex flex-wrap items-center gap-1.5 text-[11.5px] text-dim">
            <span className="mr-1 text-faint">Key terms:</span>
            {lesson.terms.map((t) => (
              <Term key={t} termKey={t} force />
            ))}
          </div>
        )}

        <h3 className="mb-2 mt-6 text-[10px] font-semibold uppercase tracking-wider text-faint">
          Check yourself
        </h3>
        <div className="space-y-3">
          {lesson.quiz.map((q, i) => (
            <QuizCard
              key={i}
              index={i}
              question={q}
              chosen={answers[i]}
              onAnswer={(option) => answer(i, option)}
            />
          ))}
        </div>

        {allAnswered && (
          <div className="mt-5 flex items-center gap-3 rounded-xl border border-line bg-surface p-4">
            <p className="text-[12.5px]">
              {correctCount === lesson.quiz.length ? (
                <span className="font-semibold text-ok">All correct — lesson complete ✓</span>
              ) : (
                <span className="text-dim">
                  {correctCount}/{lesson.quiz.length} correct — re-answer any question to lock it in.
                </span>
              )}
            </p>
            <div className="ml-auto flex gap-2">
              <button
                type="button"
                onClick={() => setAnswers({})}
                className="rounded-lg border border-line px-3 py-1.5 text-[11.5px] text-dim hover:text-ink"
              >
                Retry
              </button>
              <button
                type="button"
                onClick={onNext}
                className="rounded-lg bg-accent px-3 py-1.5 text-[11.5px] font-semibold text-on-accent"
              >
                Next lesson →
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function QuizCard({
  question,
  chosen,
  onAnswer,
}: {
  index: number;
  question: Lesson['quiz'][number];
  chosen?: number;
  onAnswer: (option: number) => void;
}) {
  const answered = chosen !== undefined;
  return (
    <div className="rounded-xl border border-line bg-surface p-4">
      <p className="text-[12.5px] font-medium">{question.question}</p>
      <div className="mt-2.5 space-y-1.5">
        {question.options.map((option, oi) => {
          const isAnswer = oi === question.answer;
          const isChosen = chosen === oi;
          let tone = 'border-line hover:border-accent/50';
          if (answered && isAnswer) tone = 'border-ok/60 bg-ok/10';
          else if (answered && isChosen) tone = 'border-err/60 bg-err/10';
          else if (answered) tone = 'border-line opacity-50';
          return (
            <button
              key={oi}
              type="button"
              disabled={answered}
              onClick={() => onAnswer(oi)}
              className={`block w-full rounded-lg border px-3 py-2 text-left text-[12px] transition-colors ${tone}`}
            >
              <span className="mr-2 font-mono text-[10px] text-faint">
                {String.fromCharCode(65 + oi)}
              </span>
              {option}
              {answered && isAnswer && <span className="ml-2 text-ok">✓</span>}
              {answered && isChosen && !isAnswer && <span className="ml-2 text-err">✕</span>}
            </button>
          );
        })}
      </div>
      {answered && (
        <p className="mt-2.5 rounded-lg bg-raised px-3 py-2 text-[11.5px] leading-relaxed text-dim">
          {question.explanation}
        </p>
      )}
    </div>
  );
}
