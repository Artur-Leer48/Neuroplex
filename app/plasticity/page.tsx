"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { AppHeader } from "@/app/app-header";
import {
  CURRENT_TASK_CHANGED_EVENT,
  readCurrentTask,
} from "@/lib/current-task";
import { hasDemoOrSupabaseSession } from "@/lib/demo-auth";
import {
  readEisenhowerTodos,
  type EisenhowerQuadrant,
  type EisenhowerTodo,
} from "@/lib/eisenhower-todos";
import { consumePendingFocusSession } from "@/lib/focus-session";
import {
  getProjectedReviews,
  readLearningTopics,
  type LearningTopic,
  type ProjectedReview,
} from "@/lib/learning";
import { supabaseBrowser } from "@/lib/supabase-browser";
import { recordPlasticityStat } from "@/lib/plasticity-stats";
import { getScopedStorageKey } from "@/lib/scoped-storage";

const TIMER_OPTIONS = [
  { label: "1s", seconds: 1 },
  { label: "30m", seconds: 30 * 60 },
  { label: "45m", seconds: 45 * 60 },
  { label: "60m", seconds: 60 * 60 },
  { label: "75m", seconds: 75 * 60 },
  { label: "90m", seconds: 90 * 60 },
];
const MAX_DURATION_SECONDS = 2 * 60 * 60;
const DOUBLE_SPACE_DELAY_MS = 350;
const ACTIVE_TIMER_STORAGE_KEY = "neuroplex:active-plasticity-timer";
const ACTIVE_FOCUS_PREP_STORAGE_KEY = "neuroplex:active-focus-prep";
const FOCUS_PREP_SETTINGS_STORAGE_KEY = "neuroplex:focus-prep-settings";
const PLASTICITY_SETTINGS_STORAGE_KEY = "neuroplex:plasticity-settings";
const PLASTICITY_END_SOUND_PATH = "/plasticity-session-end.mp3";
const PRAISE_MESSAGES = [
  "Sehr gut gemacht! Du hast deinem Gehirn gerade Zeit gegeben, das Gelernte zu sortieren.",
  "Stark abgeschlossen. Genau solche Pausen machen Training wirksam.",
  "Gut gemacht. Dein Nervensystem hatte gerade Raum fuer Erholung.",
  "Schoen drangeblieben. Das war ein sauberer Plasticity-Durchlauf.",
];

const MINI_QUADRANTS: Array<{
  id: EisenhowerQuadrant;
  title: string;
}> = [
  {
    id: "urgent-important",
    title: "Dringend & wichtig",
  },
  {
    id: "not-urgent-important",
    title: "Nicht dringend & wichtig",
  },
  {
    id: "urgent-not-important",
    title: "Dringend & unwichtig",
  },
  {
    id: "not-urgent-not-important",
    title: "Nicht dringend & unwichtig",
  },
];

const ACTIVITIES = [
  {
    id: "yoga-nidra",
    label: "Yoga Nidra",
    prompt: "Mache jetzt eine Yoga-Nidra-Session.",
    defaultRecoverySeconds: 20 * 60,
    hasRecoveryTimer: true,
  },
  {
    id: "meditation",
    label: "Meditieren",
    prompt: "Meditiere jetzt fuer ein paar Minuten.",
    defaultRecoverySeconds: 10 * 60,
    hasRecoveryTimer: true,
  },
  {
    id: "walk",
    label: "Spaziergang",
    prompt: "Mache jetzt einen ruhigen Spaziergang.",
    defaultRecoverySeconds: 0,
    hasRecoveryTimer: false,
  },
] as const;

type Activity = (typeof ACTIVITIES)[number];
type ActivityId = Activity["id"];
type Phase = "plasticity" | "recovery";

type ActiveTimerSession =
  | {
      phase: "plasticity";
      durationSeconds: number;
      endAt: number;
      timerName?: string;
      taskId?: string | null;
      taskTitle?: string | null;
    }
  | {
      phase: "recovery";
      activityId: ActivityId;
      durationSeconds: number;
      endAt: number;
      timerName?: string;
      taskId?: string | null;
      taskTitle?: string | null;
    };

type ActiveFocusPrepSession = {
  durationSeconds: number;
  sessionDurationSeconds: number;
  endAt: number;
  timerName: string;
  taskId: string | null;
  taskTitle: string | null;
};

