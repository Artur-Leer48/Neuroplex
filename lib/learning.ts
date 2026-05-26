"use client";

import { getScopedStorageKey } from "@/lib/scoped-storage";

const STORAGE_KEY = "neuroplex:learning-topics";

export const REVIEW_INTERVAL_DAYS = [1, 3, 7, 14, 30, 60] as const;

export type LearningGoal = "Verstehen" | "Auswendig lernen" | "Pruefung" | "Projekt";
export type ResourceType =
  | "Buch"
  | "Artikel"
  | "Video"
  | "Kurs"
  | "Podcast"
  | "Eigene Notiz"
  | "Datei"
  | "Link";
export type ResourceStatus = "offen" | "in Bearbeitung" | "abgeschlossen";
export type ReviewRating = "Forgot" | "Hard" | "Good" | "Easy";

export type LearningResourceFile = {
  databaseId: string;
  name: string;
  mimeType: string;
  size: number;
};

export type LearningResource = {
  id: string;
  topicId: string;
  type: ResourceType;
  title: string;
  reference: string;
  summary: string;
  locator: string;
  status: ResourceStatus;
  file: LearningResourceFile | null;
  createdAt: string;
};

export type ReviewSession = {
  id: string;
  topicId: string;
  reviewedAt: string;
  rating: ReviewRating;
  notes: string;
  activeRecall: string;
  nextReviewDate: string;
};

export type ReviewSchedule = {
  topicId: string;
  currentIntervalIndex: number;
  nextReviewDate: string;
  isCompleted: boolean;
};

export type ProjectedReview = {
  topicId: string;
  topicTitle: string;
  date: string;
  intervalDays: number;
  sequence: number;
  isNextReview: boolean;
  isCompleted: boolean;
};

export type LearningTopic = {
  id: string;
  title: string;
  description: string;
  tags: string[];
  goal: LearningGoal;
  startDate: string;
  deadline: string | null;
  resources: LearningResource[];
  reviewHistory: ReviewSession[];
  schedule: ReviewSchedule;
  reviewRepetitionCount: number;
  recallQuestions: string[];
  createdAt: string;
  updatedAt: string;
};

export type LearningTopicDraft = {
  title: string;
  description: string;
  tags: string;
  goal: LearningGoal;
  startDate: string;
  deadline: string;
  reviewRepetitionCount: string;
};

export type LearningResourceDraft = {
  type: ResourceType;
  title: string;
  reference: string;
  summary: string;
  locator: string;
  status: ResourceStatus;
};

export type ReviewCompletionDraft = {
  rating: ReviewRating;
  notes: string;
  activeRecall: string;
};

export function readLearningTopics() {
  if (typeof window === "undefined") {
    return [];
  }

  const rawTopics = window.localStorage.getItem(getScopedStorageKey(STORAGE_KEY));

  if (!rawTopics) {
    return [];
  }

  try {
    const parsedTopics = JSON.parse(rawTopics);

    if (!Array.isArray(parsedTopics)) {
      return [];
    }

    return parsedTopics.filter(isLearningTopic).map(normalizeLearningTopic);
  } catch {
    return [];
  }
}

export function writeLearningTopics(topics: LearningTopic[]) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(
    getScopedStorageKey(STORAGE_KEY),
    JSON.stringify(topics),
  );
}

export function createLearningTopic(draft: LearningTopicDraft): LearningTopic {
  const now = new Date().toISOString();
  const id = crypto.randomUUID();
  const startDate = draft.startDate || toDateInputValue(new Date());
  const reviewRepetitionCount = getClampedReviewRepetitionCount(
    Number(draft.reviewRepetitionCount),
  );

  return {
    id,
    title: draft.title.trim(),
    description: draft.description.trim(),
    tags: parseTags(draft.tags),
    goal: draft.goal,
    startDate,
    deadline: draft.deadline || null,
    resources: [],
    reviewHistory: [],
    schedule: {
      topicId: id,
      currentIntervalIndex: 0,
      nextReviewDate: addDays(startDate, REVIEW_INTERVAL_DAYS[0]),
      isCompleted: false,
    },
    reviewRepetitionCount,
    recallQuestions: [
      "Was ist die Kernidee?",
      "Welche Details wuerdest du ohne Notizen erklaeren?",
      "Wo bist du noch unsicher?",
    ],
    createdAt: now,
    updatedAt: now,
  };
}

export function createLearningResource(
  topicId: string,
  draft: LearningResourceDraft,
  file: LearningResourceFile | null = null,
): LearningResource {
  return {
    id: crypto.randomUUID(),
    topicId,
    type: draft.type,
    title: draft.title.trim(),
    reference: draft.reference.trim() || file?.name || "",
    summary: draft.summary.trim(),
    locator: draft.locator.trim(),
    status: draft.status,
    file,
    createdAt: new Date().toISOString(),
  };
}

