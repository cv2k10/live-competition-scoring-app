"use client";

import React, { createContext, useContext, useEffect, useState, useSyncExternalStore } from "react";

export type Locale = "zh" | "en";

export const translations = {
  zh: {
    common: {
      brandName: "现场评分",
      brandLive: "LIVE",
      setup: "准备中",
      live: "进行中",
      finished: "已结束",
      save: "保存",
      delete: "删除",
      confirmDelete: "确认删除？",
      confirm: "确认？",
      retry: "重试",
      back: "返回",
      home: "首页",
      copy: "复制",
      copied: "已复制",
      copyFailed: "复制失败",
      loading: "加载中…",
      error: "出错了",
      langName: "EN",
      langTitle: "切换至英文 (Switch to English)",
    },
    dashboard: {
      title: "比赛评分",
      subtitle: "创建比赛、添加选手与评委，现场打分，大屏实时出分。评委无需登录。",
      newCompPlaceholder: "新比赛名称，如：春季合唱比赛",
      createBtn: "创建比赛",
      creating: "创建中…",
      totalComps: (n: number) => `共 ${n} 场`,
      liveComps: (n: number) => `· ${n} 场进行中`,
      contestantsCount: (n: number) => `${n} 名选手`,
      judgesCount: (n: number) => `${n} 位评委`,
      setupBtn: "设置",
      judgeBtn: "评委打分",
      liveBtn: "实时大屏",
      deleteTitle: "删除比赛",
      confirmDeleteTitle: "再点一次确认删除",
      emptyTitle: "还没有比赛",
      emptySubtitle: "在上方输入比赛名称，一键创建并进入设置",
      enterNamePrompt: "请输入比赛名称",
      compCreated: "比赛已创建",
      compDeleted: "比赛已删除",
    },
    setup: {
      allComps: "全部比赛",
      startComp: "开始比赛",
      finishComp: "结束比赛",
      reopenComp: "重新开放",
      startCompNote: "至少需要 1 名选手和 1 位评委",
      compStartedMsg: "比赛已开始，评委可以打分了",
      compFinishedMsg: "比赛已结束",
      compReopenedMsg: "比赛已重新开放",
      compDeletedMsg: "已删除",
      basicInfo: "基本信息",
      compName: "比赛名称",
      compNameEmpty: "名称不能为空",
      compNameSaved: "名称已保存",
      dropHighest: "去掉最高分",
      dropLowest: "去掉最低分",
      dropRuleTip: "每项标准 ≥ 3 个分时生效",
      quickLinks: "入口",
      judgeEntranceBtn: "评委打分入口",
      liveScreenBtn: "打开实时大屏",
      copyJudgeLinkBtn: "复制评委入口链接",
      copyLiveLinkBtn: "复制大屏链接",
      judgeLinkCopied: "评委入口链接已复制",
      liveLinkCopied: "大屏链接已复制",
      judgeExplainer: "评委打开链接选择自己的名字即可打分，无需注册或登录。",
      criteriaTitle: "评分标准",
      criteriaLockedTip: "比赛开始/结束后锁定，重新开放后可编辑",
      weight: "权重",
      maxScore: "满分",
      newCritPlaceholder: "新标准名称，如：台风",
      addCritBtn: "添加",
      critNameEmpty: "请输入评分标准名称",
      critAddedMsg: "评分标准已添加",
      contestantsTitle: "选手",
      contestantsCount: (n: number) => `${n} 人`,
      bulkPlaceholder: "输入选手姓名，每行一个（也可用逗号分隔），回车添加",
      addContestantBtn: "添加选手",
      noContestantsTip: "还没有选手，添加后才能开始比赛",
      scoredProgress: (done: number, total: number) => `已评 ${done}/${total}`,
      contestantRenamed: "选手已重命名",
      contestantsAdded: (n: number) => `已添加 ${n} 名选手`,
      enterContestantName: "请先输入选手姓名",
      judgesTitle: "评委",
      judgesCount: (n: number) => `${n} 人 · 无需登录`,
      judgeNamePlaceholder: "评委姓名，如：王评委",
      addJudgeBtn: "添加评委",
      noJudgesTip: "还没有评委，添加后评委打开链接即可直接打分",
      allCompleted: "全部完成",
      judgeLinkTitle: "复制该评委的专属链接",
      judgeLinkBtn: "链接",
      judgeAddedMsg: "评委已添加",
      enterJudgeName: "请输入评委姓名",
      judgePersonalLinkCopied: "评委链接已复制",
      judgePersonalLinkFailed: "复制失败，请手动复制地址",
      confirmCritDelete: "确认？",
    },
    judge: {
      setupNav: "设置",
      myLink: "我的链接",
      switchJudge: "切换评委",
      identityPrompt: "评委无需登录 —— 选择你的名字，即可开始为选手打分",
      noJudgesHere: "还没有评委，请先在设置页添加评委",
      setupPageLink: "设置页",
      setupStatusNote: "比赛尚未开始，进入后先浏览评分项",
      finishedStatusNote: "比赛已结束，评分已锁定",
      contestantsCount: (n: number) => `${n} 名选手`,
      notLiveNoticeSetup: "比赛尚未开始 —— 可先熟悉评分项，开始后提交即生效。",
      notLiveNoticeFinished: "比赛已结束，评分已锁定。",
      completedStat: (done: number, total: number) => `已完成 ${done}/${total}`,
      canUpdateNote: "提交后可修改，以最后一次为准",
      allDoneMessage: "全部评分已提交，辛苦啦",
      noCriteriaTip: "该比赛还没有评分标准",
      submittedBadge: "已提交",
      scoreRuleTip: (max: number, weight: number) =>
        `0 – ${max} 分${weight !== 100 ? ` · 权重 ${weight}%` : ""}`,
      submitScore: "提交评分",
      updateScore: "更新评分",
      submitting: "提交中…",
      missingScoreErr: (name: string) => `「${name}」还没有填分`,
      invalidScoreErr: (name: string) => `「${name}」分数无效`,
      scoreRangeErr: (name: string, max: number) => `「${name}」需在 0 – ${max} 之间`,
      scoreSuccess: (name: string) => `「${name}」的评分已提交`,
      myLinkCopied: "我的评分链接已复制",
      myLinkFailed: "复制失败",
    },
    live: {
      judgePortal: "评委入口",
      manageBtn: "管理",
      liveBadge: "直播中 LIVE",
      finishedBadge: "最终结果",
      upcomingBadge: "待开始",
      maxPossible: (max: string) => `满分 ${max}`,
      scoreCount: (got: number, exp: number) => `已收分 ${got}/${exp}`,
      subtitleLive: "成绩实时刷新，评委打分即时可见",
      subtitleFinished: "成绩已定格",
      subtitleUpcoming: "比赛开始后，评委分数将实时呈现在这里",
      noContestants: "暂无选手",
      noContestantsTip: "请先到管理页添加选手与评委",
      pendingScore: "待评",
      scoredOfJudges: (scored: number, total: number) => `已收 ${scored}/${total} 分`,
      judgesProgressTitle: "评委进度",
      noJudgesLive: "暂无评委",
      rulesTitle: "规则",
      dropHighestTag: "去最高分",
      dropLowestTag: "去最低分",
      allCountTag: "全部计分",
      weightedTag: "按权重加权",
      homeBtn: "首页",
      loadingLive: "正在加载实时成绩…",
    },
  },
  en: {
    common: {
      brandName: "LiveScore",
      brandLive: "LIVE",
      setup: "Setup",
      live: "Live",
      finished: "Finished",
      save: "Save",
      delete: "Delete",
      confirmDelete: "Confirm?",
      confirm: "Confirm?",
      retry: "Retry",
      back: "Back",
      home: "Home",
      copy: "Copy",
      copied: "Copied",
      copyFailed: "Copy failed",
      loading: "Loading…",
      error: "An error occurred",
      langName: "中文",
      langTitle: "切换至中文 (Switch to Chinese)",
    },
    dashboard: {
      title: "Competition Scoring",
      subtitle: "Create competitions, manage contestants & judges, real-time live board. No login required for judges.",
      newCompPlaceholder: "New competition name, e.g. Spring Choir Contest",
      createBtn: "Create Competition",
      creating: "Creating…",
      totalComps: (n: number) => `${n} ${n === 1 ? "competition" : "competitions"} total`,
      liveComps: (n: number) => `· ${n} live`,
      contestantsCount: (n: number) => `${n} ${n === 1 ? "contestant" : "contestants"}`,
      judgesCount: (n: number) => `${n} ${n === 1 ? "judge" : "judges"}`,
      setupBtn: "Setup",
      judgeBtn: "Judge Scoring",
      liveBtn: "Live Board",
      deleteTitle: "Delete competition",
      confirmDeleteTitle: "Click again to confirm delete",
      emptyTitle: "No competitions yet",
      emptySubtitle: "Enter a competition name above to create and configure.",
      enterNamePrompt: "Please enter a competition name",
      compCreated: "Competition created",
      compDeleted: "Competition deleted",
    },
    setup: {
      allComps: "All Competitions",
      startComp: "Start Competition",
      finishComp: "Finish Competition",
      reopenComp: "Reopen Competition",
      startCompNote: "Requires at least 1 contestant and 1 judge",
      compStartedMsg: "Competition is now live. Judges can submit scores.",
      compFinishedMsg: "Competition has finished",
      compReopenedMsg: "Competition has been reopened",
      compDeletedMsg: "Deleted",
      basicInfo: "Basic Info",
      compName: "Competition Name",
      compNameEmpty: "Name cannot be empty",
      compNameSaved: "Name saved",
      dropHighest: "Drop Highest Score",
      dropLowest: "Drop Lowest Score",
      dropRuleTip: "Takes effect when ≥ 3 scores per criterion",
      quickLinks: "Entrances",
      judgeEntranceBtn: "Judge Scoring Portal",
      liveScreenBtn: "Open Live Board",
      copyJudgeLinkBtn: "Copy Judge Portal Link",
      copyLiveLinkBtn: "Copy Live Board Link",
      judgeLinkCopied: "Judge portal link copied",
      liveLinkCopied: "Live board link copied",
      judgeExplainer: "Judges open the link and pick their name to score. No login or password required.",
      criteriaTitle: "Scoring Criteria",
      criteriaLockedTip: "Locked while live or finished. Reopen competition to edit.",
      weight: "Weight",
      maxScore: "Max",
      newCritPlaceholder: "New criterion name, e.g. Stage Presence",
      addCritBtn: "Add",
      critNameEmpty: "Please enter a criterion name",
      critAddedMsg: "Criterion added",
      contestantsTitle: "Contestants",
      contestantsCount: (n: number) => `${n}`,
      bulkPlaceholder: "Enter names, one per line (or comma-separated). Press enter or click Add.",
      addContestantBtn: "Add Contestants",
      noContestantsTip: "No contestants yet. Add contestants before starting.",
      scoredProgress: (done: number, total: number) => `Scored ${done}/${total}`,
      contestantRenamed: "Contestant renamed",
      contestantsAdded: (n: number) => `Added ${n} contestants`,
      enterContestantName: "Please enter contestant names",
      judgesTitle: "Judges",
      judgesCount: (n: number) => `${n} judges · No login needed`,
      judgeNamePlaceholder: "Judge name, e.g. Judge Smith",
      addJudgeBtn: "Add Judge",
      noJudgesTip: "No judges yet. Add judges to generate individual scoring links.",
      allCompleted: "Completed",
      judgeLinkTitle: "Copy personal scoring link for this judge",
      judgeLinkBtn: "Link",
      judgeAddedMsg: "Judge added",
      enterJudgeName: "Please enter judge name",
      judgePersonalLinkCopied: "Judge link copied",
      judgePersonalLinkFailed: "Copy failed. Please copy link manually.",
      confirmCritDelete: "Confirm?",
    },
    judge: {
      setupNav: "Setup",
      myLink: "My Link",
      switchJudge: "Switch Judge",
      identityPrompt: "No login needed — select your name to begin scoring contestants",
      noJudgesHere: "No judges yet. Please add judges in the setup page.",
      setupPageLink: "Setup Page",
      setupStatusNote: "Competition has not started. You can preview criteria.",
      finishedStatusNote: "Competition has finished. Scoring is locked.",
      contestantsCount: (n: number) => `${n} ${n === 1 ? "contestant" : "contestants"}`,
      notLiveNoticeSetup: "Competition is not yet live. You can preview criteria; submissions will take effect once live.",
      notLiveNoticeFinished: "Competition has finished. Scoring is locked.",
      completedStat: (done: number, total: number) => `Completed ${done}/${total}`,
      canUpdateNote: "Scores can be updated anytime before competition ends.",
      allDoneMessage: "All scores submitted. Great job!",
      noCriteriaTip: "This competition has no scoring criteria defined.",
      submittedBadge: "Submitted",
      scoreRuleTip: (max: number, weight: number) =>
        `0 – ${max} pts${weight !== 100 ? ` · Weight ${weight}%` : ""}`,
      submitScore: "Submit Score",
      updateScore: "Update Score",
      submitting: "Submitting…",
      missingScoreErr: (name: string) => `Please enter a score for "${name}"`,
      invalidScoreErr: (name: string) => `Invalid score for "${name}"`,
      scoreRangeErr: (name: string, max: number) => `"${name}" score must be between 0 and ${max}`,
      scoreSuccess: (name: string) => `Score for "${name}" submitted`,
      myLinkCopied: "Personal scoring link copied",
      myLinkFailed: "Copy failed",
    },
    live: {
      judgePortal: "Judge Portal",
      manageBtn: "Manage",
      liveBadge: "LIVE",
      finishedBadge: "FINAL RESULTS",
      upcomingBadge: "UPCOMING",
      maxPossible: (max: string) => `Max ${max}`,
      scoreCount: (got: number, exp: number) => `Scores ${got}/${exp}`,
      subtitleLive: "Real-time scores update as judges submit",
      subtitleFinished: "Final scores locked",
      subtitleUpcoming: "Scores will appear here live once the event starts",
      noContestants: "No Contestants",
      noContestantsTip: "Please add contestants and judges in the management page",
      pendingScore: "Pending",
      scoredOfJudges: (scored: number, total: number) => `Received ${scored}/${total}`,
      judgesProgressTitle: "Judge Progress",
      noJudgesLive: "No judges",
      rulesTitle: "Rules",
      dropHighestTag: "Drop High",
      dropLowestTag: "Drop Low",
      allCountTag: "All Scores Count",
      weightedTag: "Weighted Average",
      homeBtn: "Home",
      loadingLive: "Loading live scores…",
    },
  },
} as const;