export default function PlasticityPage() {
  const router = useRouter();
  const spacePressTimerRef = useRef<number | null>(null);
  const lastSpacePressRef = useRef(0);
  const plasticityEndAtRef = useRef<number | null>(null);
  const recoveryEndAtRef = useRef<number | null>(null);
  const focusPrepEndAtRef = useRef<number | null>(null);
  const activeTaskRef = useRef<{
    id: string | null;
    title: string | null;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [phase, setPhase] = useState<Phase>("plasticity");
  const [durationSeconds, setDurationSeconds] = useState(30 * 60);
  const [remainingSeconds, setRemainingSeconds] = useState(30 * 60);
  const [isFocusPrepActive, setIsFocusPrepActive] = useState(false);
  const [focusPrepDurationSeconds, setFocusPrepDurationSeconds] = useState(45);
  const [focusPrepInputSeconds, setFocusPrepInputSeconds] = useState("45");
  const [focusPrepRemainingSeconds, setFocusPrepRemainingSeconds] =
    useState(30);
  const [isFocusPrepEnabled, setIsFocusPrepEnabled] = useState(true);
  const [timerName, setTimerName] = useState("Plasticity");
  const [showProjectSuggestions, setShowProjectSuggestions] = useState(false);
  const [showSettingsProjectSuggestions, setShowSettingsProjectSuggestions] =
    useState(false);
  const [mainView, setMainView] = useState<"timer" | "eisenhower">("timer");
  const [eisenhowerTodos, setEisenhowerTodos] = useState<EisenhowerTodo[]>([]);
  const [learningTopics, setLearningTopics] = useState<LearningTopic[]>([]);
  const [isReviewCalendarVisible, setIsReviewCalendarVisible] = useState(false);
  const [customMinutes, setCustomMinutes] = useState("0");
  const [isRunning, setIsRunning] = useState(false);
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(
    null,
  );
  const [recoveryDurationSeconds, setRecoveryDurationSeconds] = useState(
    10 * 60,
  );
  const [recoveryRemainingSeconds, setRecoveryRemainingSeconds] = useState(
    10 * 60,
  );
  const [recoveryMinutes, setRecoveryMinutes] = useState("10");
  const [recoverySeconds, setRecoverySeconds] = useState("0");
  const [isRecoveryRunning, setIsRecoveryRunning] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showRecoverySettings, setShowRecoverySettings] = useState(false);
  const [showSkipDialog, setShowSkipDialog] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [messageTone, setMessageTone] = useState<"error" | "praise">("praise");
  const [allowedActivities, setAllowedActivities] = useState<
    Record<ActivityId, boolean>
  >({
    "yoga-nidra": true,
    meditation: true,
    walk: true,
  });

  const allowedActivityOptions = useMemo(
    () => ACTIVITIES.filter((activity) => allowedActivities[activity.id]),
    [allowedActivities],
  );

  const selectedActivityCount = allowedActivityOptions.length;
  const formattedTime = formatSeconds(remainingSeconds);
  const formattedRecoveryTime = formatSeconds(recoveryRemainingSeconds);
  const activeEisenhowerTodos = useMemo(
    () => eisenhowerTodos.filter((todo) => !todo.isDone),
    [eisenhowerTodos],
  );
  const projectSuggestions = useMemo(() => {
    const normalizedQuery = timerName.trim().toLowerCase();
    const seenProjects = new Set<string>();

    return eisenhowerTodos
      .filter((todo) =>
        normalizedQuery
          ? todo.title.toLowerCase().includes(normalizedQuery)
          : true,
      )
      .sort((firstTodo, secondTodo) => {
        const firstDate = firstTodo.completedAt ?? firstTodo.createdAt;
        const secondDate = secondTodo.completedAt ?? secondTodo.createdAt;

        return new Date(secondDate).getTime() - new Date(firstDate).getTime();
      })
      .filter((todo) => {
        const projectKey = todo.title.trim().toLowerCase();

        if (!projectKey || seenProjects.has(projectKey)) {
          return false;
        }

        seenProjects.add(projectKey);
        return true;
      })
      .slice(0, 6);
  }, [eisenhowerTodos, timerName]);
  const upcomingReviews = useMemo(
    () => {
      const today = toDateKey(new Date());

      return learningTopics
        .flatMap((topic) => getProjectedReviews(topic))
        .filter((review) => !review.isCompleted && review.date <= today)
        .sort((firstReview, secondReview) =>
          firstReview.date.localeCompare(secondReview.date),
        );
    },
    [learningTopics],
  );

  const resetFlow = useCallback((nextMessage?: string) => {
    clearActiveTimerSession();
    clearActiveFocusPrepSession();
    plasticityEndAtRef.current = null;
    recoveryEndAtRef.current = null;
    focusPrepEndAtRef.current = null;
    setPhase("plasticity");
    setSelectedActivity(null);
    setIsFocusPrepActive(false);
    setIsRunning(false);
    setIsRecoveryRunning(false);
    setRemainingSeconds(durationSeconds);
    setMessage(nextMessage ?? null);
    setMessageTone("praise");
    setShowSkipDialog(false);
    setShowRecoverySettings(false);
  }, [durationSeconds]);

  const beginRecovery = useCallback(() => {
    const nextActivity = getRandomActivity(allowedActivityOptions);

    if (!nextActivity) {
      setMessage("Waehle mindestens eine Aktivitaet aus.");
      setMessageTone("error");
      return;
    }

    setSelectedActivity(nextActivity);
    setPhase("recovery");
    setMessage(null);

    if (nextActivity.hasRecoveryTimer) {
      const endAt = Date.now() + nextActivity.defaultRecoverySeconds * 1000;
      setRecoveryDurationSeconds(nextActivity.defaultRecoverySeconds);
      setRecoveryRemainingSeconds(nextActivity.defaultRecoverySeconds);
      setRecoveryMinutes(String(Math.floor(nextActivity.defaultRecoverySeconds / 60)));
      setRecoverySeconds(String(nextActivity.defaultRecoverySeconds % 60));
      setIsRecoveryRunning(true);
      recoveryEndAtRef.current = endAt;
      saveActiveTimerSession({
        phase: "recovery",
        activityId: nextActivity.id,
        durationSeconds: nextActivity.defaultRecoverySeconds,
        endAt,
        timerName,
        taskId: activeTaskRef.current?.id ?? null,
        taskTitle: activeTaskRef.current?.title ?? null,
      });
    }
  }, [allowedActivityOptions, timerName]);

  const startPlasticityTimer = useCallback(
    (
      secondsToRun: number,
      name = timerName,
      task?: {
        id: string | null;
        title: string | null;
      },
    ) => {
      const endAt = Date.now() + secondsToRun * 1000;
      const nextTask = task ?? activeTaskRef.current;
      plasticityEndAtRef.current = endAt;
      saveActiveTimerSession({
        phase: "plasticity",
        durationSeconds: secondsToRun,
        endAt,
        timerName: name.trim() || "Plasticity",
        taskId: nextTask?.id ?? null,
        taskTitle: nextTask?.title ?? null,
      });
    },
    [timerName],
  );

  const startFocusPrep = useCallback(
    (sessionDurationSeconds: number, name = timerName) => {
      const nextPrepDurationSeconds = Math.max(1, focusPrepDurationSeconds);
      const nextTask = activeTaskRef.current;
      const endAt = Date.now() + nextPrepDurationSeconds * 1000;
      focusPrepEndAtRef.current = endAt;
      setFocusPrepRemainingSeconds(nextPrepDurationSeconds);
      setIsFocusPrepActive(true);
      setIsRunning(false);
      saveActiveFocusPrepSession({
        durationSeconds: nextPrepDurationSeconds,
        sessionDurationSeconds,
        endAt,
        timerName: name.trim() || "Plasticity",
        taskId: nextTask?.id ?? null,
        taskTitle: nextTask?.title ?? null,
      });
    },
    [focusPrepDurationSeconds, timerName],
  );

  const completeFocusPrep = useCallback(
    (prepSession?: ActiveFocusPrepSession | null) => {
      const sessionDurationSeconds =
        prepSession?.sessionDurationSeconds ?? durationSeconds;
      const nextTimerName = prepSession?.timerName ?? timerName;
      const nextTask = prepSession
        ? {
            id: prepSession.taskId,
            title: prepSession.taskTitle,
          }
        : activeTaskRef.current;

      activeTaskRef.current = nextTask;
      clearActiveFocusPrepSession();
      focusPrepEndAtRef.current = null;
      setIsFocusPrepActive(false);
      setDurationSeconds(sessionDurationSeconds);
      setRemainingSeconds(sessionDurationSeconds);
      setTimerName(nextTimerName);
      startPlasticityTimer(
        sessionDurationSeconds,
        nextTimerName,
        nextTask ?? undefined,
      );
      setIsRunning(true);
    },
    [durationSeconds, startPlasticityTimer, timerName],
  );

  useEffect(() => {
    let isMounted = true;

    async function loadSession() {
      const { isDemo, session, error } = await hasDemoOrSupabaseSession(() =>
        supabaseBrowser.auth.getSession(),
      );

      if (!isMounted) {
        return;
      }

      if (error || (!isDemo && !session)) {
        router.replace("/login");
        return;
      }

      setEisenhowerTodos(readEisenhowerTodos());
      setLearningTopics(readLearningTopics());
      const savedPlasticitySettings = readPlasticitySettings();
      const savedDefaultDurationSeconds =
        savedPlasticitySettings.defaultDurationSeconds;
      setDurationSeconds(savedDefaultDurationSeconds);
      setRemainingSeconds(savedDefaultDurationSeconds);
      setCustomMinutes(String(Math.round(savedDefaultDurationSeconds / 60)));
      setIsFocusPrepEnabled(savedPlasticitySettings.isFocusPrepEnabled);
      setIsReviewCalendarVisible(
        savedPlasticitySettings.isReviewCalendarVisible,
      );
      const savedFocusPrepSeconds = readFocusPrepDurationSeconds();
      setFocusPrepDurationSeconds(savedFocusPrepSeconds);
      setFocusPrepInputSeconds(String(savedFocusPrepSeconds));
      setIsLoading(false);
      const pendingFocusSession = consumePendingFocusSession();

      if (pendingFocusSession) {
        setTimerName(pendingFocusSession.taskTitle);
        activeTaskRef.current = {
          id: pendingFocusSession.taskId,
          title: pendingFocusSession.taskTitle,
        };
        setDurationSeconds(pendingFocusSession.seconds);
        setRemainingSeconds(pendingFocusSession.seconds);
        startFocusPrep(
          pendingFocusSession.seconds,
          pendingFocusSession.taskTitle,
        );
        setMessage(`Fokus gestartet: ${pendingFocusSession.taskTitle}`);
        setMessageTone("praise");
        return;
      }

      const activeFocusPrepSession = readActiveFocusPrepSession();

      if (activeFocusPrepSession) {
        const nextPrepRemainingSeconds = getRemainingSeconds(
          activeFocusPrepSession.endAt,
        );
        activeTaskRef.current = {
          id: activeFocusPrepSession.taskId,
          title: activeFocusPrepSession.taskTitle,
        };
        setDurationSeconds(activeFocusPrepSession.sessionDurationSeconds);
        setRemainingSeconds(activeFocusPrepSession.sessionDurationSeconds);
        setTimerName(activeFocusPrepSession.timerName);

        if (nextPrepRemainingSeconds > 0) {
          focusPrepEndAtRef.current = activeFocusPrepSession.endAt;
          setFocusPrepDurationSeconds(activeFocusPrepSession.durationSeconds);
          setFocusPrepInputSeconds(String(activeFocusPrepSession.durationSeconds));
          setFocusPrepRemainingSeconds(nextPrepRemainingSeconds);
          setIsFocusPrepActive(true);
          return;
        }

        completeFocusPrep(activeFocusPrepSession);
        return;
      }

      const activeTimerSession = readActiveTimerSession();

      if (!activeTimerSession) {
        return;
      }

      const nextRemainingSeconds = getRemainingSeconds(activeTimerSession.endAt);

      if (activeTimerSession.phase === "plasticity") {
        setDurationSeconds(activeTimerSession.durationSeconds);
        setTimerName(activeTimerSession.timerName ?? "Plasticity");
        activeTaskRef.current = {
          id: activeTimerSession.taskId ?? null,
          title: activeTimerSession.taskTitle ?? null,
        };

        if (nextRemainingSeconds > 0) {
          plasticityEndAtRef.current = activeTimerSession.endAt;
          setRemainingSeconds(nextRemainingSeconds);
          setIsRunning(true);
          return;
        }

        clearActiveTimerSession();
        await recordPlasticityStat(
          supabaseBrowser,
          "plasticity",
          activeTimerSession.durationSeconds,
          {
            id: activeTimerSession.taskId ?? null,
            title: activeTimerSession.taskTitle ?? null,
          },
        );
        setRemainingSeconds(0);
        beginRecovery();
        return;
      }

      const restoredActivity =
        ACTIVITIES.find(
          (activity) => activity.id === activeTimerSession.activityId,
        ) ?? null;

      if (!restoredActivity) {
        clearActiveTimerSession();
        return;
      }

      setPhase("recovery");
      setSelectedActivity(restoredActivity);
      setRecoveryDurationSeconds(activeTimerSession.durationSeconds);
      setRecoveryMinutes(String(Math.floor(activeTimerSession.durationSeconds / 60)));
      setRecoverySeconds(String(activeTimerSession.durationSeconds % 60));
      setTimerName(activeTimerSession.timerName ?? "Plasticity");
      activeTaskRef.current = {
        id: activeTimerSession.taskId ?? null,
        title: activeTimerSession.taskTitle ?? null,
      };

      if (nextRemainingSeconds > 0) {
        recoveryEndAtRef.current = activeTimerSession.endAt;
        setRecoveryRemainingSeconds(nextRemainingSeconds);
        setIsRecoveryRunning(true);
        return;
      }

      clearActiveTimerSession();
      await recordPlasticityStat(
        supabaseBrowser,
        restoredActivity.id,
        activeTimerSession.durationSeconds,
      );
      resetFlow(getRandomPraise());
    }

    loadSession();

    return () => {
      isMounted = false;
    };
  }, [beginRecovery, completeFocusPrep, resetFlow, router, startFocusPrep]);

  useEffect(() => {
    function syncCurrentTask() {
      const currentTask = readCurrentTask();

      if (!currentTask || isRunning || isFocusPrepActive || phase !== "plasticity") {
        return;
      }

      activeTaskRef.current = {
        id: currentTask.id,
        title: currentTask.title,
      };
      setTimerName(currentTask.title);
    }

    syncCurrentTask();
    window.addEventListener("storage", syncCurrentTask);
    window.addEventListener(CURRENT_TASK_CHANGED_EVENT, syncCurrentTask);

    return () => {
      window.removeEventListener("storage", syncCurrentTask);
      window.removeEventListener(CURRENT_TASK_CHANGED_EVENT, syncCurrentTask);
    };
  }, [isFocusPrepActive, isRunning, phase]);

  useEffect(() => {
    if (!isRunning) {
      return;
    }

    const timerId = window.setInterval(() => {
      const nextRemainingSeconds = getRemainingSeconds(plasticityEndAtRef.current);

      if (nextRemainingSeconds > 0) {
        setRemainingSeconds(nextRemainingSeconds);
        return;
      }

      setRemainingSeconds(0);
      setIsRunning(false);
      clearActiveTimerSession();
      plasticityEndAtRef.current = null;
      playPlasticityEndSound();
      void recordPlasticityStat(
        supabaseBrowser,
        "plasticity",
        durationSeconds,
        activeTaskRef.current ?? undefined,
      );
      beginRecovery();
    }, 1000);

    return () => window.clearInterval(timerId);
  }, [beginRecovery, durationSeconds, isRunning]);

  useEffect(() => {
    if (!isFocusPrepActive) {
      return;
    }

    const timerId = window.setInterval(() => {
      const nextPrepRemainingSeconds = getRemainingSeconds(
        focusPrepEndAtRef.current,
      );

      if (nextPrepRemainingSeconds > 0) {
        setFocusPrepRemainingSeconds(nextPrepRemainingSeconds);
        return;
      }

      setFocusPrepRemainingSeconds(0);
      completeFocusPrep(readActiveFocusPrepSession());
    }, 1000);

    return () => window.clearInterval(timerId);
  }, [completeFocusPrep, isFocusPrepActive]);

  useEffect(() => {
    if (!isFocusPrepActive) {
      return;
    }

    function handleFocusPrepSpacePress(event: KeyboardEvent) {
      if (event.code !== "Space" || isTypingTarget(event.target)) {
        return;
      }

      event.preventDefault();

      const now = Date.now();
      const isDoublePress =
        now - lastSpacePressRef.current < DOUBLE_SPACE_DELAY_MS;
      lastSpacePressRef.current = now;

      if (!isDoublePress) {
        return;
      }

      clearActiveFocusPrepSession();
      focusPrepEndAtRef.current = null;
      setIsFocusPrepActive(false);
      setFocusPrepRemainingSeconds(focusPrepDurationSeconds);
      setMessage(null);
    }

    window.addEventListener("keydown", handleFocusPrepSpacePress);

    return () => {
      window.removeEventListener("keydown", handleFocusPrepSpacePress);
    };
  }, [focusPrepDurationSeconds, isFocusPrepActive]);

  useEffect(() => {
    if (!isRecoveryRunning) {
      return;
    }

    const timerId = window.setInterval(() => {
      const nextRemainingSeconds = getRemainingSeconds(recoveryEndAtRef.current);

      if (nextRemainingSeconds > 0) {
        setRecoveryRemainingSeconds(nextRemainingSeconds);
        return;
      }

      setRecoveryRemainingSeconds(0);
      setIsRecoveryRunning(false);
      clearActiveTimerSession();
      recoveryEndAtRef.current = null;
      if (selectedActivity) {
        void recordPlasticityStat(
          supabaseBrowser,
          selectedActivity.id,
          recoveryDurationSeconds,
        );
      }
      resetFlow(getRandomPraise());
    }, 1000);

    return () => window.clearInterval(timerId);
  }, [isRecoveryRunning, recoveryDurationSeconds, resetFlow, selectedActivity]);

  useEffect(() => {
    if (!isRecoveryRunning || !selectedActivity) {
      return;
    }

    if (!recoveryEndAtRef.current) {
      const endAt = Date.now() + recoveryRemainingSeconds * 1000;
      recoveryEndAtRef.current = endAt;
      saveActiveTimerSession({
        phase: "recovery",
        activityId: selectedActivity.id,
        durationSeconds: recoveryDurationSeconds,
        endAt,
        timerName,
        taskId: activeTaskRef.current?.id ?? null,
        taskTitle: activeTaskRef.current?.title ?? null,
      });
    }
  }, [
    isRecoveryRunning,
    recoveryDurationSeconds,
    recoveryRemainingSeconds,
    selectedActivity,
    timerName,
  ]);

  useEffect(() => {
    if (isRunning && !plasticityEndAtRef.current) {
      startPlasticityTimer(remainingSeconds, timerName);
    }
  }, [isRunning, remainingSeconds, startPlasticityTimer, timerName]);

  useEffect(() => {
    if (phase !== "recovery" || !selectedActivity?.hasRecoveryTimer) {
      return;
    }

    function handleSpacePress(event: KeyboardEvent) {
      if (event.code !== "Space" || isTypingTarget(event.target)) {
        return;
      }

      event.preventDefault();

      const now = Date.now();
      const isDoublePress = now - lastSpacePressRef.current < DOUBLE_SPACE_DELAY_MS;
      lastSpacePressRef.current = now;

      if (isDoublePress) {
        if (spacePressTimerRef.current) {
          window.clearTimeout(spacePressTimerRef.current);
          spacePressTimerRef.current = null;
        }

        setRecoveryRemainingSeconds(
          getRemainingSeconds(recoveryEndAtRef.current) ||
            recoveryRemainingSeconds,
        );
        clearActiveTimerSession();
        recoveryEndAtRef.current = null;
        setIsRecoveryRunning(false);
        setShowSkipDialog(true);
        return;
      }

      spacePressTimerRef.current = window.setTimeout(() => {
        if (isRecoveryRunning) {
          const nextRemainingSeconds = getRemainingSeconds(
            recoveryEndAtRef.current,
          );
          setRecoveryRemainingSeconds(
            nextRemainingSeconds || recoveryRemainingSeconds,
          );
          clearActiveTimerSession();
          recoveryEndAtRef.current = null;
          setIsRecoveryRunning(false);
        } else {
          const endAt = Date.now() + recoveryRemainingSeconds * 1000;
          recoveryEndAtRef.current = endAt;

          if (selectedActivity) {
            saveActiveTimerSession({
              phase: "recovery",
              activityId: selectedActivity.id,
              durationSeconds: recoveryDurationSeconds,
              endAt,
              timerName,
              taskId: activeTaskRef.current?.id ?? null,
              taskTitle: activeTaskRef.current?.title ?? null,
            });
          }

          setIsRecoveryRunning(true);
        }
        spacePressTimerRef.current = null;
      }, DOUBLE_SPACE_DELAY_MS);
    }

    window.addEventListener("keydown", handleSpacePress);

    return () => {
      window.removeEventListener("keydown", handleSpacePress);

      if (spacePressTimerRef.current) {
        window.clearTimeout(spacePressTimerRef.current);
        spacePressTimerRef.current = null;
      }
    };
  }, [
    isRecoveryRunning,
    phase,
    recoveryDurationSeconds,
    recoveryRemainingSeconds,
    selectedActivity,
    timerName,
  ]);

  useEffect(() => {
    if (!message || messageTone !== "praise") {
      return;
    }

    const timerId = window.setTimeout(() => {
      setMessage(null);
    }, 3000);

    return () => window.clearTimeout(timerId);
  }, [message, messageTone]);

  useEffect(() => {
    if (!showSettings) {
      return;
    }

    function handleSettingsEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setShowSettings(false);
      }
    }

    window.addEventListener("keydown", handleSettingsEscape);

    return () => {
      window.removeEventListener("keydown", handleSettingsEscape);
    };
  }, [showSettings]);

  useEffect(() => {
    if (!showRecoverySettings) {
      return;
    }

    function handleRecoverySettingsEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setShowRecoverySettings(false);
      }
    }

    window.addEventListener("keydown", handleRecoverySettingsEscape);

    return () => {
      window.removeEventListener("keydown", handleRecoverySettingsEscape);
    };
  }, [showRecoverySettings]);

  function updateTimerName(nextName: string) {
    setTimerName(nextName);
    activeTaskRef.current = nextName.trim()
      ? {
          id: null,
          title: nextName.trim(),
        }
      : null;

    const activeTimerSession = readActiveTimerSession();

    if (!activeTimerSession) {
      return;
    }

    saveActiveTimerSession({
      ...activeTimerSession,
      timerName: nextName.trim() || "Plasticity",
      taskId: activeTaskRef.current?.id ?? null,
      taskTitle: activeTaskRef.current?.title ?? null,
    });
  }

  function selectProject(todo: EisenhowerTodo) {
    activeTaskRef.current = {
      id: todo.id,
      title: todo.title,
    };
    setTimerName(todo.title);
    setShowProjectSuggestions(false);
    setShowSettingsProjectSuggestions(false);
    setMessage(null);
  }

  function selectReviewProject(review: ProjectedReview) {
    activeTaskRef.current = {
      id: review.topicId,
      title: review.topicTitle,
    };
    setTimerName(review.topicTitle);
    setMessage(null);
  }

  function selectDuration(secondsToSelect: number) {
    clearActiveTimerSession();
    clearActiveFocusPrepSession();
    plasticityEndAtRef.current = null;
    focusPrepEndAtRef.current = null;
    setDurationSeconds(secondsToSelect);
    setRemainingSeconds(secondsToSelect);
    setIsFocusPrepActive(false);
    setIsRunning(false);
    setMessage(null);
  }

  function selectPresetDuration(secondsToSelect: number) {
    selectDuration(secondsToSelect);
    savePlasticitySettings({
      defaultDurationSeconds: secondsToSelect,
      isFocusPrepEnabled,
      isReviewCalendarVisible,
    });
    setCustomMinutes(String(Math.floor(secondsToSelect / 60)));
  }

  function applyCustomDuration() {
    const nextDurationSeconds = Math.min(
      MAX_DURATION_SECONDS,
      Math.max(5 * 60, Number(customMinutes) * 60),
    );

    selectDuration(nextDurationSeconds);
    savePlasticitySettings({
      defaultDurationSeconds: nextDurationSeconds,
      isFocusPrepEnabled,
      isReviewCalendarVisible,
    });
    setCustomMinutes(String(Math.floor(nextDurationSeconds / 60)));
  }

  function applyFocusPrepDuration() {
    const nextDurationSeconds = Math.min(
      MAX_DURATION_SECONDS,
      Math.max(1, Number(focusPrepInputSeconds)),
    );

    if (!Number.isFinite(nextDurationSeconds)) {
      setFocusPrepDurationSeconds(60);
      setFocusPrepInputSeconds("60");
      saveFocusPrepDurationSeconds(60);
      return;
    }

    setFocusPrepDurationSeconds(nextDurationSeconds);
    setFocusPrepInputSeconds(String(nextDurationSeconds));
    saveFocusPrepDurationSeconds(nextDurationSeconds);
  }

  function applyRecoveryDuration() {
    setRecoveryDuration(getClampedSeconds(recoveryMinutes, recoverySeconds));
    setShowRecoverySettings(false);
  }

  function setRecoveryDuration(secondsToSelect: number) {
    const nextDurationSeconds = Math.min(
      MAX_DURATION_SECONDS,
      Math.max(1, secondsToSelect),
    );

    setRecoveryDurationSeconds(nextDurationSeconds);
    setRecoveryRemainingSeconds(nextDurationSeconds);
    clearActiveTimerSession();
    setMessage(null);

    if (phase === "recovery" && selectedActivity?.hasRecoveryTimer) {
      const endAt = Date.now() + nextDurationSeconds * 1000;
      recoveryEndAtRef.current = endAt;
      saveActiveTimerSession({
        phase: "recovery",
        activityId: selectedActivity.id,
        durationSeconds: nextDurationSeconds,
        endAt,
        timerName,
        taskId: activeTaskRef.current?.id ?? null,
        taskTitle: activeTaskRef.current?.title ?? null,
      });
      setIsRecoveryRunning(true);
      return;
    }

    recoveryEndAtRef.current = null;
    setIsRecoveryRunning(false);
    setMessage(null);
  }

  function toggleActivity(activityId: ActivityId) {
    setAllowedActivities((currentActivities) => ({
      ...currentActivities,
      [activityId]: !currentActivities[activityId],
    }));
    setMessage(null);
  }

  function toggleFocusPrepEnabled() {
    setIsFocusPrepEnabled((currentValue) => {
      const nextValue = !currentValue;
      savePlasticitySettings({
        defaultDurationSeconds: durationSeconds,
        isFocusPrepEnabled: nextValue,
        isReviewCalendarVisible,
      });
      return nextValue;
    });
  }

  function toggleReviewCalendarVisible() {
    setIsReviewCalendarVisible((currentValue) => {
      const nextValue = !currentValue;
      savePlasticitySettings({
        defaultDurationSeconds: durationSeconds,
        isFocusPrepEnabled,
        isReviewCalendarVisible: nextValue,
      });
      return nextValue;
    });
  }

  function startTimer() {
    if (selectedActivityCount === 0) {
      setMessage("Waehle mindestens eine Aktivitaet aus.");
      setMessageTone("error");
      return;
    }

    const trimmedTimerName = timerName.trim() || "Plasticity";
    activeTaskRef.current = activeTaskRef.current ?? {
      id: null,
      title: trimmedTimerName,
    };

    setMessage(null);
    setMessageTone("praise");

    if (isFocusPrepEnabled) {
      startFocusPrep(durationSeconds, trimmedTimerName);
      return;
    }

    setIsRunning(true);
  }

  function pauseTimer() {
    const nextRemainingSeconds = getRemainingSeconds(plasticityEndAtRef.current);
    setRemainingSeconds(nextRemainingSeconds || remainingSeconds);
    clearActiveTimerSession();
    plasticityEndAtRef.current = null;
    setIsRunning(false);
  }

  function resetTimer() {
    clearActiveTimerSession();
    clearActiveFocusPrepSession();
    plasticityEndAtRef.current = null;
    focusPrepEndAtRef.current = null;
    setIsFocusPrepActive(false);
    setIsRunning(false);
    setRemainingSeconds(durationSeconds);
    setMessage(null);
  }

  function skipRecovery() {
    setIsRecoveryRunning(false);
    setShowSkipDialog(false);
    resetFlow("Alles gut. Du bist wieder bereit fuer die naechste Runde.");
  }

  if (isLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-zinc-50 px-4 text-zinc-950">
        <p className="text-sm font-medium text-zinc-600">
          Session wird geprueft...
        </p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-zinc-50 px-4 py-10 text-zinc-950">
      <section className="mx-auto w-full max-w-3xl">
        <AppHeader title="Plasticity" />

        {isFocusPrepActive && (
          <div className="fixed inset-0 z-40 flex flex-col items-center justify-center bg-zinc-50 px-4 text-zinc-950">
            <p className="absolute right-5 top-5 text-sm font-medium tabular-nums text-zinc-300">
              {formatSeconds(focusPrepRemainingSeconds)}
            </p>
            <div className="h-20 w-20 rounded-full bg-black sm:h-26 sm:w-26" />
          </div>
        )}

        {phase === "plasticity" && (
          <>
            {message && (
              <div
                className={`mb-4 rounded-lg border p-4 ${
                  messageTone === "praise"
                    ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                    : "border-red-200 bg-red-50 text-red-700"
                }`}
              >
                <p className="text-xs font-semibold uppercase tracking-[0.16em]">
                  Lob
                </p>
                <p className="mt-2 text-sm font-medium">{message}</p>
              </div>
            )}

            <div className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500">
                  Haupttimer
                </p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    aria-label={
                      isFocusPrepEnabled
                        ? "Priming deaktivieren"
                        : "Priming aktivieren"
                    }
                    title={
                      isFocusPrepEnabled
                        ? "Priming aktiv"
                        : "Priming deaktiviert"
                    }
                    onClick={toggleFocusPrepEnabled}
                    className={`flex h-9 w-9 items-center justify-center rounded-md border bg-white transition ${
                      isFocusPrepEnabled
                        ? "border-zinc-950 text-zinc-950"
                        : "border-zinc-300 text-zinc-500 hover:border-zinc-950"
                    }`}
                  >
                    {isFocusPrepEnabled ? (
                      <CircleIcon />
                    ) : (
                      <CircleOffIcon />
                    )}
                  </button>
                  <button
                    type="button"
                    aria-label={
                      mainView === "timer"
                        ? "Matrix anzeigen"
                        : "Matrix ausblenden"
                    }
                    title={
                      mainView === "timer"
                        ? "Matrix anzeigen"
                        : "Matrix ausblenden"
                    }
                    onClick={() =>
                      setMainView(mainView === "timer" ? "eisenhower" : "timer")
                    }
                    className="flex h-9 w-9 items-center justify-center rounded-md border border-zinc-300 bg-white text-zinc-900 transition hover:border-zinc-950"
                  >
                    {mainView === "timer" ? <MatrixIcon /> : <TimerIcon />}
                  </button>
                  <button
                    type="button"
                    aria-label="Einstellungen oeffnen"
                    title="Einstellungen"
                    onClick={() => setShowSettings(true)}
                    className="flex h-9 w-9 items-center justify-center rounded-md border border-zinc-300 bg-white text-zinc-900 transition hover:border-zinc-950"
                  >
                    <SettingsIcon />
                  </button>
                </div>
              </div>

              <div className="relative mt-5">
                <label className="block text-sm font-medium text-zinc-700">
                  Projekt
                  <input
                    value={timerName}
                    onChange={(event) => {
                      updateTimerName(event.target.value);
                      setShowProjectSuggestions(true);
                    }}
                    onFocus={() => setShowProjectSuggestions(true)}
                    onBlur={() => {
                      window.setTimeout(() => {
                        setShowProjectSuggestions(false);
                      }, 120);
                    }}
                    placeholder="Projekt suchen oder benennen"
                    className="mt-2 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-base outline-none transition focus:border-zinc-950"
                  />
                </label>

                {showProjectSuggestions && projectSuggestions.length > 0 && (
                  <div className="absolute left-0 right-0 top-full z-20 mt-2 overflow-hidden rounded-md border border-zinc-200 bg-white shadow-lg">
                    {projectSuggestions.map((todo) => (
                      <button
                        key={todo.id}
                        type="button"
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={() => selectProject(todo)}
                        className="flex w-full items-center justify-between gap-3 border-b border-zinc-100 px-3 py-2 text-left text-sm transition last:border-b-0 hover:bg-zinc-50"
                      >
                        <span className="truncate font-medium text-zinc-900">
                          {todo.title}
                        </span>
                        <span
                          className={`shrink-0 rounded px-2 py-1 text-xs font-semibold ${getMiniTypeBadgeClass(
                            todo.color,
                          )}`}
                        >
                          {todo.itemType}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {isReviewCalendarVisible && (
                <PlasticityReviewCalendarPreview
                  reviews={upcomingReviews}
                  selectedProjectTitle={timerName}
                  onSelectReview={selectReviewProject}
                />
              )}

              <div className="mt-5 rounded-lg border border-zinc-100 bg-zinc-50 px-4 py-8 text-center">
                <p className="text-6xl font-semibold tabular-nums tracking-tight text-zinc-950 sm:text-7xl">
                  {formattedTime}
                </p>
              </div>

              <div className="mt-5 flex items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={isRunning ? pauseTimer : startTimer}
                  disabled={selectedActivityCount === 0}
                  className="flex h-10 min-w-32 items-center justify-center rounded-md bg-zinc-950 px-5 text-sm font-semibold text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:bg-zinc-400"
                >
                  {isRunning ? "Pause" : "Start"}
                </button>
                <button
                  type="button"
                  aria-label="Timer zuruecksetzen"
                  title="Reset"
                  onClick={resetTimer}
                  className="flex h-10 w-10 items-center justify-center rounded-md border border-zinc-300 bg-white text-zinc-900 transition hover:border-zinc-950"
                >
                  <ResetIcon />
                </button>
              </div>

              {mainView === "eisenhower" && (
                <div className="mt-5 rounded-lg border border-zinc-200 bg-zinc-50 p-3">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500">
                      Eisenhower Mini
                    </p>
                    <p className="text-sm font-semibold tabular-nums text-zinc-900">
                      {formattedTime}
                    </p>
                  </div>

                  <div className="overflow-hidden rounded-md border border-zinc-200 bg-white">
                    <div className="grid grid-cols-1 sm:grid-cols-2">
                      {MINI_QUADRANTS.map((quadrant) => {
                        const quadrantTodos = activeEisenhowerTodos.filter(
                          (todo) => todo.quadrant === quadrant.id,
                        );
                        const borderClass =
                          quadrant.id === "urgent-important"
                            ? "border-b border-zinc-200 sm:border-r"
                            : quadrant.id === "not-urgent-important"
                              ? "border-b border-zinc-200"
                              : quadrant.id === "urgent-not-important"
                                ? "border-b border-zinc-200 sm:border-r sm:border-b-0"
                                : "";

                        return (
                          <div
                            key={quadrant.id}
                            className={`min-h-28 p-3 ${borderClass}`}
                          >
                            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-500">
                              {quadrant.title}
                            </p>
                            <div className="mt-2 space-y-1">
                              {quadrantTodos.slice(0, 3).map((todo) => (
                                <button
                                  key={todo.id}
                                  type="button"
                                  onClick={() => selectProject(todo)}
                                  className={`block w-full truncate rounded border px-2 py-1 text-left text-xs font-medium transition ${
                                    timerName.trim() === todo.title
                                      ? "border-zinc-950 bg-zinc-950 text-white"
                                      : getMiniTodoColorClass(todo.color)
                                  }`}
                                  title={getMiniTodoTooltip(todo)}
                                >
                                  {todo.title} · {todo.itemType}
                                </button>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </>
        )}

        {phase === "recovery" && selectedActivity && (
          <div className="rounded-lg border border-zinc-200 bg-white p-6 shadow-sm">
            <div className="flex items-start justify-between gap-4">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700">
                Recovery
              </p>
              {selectedActivity.hasRecoveryTimer && (
                <button
                  type="button"
                  aria-label="Recovery-Einstellungen oeffnen"
                  title="Recovery-Einstellungen"
                  onClick={() => setShowRecoverySettings(true)}
                  className="flex h-9 w-9 items-center justify-center rounded-md border border-zinc-300 bg-white text-zinc-900 transition hover:border-zinc-950"
                >
                  <SettingsIcon />
                </button>
              )}
            </div>
            <h2 className="mt-3 text-2xl font-semibold tracking-tight">
              {selectedActivity.prompt}
            </h2>

            {selectedActivity.hasRecoveryTimer ? (
              <>
                <p className="mt-8 text-center text-6xl font-semibold tabular-nums tracking-tight">
                  {formattedRecoveryTime}
                </p>
                <p className="mt-4 text-center text-sm font-medium text-zinc-500">
                  {isRecoveryRunning ? "Laeuft" : "Pausiert"}
                </p>
              </>
            ) : (
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <button
                  type="button"
                  onClick={() => {
                    resetFlow(getRandomPraise());
                  }}
                  className="flex h-11 flex-1 items-center justify-center rounded-md bg-zinc-950 px-4 text-sm font-semibold text-white transition hover:bg-zinc-800"
                >
                  Abschliessen
                </button>
                <button
                  type="button"
                  onClick={() => setShowSkipDialog(true)}
                  className="flex h-11 flex-1 items-center justify-center rounded-md border border-zinc-300 bg-white px-4 text-sm font-semibold text-zinc-900 transition hover:border-zinc-950"
                >
                  Ueberspringen
                </button>
              </div>
            )}
          </div>
        )}

      </section>

      {showSettings && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setShowSettings(false);
            }
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-lg bg-white p-6 text-zinc-950 shadow-xl"
          >
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-xl font-semibold tracking-tight">
                Einstellungen
              </h2>
              <button
                type="button"
                aria-label="Einstellungen schliessen"
                title="Schliessen"
                onClick={() => setShowSettings(false)}
                className="flex h-9 w-9 items-center justify-center rounded-md border border-zinc-300 bg-white text-zinc-900 transition hover:border-zinc-950"
              >
                <CloseIcon />
              </button>
            </div>

            <div className="mt-6">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500">
                Projekt
              </p>
              <div className="relative mt-3">
                <input
                  value={timerName}
                  onChange={(event) => {
                    updateTimerName(event.target.value);
                    setShowSettingsProjectSuggestions(true);
                  }}
                  onFocus={() => setShowSettingsProjectSuggestions(true)}
                  onBlur={() => {
                    window.setTimeout(() => {
                      setShowSettingsProjectSuggestions(false);
                    }, 120);
                  }}
                  placeholder="Projekt suchen oder benennen"
                  className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-base outline-none transition focus:border-zinc-950"
                />

                {showSettingsProjectSuggestions &&
                  projectSuggestions.length > 0 && (
                    <div className="absolute left-0 right-0 top-full z-20 mt-2 overflow-hidden rounded-md border border-zinc-200 bg-white shadow-lg">
                      {projectSuggestions.map((todo) => (
                        <button
                          key={todo.id}
                          type="button"
                          onMouseDown={(event) => event.preventDefault()}
                          onClick={() => selectProject(todo)}
                          className="flex w-full items-center justify-between gap-3 border-b border-zinc-100 px-3 py-2 text-left text-sm transition last:border-b-0 hover:bg-zinc-50"
                        >
                          <span className="truncate font-medium text-zinc-900">
                            {todo.title}
                          </span>
                          <span
                            className={`shrink-0 rounded px-2 py-1 text-xs font-semibold ${getMiniTypeBadgeClass(
                              todo.color,
                            )}`}
                          >
                            {todo.itemType}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
              </div>
            </div>

            <div className="mt-6 rounded-md border border-zinc-200 bg-zinc-50 p-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500">
                    Spaced Repetition
                  </p>
                  <p className="mt-1 text-sm font-medium text-zinc-700">
                    Kalender im Haupttimer anzeigen
                  </p>
                </div>
                <button
                  type="button"
                  aria-pressed={isReviewCalendarVisible}
                  onClick={toggleReviewCalendarVisible}
                  className={`relative h-7 w-12 rounded-full transition ${
                    isReviewCalendarVisible ? "bg-zinc-950" : "bg-zinc-300"
                  }`}
                >
                  <span
                    className={`absolute top-1 h-5 w-5 rounded-full bg-white transition ${
                      isReviewCalendarVisible ? "left-6" : "left-1"
                    }`}
                  />
                </button>
              </div>
            </div>

            <div className="mt-6">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500">
                Timer-Presets
              </p>
              <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-6">
                {TIMER_OPTIONS.map((option) => (
                  <button
                    key={option.label}
                    type="button"
                    onClick={() => {
                      selectPresetDuration(option.seconds);
                    }}
                    className={`h-10 rounded-md border px-3 text-sm font-semibold transition ${
                      durationSeconds === option.seconds
                        ? "border-zinc-950 bg-zinc-950 text-white"
                        : "border-zinc-300 bg-white text-zinc-900 hover:border-zinc-950"
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-6 rounded-md border border-zinc-200 bg-zinc-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500">
                Custom-Zeit
              </p>
              <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
                <label className="block text-sm font-medium text-zinc-700">
                  Minuten: {customMinutes}
                  <input
                    type="range"
                    min={5}
                    max={120}
                    step={5}
                    value={customMinutes}
                    onChange={(event) => setCustomMinutes(event.target.value)}
                    className="mt-3 w-full accent-zinc-950"
                  />
                </label>

                <button
                  type="button"
                  onClick={applyCustomDuration}
                  className="flex h-11 items-center justify-center rounded-md border border-zinc-300 bg-white px-4 text-sm font-semibold text-zinc-900 transition hover:border-zinc-950"
                >
                  Uebernehmen
                </button>
              </div>
            </div>

            <div className="mt-6 rounded-md border border-zinc-200 bg-zinc-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500">
                Priming
              </p>
              <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
                <label className="block text-sm font-medium text-zinc-700">
                  Sekunden: {focusPrepInputSeconds}
                  <input
                    type="range"
                    min={15}
                    max={60}
                    step={15}
                    value={focusPrepInputSeconds}
                    onChange={(event) =>
                      setFocusPrepInputSeconds(event.target.value)
                    }
                    className="mt-3 w-full accent-zinc-950"
                  />
                </label>

                <button
                  type="button"
                  onClick={applyFocusPrepDuration}
                  className="flex h-11 items-center justify-center rounded-md border border-zinc-300 bg-white px-4 text-sm font-semibold text-zinc-900 transition hover:border-zinc-950"
                >
                  Uebernehmen
                </button>
              </div>
            </div>

            <div className="mt-6">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500">
                Recovery Tools
              </p>

              <div className="mt-3 grid grid-cols-3 gap-3">
                {ACTIVITIES.map((activity) => (
                  <button
                    key={activity.id}
                    type="button"
                    aria-label={activity.label}
                    title={activity.label}
                    onClick={() => toggleActivity(activity.id)}
                    className={`flex h-20 items-center justify-center rounded-md border transition ${
                      allowedActivities[activity.id]
                        ? "border-zinc-950 bg-white text-zinc-950"
                        : "border-zinc-200 bg-zinc-100 text-zinc-400 hover:border-zinc-400"
                    }`}
                  >
                    {activity.id === "yoga-nidra" && <YogaNidraIcon />}
                    {activity.id === "meditation" && <MeditationIcon />}
                    {activity.id === "walk" && <NatureWalkIcon />}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {showRecoverySettings && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setShowRecoverySettings(false);
            }
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            className="w-full max-w-md rounded-lg bg-white p-6 text-zinc-950 shadow-xl"
          >
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-xl font-semibold tracking-tight">
                Recovery-Timer
              </h2>
              <button
                type="button"
                aria-label="Recovery-Einstellungen schliessen"
                title="Schliessen"
                onClick={() => setShowRecoverySettings(false)}
                className="flex h-9 w-9 items-center justify-center rounded-md border border-zinc-300 bg-white text-zinc-900 transition hover:border-zinc-950"
              >
                <CloseIcon />
              </button>
            </div>

            <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
              <label className="block text-sm font-medium text-zinc-700">
                Minuten
                <input
                  type="number"
                  min={0}
                  max={120}
                  value={recoveryMinutes}
                  onChange={(event) => setRecoveryMinutes(event.target.value)}
                  className="mt-2 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-base outline-none transition focus:border-zinc-950"
                />
              </label>

              <label className="block text-sm font-medium text-zinc-700">
                Sekunden
                <input
                  type="number"
                  min={0}
                  max={59}
                  value={recoverySeconds}
                  onChange={(event) => setRecoverySeconds(event.target.value)}
                  className="mt-2 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-base outline-none transition focus:border-zinc-950"
                />
              </label>

              <button
                type="button"
                onClick={applyRecoveryDuration}
                className="flex h-11 items-center justify-center rounded-md border border-zinc-300 bg-white px-4 text-sm font-semibold text-zinc-900 transition hover:border-zinc-950"
              >
                Uebernehmen
              </button>
            </div>
          </div>
        </div>
      )}

      {showSkipDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div
            role="dialog"
            aria-modal="true"
            className="w-full max-w-sm rounded-lg bg-white p-6 text-zinc-950 shadow-xl"
          >
            <h2 className="text-xl font-semibold tracking-tight">
              Wirklich ueberspringen?
            </h2>
            <p className="mt-3 text-sm text-zinc-600">
              Die aktuelle Recovery wird beendet.
            </p>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={() => setShowSkipDialog(false)}
                className="flex h-10 flex-1 items-center justify-center rounded-md border border-zinc-300 bg-white px-4 text-sm font-semibold text-zinc-900 transition hover:border-zinc-950"
              >
                Nein
              </button>
              <button
                type="button"
                onClick={skipRecovery}
                className="flex h-10 flex-1 items-center justify-center rounded-md bg-zinc-950 px-4 text-sm font-semibold text-white transition hover:bg-zinc-800"
              >
                Ja
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

function PlasticityReviewCalendarPreview({
  reviews,
  selectedProjectTitle,
  onSelectReview,
}: {
  reviews: ProjectedReview[];
  selectedProjectTitle: string;
  onSelectReview: (review: ProjectedReview) => void;
}) {
  return (
    <div className="mt-5 rounded-lg border border-zinc-200 bg-zinc-50 p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500">
          Spaced Repetition
        </p>
        <span className="text-xs font-semibold text-zinc-500">
          {reviews.length} Reviews
        </span>
      </div>

      {reviews.length === 0 ? (
        <p className="mt-3 text-sm text-zinc-600">
          Heute sind keine Reviews faellig.
        </p>
      ) : (
        <div className="mt-3 grid gap-2">
          {reviews.map((review) => (
            <button
              key={`${review.topicId}-${review.sequence}-${review.date}`}
              type="button"
              onClick={() => onSelectReview(review)}
              className={`grid grid-cols-[88px_1fr_auto] items-center gap-3 rounded-md border px-3 py-2 text-left text-sm transition ${
                selectedProjectTitle.trim() === review.topicTitle
                  ? "border-zinc-950 bg-zinc-950 text-white"
                  : "border-zinc-200 bg-white hover:border-zinc-300"
              }`}
            >
              <span
                className={`font-semibold tabular-nums ${
                  selectedProjectTitle.trim() === review.topicTitle
                    ? "text-zinc-100"
                    : "text-zinc-600"
                }`}
              >
                {formatReviewDate(review.date)}
              </span>
              <span className="truncate font-medium">
                {review.topicTitle}
              </span>
              <span className="rounded bg-sky-100 px-2 py-1 text-xs font-semibold text-sky-800">
                {review.sequence}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function getClampedSeconds(minutes: string, seconds: string) {
  const minutesValue = Number(minutes);
  const secondsValue = Number(seconds);
  const nextDurationSeconds = minutesValue * 60 + secondsValue;

  if (!Number.isFinite(nextDurationSeconds)) {
    return 1;
  }

  return Math.min(MAX_DURATION_SECONDS, Math.max(1, nextDurationSeconds));
}

function getRandomActivity(activities: Activity[]) {
  if (activities.length === 0) {
    return null;
  }

  return activities[Math.floor(Math.random() * activities.length)];
}

function getRandomPraise() {
  return PRAISE_MESSAGES[Math.floor(Math.random() * PRAISE_MESSAGES.length)];
}

function formatSeconds(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(
    2,
    "0",
  )}`;
}

function formatReviewDate(date: string) {
  return new Date(`${date}T00:00:00`).toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
  });
}

function getMiniTodoTooltip(todo: EisenhowerTodo) {
  const subtasks = todo.subtasks
    .slice(0, 4)
    .map((subtask) => `${subtask.isDone ? "[x]" : "[ ]"} ${subtask.title}`)
    .join("\n");

  return [todo.description, subtasks].filter(Boolean).join("\n\n");
}

function getMiniTodoColorClass(color: EisenhowerTodo["color"]) {
  if (color === "sky") {
    return "border-sky-200 bg-sky-50 text-sky-950 hover:border-sky-400";
  }

  if (color === "emerald") {
    return "border-emerald-200 bg-emerald-50 text-emerald-950 hover:border-emerald-400";
  }

  if (color === "amber") {
    return "border-amber-200 bg-amber-50 text-amber-950 hover:border-amber-400";
  }

  if (color === "rose") {
    return "border-rose-200 bg-rose-50 text-rose-950 hover:border-rose-400";
  }

  if (color === "violet") {
    return "border-violet-200 bg-violet-50 text-violet-950 hover:border-violet-400";
  }

  return "border-zinc-100 bg-zinc-50 text-zinc-800 hover:border-zinc-300";
}

function getMiniTypeBadgeClass(color: EisenhowerTodo["color"]) {
  if (color === "sky") {
    return "bg-sky-100 text-sky-800";
  }

  if (color === "emerald") {
    return "bg-emerald-100 text-emerald-800";
  }

  if (color === "amber") {
    return "bg-amber-100 text-amber-800";
  }

  if (color === "rose") {
    return "bg-rose-100 text-rose-800";
  }

  if (color === "violet") {
    return "bg-violet-100 text-violet-800";
  }

  return "bg-zinc-100 text-zinc-700";
}

function toDateKey(date: Date) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

function isTypingTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  return ["INPUT", "TEXTAREA", "SELECT", "BUTTON"].includes(target.tagName);
}

function getRemainingSeconds(endAt: number | null) {
  if (!endAt) {
    return 0;
  }

  return Math.max(0, Math.ceil((endAt - Date.now()) / 1000));
}

function playPlasticityEndSound() {
  if (typeof window === "undefined") {
    return;
  }

  const audio = new Audio(PLASTICITY_END_SOUND_PATH);
  audio.volume = 0.75;
  void audio.play().catch(() => {
    // Browsers may block audio if the timer was restored without a user gesture.
  });
}

function readActiveTimerSession() {
  if (typeof window === "undefined") {
    return null;
  }

  const rawSession = window.localStorage.getItem(
    getScopedStorageKey(ACTIVE_TIMER_STORAGE_KEY),
  );

  if (!rawSession) {
    return null;
  }

  try {
    const parsedSession = JSON.parse(rawSession);
    return isActiveTimerSession(parsedSession) ? parsedSession : null;
  } catch {
    return null;
  }
}

function saveActiveTimerSession(session: ActiveTimerSession) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(
    getScopedStorageKey(ACTIVE_TIMER_STORAGE_KEY),
    JSON.stringify(session),
  );
}

function clearActiveTimerSession() {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(getScopedStorageKey(ACTIVE_TIMER_STORAGE_KEY));
}

type PlasticitySettings = {
  defaultDurationSeconds: number;
  isFocusPrepEnabled: boolean;
  isReviewCalendarVisible: boolean;
};

function readPlasticitySettings(): PlasticitySettings {
  if (typeof window === "undefined") {
    return {
      defaultDurationSeconds: 30 * 60,
      isFocusPrepEnabled: true,
      isReviewCalendarVisible: false,
    };
  }

  const rawSettings = window.localStorage.getItem(
    getScopedStorageKey(PLASTICITY_SETTINGS_STORAGE_KEY),
  );

  if (!rawSettings) {
    return {
      defaultDurationSeconds: 30 * 60,
      isFocusPrepEnabled: true,
      isReviewCalendarVisible: false,
    };
  }

  try {
    const parsedSettings = JSON.parse(rawSettings);
    const durationSeconds = parsedSettings?.defaultDurationSeconds;
    const isFocusPrepEnabled = parsedSettings?.isFocusPrepEnabled;
    const isReviewCalendarVisible = parsedSettings?.isReviewCalendarVisible;

    return {
      defaultDurationSeconds:
        typeof durationSeconds === "number" && Number.isFinite(durationSeconds)
          ? Math.min(MAX_DURATION_SECONDS, Math.max(1, durationSeconds))
          : 30 * 60,
      isFocusPrepEnabled:
        typeof isFocusPrepEnabled === "boolean" ? isFocusPrepEnabled : true,
      isReviewCalendarVisible:
        typeof isReviewCalendarVisible === "boolean"
          ? isReviewCalendarVisible
          : false,
    };
  } catch {
    return {
      defaultDurationSeconds: 30 * 60,
      isFocusPrepEnabled: true,
      isReviewCalendarVisible: false,
    };
  }
}

function savePlasticitySettings(settings: PlasticitySettings) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(
    getScopedStorageKey(PLASTICITY_SETTINGS_STORAGE_KEY),
    JSON.stringify({
      defaultDurationSeconds: Math.min(
        MAX_DURATION_SECONDS,
        Math.max(1, settings.defaultDurationSeconds),
      ),
      isFocusPrepEnabled: settings.isFocusPrepEnabled,
      isReviewCalendarVisible: settings.isReviewCalendarVisible,
    }),
  );
}

function readFocusPrepDurationSeconds() {
  if (typeof window === "undefined") {
    return 45;
  }

  const rawSettings = window.localStorage.getItem(
    getScopedStorageKey(FOCUS_PREP_SETTINGS_STORAGE_KEY),
  );

  if (!rawSettings) {
    return 45;
  }

  try {
    const parsedSettings = JSON.parse(rawSettings);
    const durationSeconds = parsedSettings?.durationSeconds;

    if (
      typeof durationSeconds !== "number" ||
      !Number.isFinite(durationSeconds)
    ) {
      return 45;
    }

    return Math.min(MAX_DURATION_SECONDS, Math.max(1, durationSeconds));
  } catch {
    return 45;
  }
}

function saveFocusPrepDurationSeconds(durationSeconds: number) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(
    getScopedStorageKey(FOCUS_PREP_SETTINGS_STORAGE_KEY),
    JSON.stringify({
      durationSeconds: Math.min(
        MAX_DURATION_SECONDS,
        Math.max(1, durationSeconds),
      ),
    }),
  );
}

function readActiveFocusPrepSession() {
  if (typeof window === "undefined") {
    return null;
  }

  const rawSession = window.localStorage.getItem(
    getScopedStorageKey(ACTIVE_FOCUS_PREP_STORAGE_KEY),
  );

  if (!rawSession) {
    return null;
  }

  try {
    const parsedSession = JSON.parse(rawSession);
    return isActiveFocusPrepSession(parsedSession) ? parsedSession : null;
  } catch {
    return null;
  }
}

function saveActiveFocusPrepSession(session: ActiveFocusPrepSession) {
  if (typeof window === "undefined") {
    return;
  }

  saveFocusPrepDurationSeconds(session.durationSeconds);
  window.localStorage.setItem(
    getScopedStorageKey(ACTIVE_FOCUS_PREP_STORAGE_KEY),
    JSON.stringify(session),
  );
}

function clearActiveFocusPrepSession() {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(
    getScopedStorageKey(ACTIVE_FOCUS_PREP_STORAGE_KEY),
  );
}

function isActiveTimerSession(value: unknown): value is ActiveTimerSession {
  if (!value || typeof value !== "object") {
    return false;
  }

  const session = value as Partial<ActiveTimerSession>;

  if (
    typeof session.durationSeconds !== "number" ||
    typeof session.endAt !== "number"
  ) {
    return false;
  }

  if (session.phase === "plasticity") {
    return true;
  }

  return (
    session.phase === "recovery" &&
    (session.activityId === "yoga-nidra" ||
      session.activityId === "meditation" ||
      session.activityId === "walk")
  );
}

function isActiveFocusPrepSession(
  value: unknown,
): value is ActiveFocusPrepSession {
  if (!value || typeof value !== "object") {
    return false;
  }

  const session = value as Partial<ActiveFocusPrepSession>;

  return (
    typeof session.durationSeconds === "number" &&
    typeof session.sessionDurationSeconds === "number" &&
    typeof session.endAt === "number" &&
    typeof session.timerName === "string" &&
    (typeof session.taskId === "string" || session.taskId === null) &&
    (typeof session.taskTitle === "string" || session.taskTitle === null)
  );
}

function SettingsIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      viewBox="0 0 24 24"
    >
      <path d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z" />
      <path d="M19.4 15a1.8 1.8 0 0 0 .36 1.98l.05.05a2.1 2.1 0 1 1-2.97 2.97l-.05-.05a1.8 1.8 0 0 0-1.98-.36 1.8 1.8 0 0 0-1.09 1.65V21.3a2.1 2.1 0 1 1-4.2 0v-.07a1.8 1.8 0 0 0-1.09-1.65 1.8 1.8 0 0 0-1.98.36l-.05.05a2.1 2.1 0 1 1-2.97-2.97l.05-.05A1.8 1.8 0 0 0 3.84 15a1.8 1.8 0 0 0-1.65-1.09H2.1a2.1 2.1 0 1 1 0-4.2h.09a1.8 1.8 0 0 0 1.65-1.09 1.8 1.8 0 0 0-.36-1.98l-.05-.05a2.1 2.1 0 1 1 2.97-2.97l.05.05a1.8 1.8 0 0 0 1.98.36 1.8 1.8 0 0 0 1.09-1.65V2.1a2.1 2.1 0 1 1 4.2 0v.09a1.8 1.8 0 0 0 1.09 1.65 1.8 1.8 0 0 0 1.98-.36l.05-.05a2.1 2.1 0 1 1 2.97 2.97l-.05.05a1.8 1.8 0 0 0-.36 1.98 1.8 1.8 0 0 0 1.65 1.09h.09a2.1 2.1 0 1 1 0 4.2h-.09A1.8 1.8 0 0 0 19.4 15Z" />
    </svg>
  );
}

function CircleIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      viewBox="0 0 24 24"
    >
      <circle cx="12" cy="12" r="7" />
    </svg>
  );
}

function CircleOffIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeWidth="2"
      viewBox="0 0 24 24"
    >
      <circle cx="12" cy="12" r="7" />
      <path d="M5 19 19 5" />
    </svg>
  );
}

function YogaNidraIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-9 w-9"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.8"
      viewBox="0 0 24 24"
    >
      <path d="M4 16h16" />
      <path d="M7 16c1.5-4 8.5-4 10 0" />
      <path d="M10 11.5h4" />
      <path d="M12 5v3" />
      <path d="M8.5 6.5 10 8" />
      <path d="M15.5 6.5 14 8" />
    </svg>
  );
}

function MeditationIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-9 w-9"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.8"
      viewBox="0 0 24 24"
    >
      <circle cx="12" cy="6" r="2" />
      <path d="M12 8v5" />
      <path d="M8 12h8" />
      <path d="M7 18c2-2 8-2 10 0" />
      <path d="M5 20h14" />
    </svg>
  );
}

function NatureWalkIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-9 w-9"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.8"
      viewBox="0 0 24 24"
    >
      <path d="M6 20h12" />
      <path d="M8 17c1.5-3 3-5 4-8" />
      <path d="M12 9c2 2 3.5 4.5 4 8" />
      <path d="M12 4v5" />
      <path d="M9 7c-2.5-.5-3.5-2-4-4 2.5.4 4 1.6 4 4Z" />
      <path d="M15 7c2.5-.5 3.5-2 4-4-2.5.4-4 1.6-4 4Z" />
    </svg>
  );
}

function MatrixIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      viewBox="0 0 24 24"
    >
      <path d="M4 4h16v16H4z" />
      <path d="M12 4v16" />
      <path d="M4 12h16" />
    </svg>
  );
}

function TimerIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      viewBox="0 0 24 24"
    >
      <path d="M10 2h4" />
      <path d="M12 14V8" />
      <path d="M12 22a8 8 0 1 0 0-16 8 8 0 0 0 0 16Z" />
    </svg>
  );
}

function ResetIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      viewBox="0 0 24 24"
    >
      <path d="M3 12a9 9 0 1 0 3-6.7" />
      <path d="M3 4v6h6" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      viewBox="0 0 24 24"
    >
      <path d="m18 6-12 12" />
      <path d="m6 6 12 12" />
    </svg>
  );
}
