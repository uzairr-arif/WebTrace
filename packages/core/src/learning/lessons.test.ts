import { describe, expect, it } from 'vitest';
import { LESSONS, lessonById, lessonProgressSummary } from './lessons';
import { GLOSSARY } from '../explain/glossary';

describe('lessons', () => {
  it('has unique ids', () => {
    const ids = new Set(LESSONS.map((l) => l.id));
    expect(ids.size).toBe(LESSONS.length);
  });

  it('every quiz answer is a valid option index with an explanation', () => {
    for (const lesson of LESSONS) {
      expect(lesson.quiz.length, lesson.id).toBeGreaterThan(0);
      for (const q of lesson.quiz) {
        expect(q.options.length, lesson.id).toBeGreaterThanOrEqual(2);
        expect(q.answer, lesson.id).toBeGreaterThanOrEqual(0);
        expect(q.answer, lesson.id).toBeLessThan(q.options.length);
        expect(q.explanation.length, lesson.id).toBeGreaterThan(10);
      }
    }
  });

  it('terms reference existing glossary entries', () => {
    for (const lesson of LESSONS) {
      for (const term of lesson.terms) {
        expect(GLOSSARY[term], `${lesson.id} → ${term}`).toBeDefined();
      }
    }
  });

  it('content is non-trivial', () => {
    for (const lesson of LESSONS) {
      expect(lesson.sections.length, lesson.id).toBeGreaterThan(0);
      expect(lesson.summary.length, lesson.id).toBeGreaterThan(20);
      for (const section of lesson.sections) {
        expect(section.body.length, lesson.id).toBeGreaterThan(40);
      }
    }
  });

  it('looks lessons up by id and summarizes progress', () => {
    expect(lessonById('caching')).toBeDefined();
    expect(lessonById('nope')).toBeUndefined();
    expect(lessonProgressSummary({})).toEqual({ completed: 0, total: LESSONS.length });
    const first = LESSONS[0];
    expect(
      lessonProgressSummary({ [first.id]: { completed: true, correct: 1, total: 2 } }),
    ).toEqual({ completed: 1, total: LESSONS.length });
  });
});