export function completeReview(
  topic: LearningTopic,
  draft: ReviewCompletionDraft,
) {
  const nextIntervalIndex = getNextIntervalIndex(
    topic.schedule.currentIntervalIndex,
    draft.rating,
  );
  const nextReviewDate = addDays(new Date(), REVIEW_INTERVAL_DAYS[nextIntervalIndex]);
  const reviewedAt = new Date().toISOString();
  const review: ReviewSession = {
    id: crypto.randomUUID(),
    topicId: topic.id,
    reviewedAt,
    rating: draft.rating,
    notes: draft.notes.trim(),
    activeRecall: draft.activeRecall.trim(),
    nextReviewDate,
  };

  return {
    ...topic,
    reviewHistory: [review, ...topic.reviewHistory],
    schedule: {
      topicId: topic.id,
      currentIntervalIndex: nextIntervalIndex,
      nextReviewDate,
      isCompleted: false,
    },
    updatedAt: reviewedAt,
  };
}

export function getTopicReviewState(topic: LearningTopic, today = new Date()) {
  if (topic.schedule.isCompleted) {
    return "completed";
  }

  const reviewDate = startOfDay(new Date(topic.schedule.nextReviewDate));
  const todayStart = startOfDay(today);

  if (reviewDate.getTime() < todayStart.getTime()) {
    return "overdue";
  }

  if (reviewDate.getTime() === todayStart.getTime()) {
    return "today";
  }

  return "upcoming";
}

export function getProjectedReviews(topic: LearningTopic): ProjectedReview[] {
  const repetitionCount = getClampedReviewRepetitionCount(
    topic.reviewRepetitionCount,
  );
  const completedDates = new Set(
    topic.reviewHistory.map((review) =>
      toDateInputValue(new Date(review.reviewedAt)),
    ),
  );
  const projectedReviews: ProjectedReview[] = [];
  let intervalIndex = Math.min(
    REVIEW_INTERVAL_DAYS.length - 1,
    Math.max(0, topic.schedule.currentIntervalIndex),
  );
  let reviewDate = topic.schedule.nextReviewDate;
  let sequence = intervalIndex + 1;

  while (projectedReviews.length < repetitionCount) {
    const intervalDays = REVIEW_INTERVAL_DAYS[intervalIndex];

    projectedReviews.push({
      topicId: topic.id,
      topicTitle: topic.title,
      date: reviewDate,
      intervalDays,
      sequence,
      isNextReview: reviewDate === topic.schedule.nextReviewDate,
      isCompleted: completedDates.has(reviewDate),
    });

    const nextIntervalIndex = Math.min(
      REVIEW_INTERVAL_DAYS.length - 1,
      intervalIndex + 1,
    );
    const daysToNextReview =
      nextIntervalIndex === intervalIndex
        ? REVIEW_INTERVAL_DAYS[nextIntervalIndex]
        : REVIEW_INTERVAL_DAYS[nextIntervalIndex] -
          REVIEW_INTERVAL_DAYS[intervalIndex];

    reviewDate = addDays(reviewDate, daysToNextReview);
    intervalIndex = nextIntervalIndex;
    sequence += 1;
  }

  return projectedReviews;
}

export function countRepeatedDays(topic: LearningTopic) {
  return new Set(
    topic.reviewHistory.map((review) => toDateInputValue(new Date(review.reviewedAt))),
  ).size;
}