export type Translations = typeof translations.zh;

type I18nContextType = {
  locale: Locale;
  setLocale: (l: Locale) => void;
  toggleLocale: () => void;
  t: Translations;
};

const I18nContext = createContext<I18nContextType | null>(null);

const STORAGE_KEY = "livescore_lang";

let listeners: Array<() => void> = [];
let currentLocale: Locale = "zh";

function getSnapshot(): Locale {
  return currentLocale;
}

function subscribe(listener: () => void) {
  listeners.push(listener);
  return () => {
    listeners = listeners.filter((l) => l !== listener);
  };
}

function setGlobalLocale(next: Locale) {
  currentLocale = next;
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(STORAGE_KEY, next);
      document.documentElement.lang = next === "zh" ? "zh-CN" : "en";
    } catch {
      // ignore
    }
  }
  for (const l of listeners) l();
}

export function I18nProvider({ children }: { children: React.ReactNode }) {
  // Read initial locale from localStorage or browser language on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY) as Locale | null;
      if (saved === "zh" || saved === "en") {
        setGlobalLocale(saved);
      } else if (navigator.language && !navigator.language.toLowerCase().startsWith("zh")) {
        setGlobalLocale("en");
      }
    } catch {
      // ignore
    }
  }, []);

  const locale = useSyncExternalStore<Locale>(subscribe, getSnapshot, () => "zh");

  const toggleLocale = () => {
    setGlobalLocale(locale === "zh" ? "en" : "zh");
  };

  const value: I18nContextType = {
    locale,
    setLocale: setGlobalLocale,
    toggleLocale,
    t: translations[locale] as unknown as Translations,
  };

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextType {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    return {
      locale: "zh",
      setLocale: () => {},
      toggleLocale: () => {},
      t: translations.zh as unknown as Translations,
    };
  }
  return ctx;
}

export function LanguageToggle({ dark }: { dark?: boolean }) {
  const { locale, toggleLocale, t } = useI18n();

  return (
    <button
      type="button"
      onClick={toggleLocale}
      className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-bold transition-all ${
        dark
          ? "border border-[var(--d-line)] bg-[var(--d-card)] text-[var(--d-text)] hover:border-[var(--d-gold)] hover:text-[var(--d-gold)]"
          : "border border-[var(--line)] bg-[var(--card)] text-[var(--ink)] hover:border-[var(--gold)] hover:text-[var(--gold-deep)] shadow-xs"
      }`}
      title={t.common.langTitle}
    >
      <span className="opacity-60 text-[10px]">🌐</span>
      <span>{locale === "zh" ? "EN" : "中"}</span>
    </button>
  );
}