export function calculateLearningStreak(topics: LearningTopic[]) {
  const reviewDays = new Set<string>();

  for (const topic of topics) {
    for (const review of topic.reviewHistory) {
      reviewDays.add(toDateInputValue(new Date(review.reviewedAt)));
    }
  }

  let streak = 0;
  const cursor = startOfDay(new Date());

  while (reviewDays.has(toDateInputValue(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  return streak;
}

export function toDateInputValue(date: Date) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

export function addDays(date: Date | string, days: number) {
  const nextDate =
    typeof date === "string" ? new Date(`${date}T00:00:00`) : new Date(date);
  nextDate.setDate(nextDate.getDate() + days);
  return toDateInputValue(nextDate);
}

export function getClampedReviewRepetitionCount(count: number) {
  if (!Number.isFinite(count)) {
    return 6;
  }

  return Math.min(36, Math.max(1, Math.round(count)));
}

function getNextIntervalIndex(currentIndex: number, rating: ReviewRating) {
  if (rating === "Forgot") {
    return 0;
  }

  if (rating === "Hard") {
    return Math.max(0, currentIndex);
  }

  if (rating === "Easy") {
    return Math.min(REVIEW_INTERVAL_DAYS.length - 1, currentIndex + 2);
  }

  return Math.min(REVIEW_INTERVAL_DAYS.length - 1, currentIndex + 1);
}

function parseTags(tags: string) {
  return tags
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
}

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function isLearningTopic(value: unknown): value is LearningTopic {
  if (!value || typeof value !== "object") {
    return false;
  }

  const topic = value as Partial<LearningTopic>;

  return (
    typeof topic.id === "string" &&
    typeof topic.title === "string" &&
    typeof topic.description === "string" &&
    Array.isArray(topic.tags) &&
    isLearningGoal(topic.goal) &&
    typeof topic.startDate === "string" &&
    (topic.deadline === null || typeof topic.deadline === "string") &&
    Array.isArray(topic.resources) &&
    topic.resources.every(isLearningResource) &&
    Array.isArray(topic.reviewHistory) &&
    topic.reviewHistory.every(isReviewSession) &&
    isReviewSchedule(topic.schedule) &&
    (typeof topic.reviewRepetitionCount === "number" ||
      typeof topic.reviewRepetitionCount === "undefined") &&
    Array.isArray(topic.recallQuestions) &&
    typeof topic.createdAt === "string" &&
    typeof topic.updatedAt === "string"
  );
}

function normalizeLearningTopic(topic: LearningTopic): LearningTopic {
  const legacyTopic = topic as LearningTopic & {
    reviewHorizonDays?: number;
  };

  return {
    ...topic,
    resources: topic.resources.map((resource) => ({
      ...resource,
      file: resource.file ?? null,
    })),
    reviewRepetitionCount: getClampedReviewRepetitionCount(
      topic.reviewRepetitionCount ??
        getLegacyRepetitionCount(legacyTopic.reviewHorizonDays),
    ),
  };
}

function getLegacyRepetitionCount(horizonDays: number | undefined) {
  if (!horizonDays || !Number.isFinite(horizonDays)) {
    return 6;
  }

  if (horizonDays <= 30) {
    return 5;
  }

  if (horizonDays <= 60) {
    return 6;
  }

  return Math.min(36, 6 + Math.ceil((horizonDays - 60) / 60));
}

function isLearningResource(value: unknown): value is LearningResource {
  if (!value || typeof value !== "object") {
    return false;
  }

  const resource = value as Partial<LearningResource>;

  return (
    typeof resource.id === "string" &&
    typeof resource.topicId === "string" &&
    isResourceType(resource.type) &&
    typeof resource.title === "string" &&
    typeof resource.reference === "string" &&
    typeof resource.summary === "string" &&
    typeof resource.locator === "string" &&
    isResourceStatus(resource.status) &&
    (typeof resource.file === "undefined" ||
      resource.file === null ||
      isLearningResourceFile(resource.file)) &&
    typeof resource.createdAt === "string"
  );
}

function isLearningResourceFile(value: unknown): value is LearningResourceFile {
  if (!value || typeof value !== "object") {
    return false;
  }

  const file = value as Partial<LearningResourceFile>;

  return (
    typeof file.databaseId === "string" &&
    typeof file.name === "string" &&
    typeof file.mimeType === "string" &&
    typeof file.size === "number"
  );
}

function isReviewSession(value: unknown): value is ReviewSession {
  if (!value || typeof value !== "object") {
    return false;
  }

  const review = value as Partial<ReviewSession>;

  return (
    typeof review.id === "string" &&
    typeof review.topicId === "string" &&
    typeof review.reviewedAt === "string" &&
    isReviewRating(review.rating) &&
    typeof review.notes === "string" &&
    typeof review.activeRecall === "string" &&
    typeof review.nextReviewDate === "string"
  );
}

function isReviewSchedule(value: unknown): value is ReviewSchedule {
  if (!value || typeof value !== "object") {
    return false;
  }

  const schedule = value as Partial<ReviewSchedule>;

  return (
    typeof schedule.topicId === "string" &&
    typeof schedule.currentIntervalIndex === "number" &&
    typeof schedule.nextReviewDate === "string" &&
    typeof schedule.isCompleted === "boolean"
  );
}

function isLearningGoal(value: unknown): value is LearningGoal {
  return (
    value === "Verstehen" ||
    value === "Auswendig lernen" ||
    value === "Pruefung" ||
    value === "Projekt"
  );
}

function isResourceType(value: unknown): value is ResourceType {
  return (
    value === "Buch" ||
    value === "Artikel" ||
    value === "Video" ||
    value === "Kurs" ||
    value === "Podcast" ||
    value === "Eigene Notiz" ||
    value === "Datei" ||
    value === "Link"
  );
}

function isResourceStatus(value: unknown): value is ResourceStatus {
  return (
    value === "offen" ||
    value === "in Bearbeitung" ||
    value === "abgeschlossen"
  );
}

function isReviewRating(value: unknown): value is ReviewRating {
  return (
    value === "Forgot" ||
    value === "Hard" ||
    value === "Good" ||
    value === "Easy"
  );
}
