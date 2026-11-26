export type TopicCategory = 'all' | 'daily' | 'culture' | 'work' | 'society';
export type ConcreteCategory = Exclude<TopicCategory, 'all'>;
export type MaterialPreference = 'auto' | 'photo' | 'chart';
export type PracticeMode = 'guided' | 'free';

export interface ChartDatum {
  label: string;
  value: number;
  highlight?: boolean;
}

export interface ChartData {
  title: string;
  subtitle?: string;
  unit: string;
  chartType: 'bar' | 'horizontalBar';
  items: ChartDatum[];
  sourceName: string;
  sourceUrl?: string;
  year?: string;
}

export interface GuidedStep {
  id: string;
  stageLabel: string;
  question: string;
  placeholder: string;
}

export interface GroundingSource {
  title: string;
  uri: string;
}

export interface TopicItem {
  id: string;
  category: ConcreteCategory;
  title: string;
  materialType: 'photo' | 'chart';
  imageUrl?: string;
  imageAlt?: string;
  imageCaption?: string;
  chart?: ChartData;
  promptInstruction: string;
  guidedSteps: GuidedStep[];
  groundingSources?: GroundingSource[];
  isAiGenerated?: boolean;
}

export interface CriterionFeedback {
  key: 'structure' | 'grammar' | 'vocabulary' | 'naturalness';
  label: string;
  score: number; // 1 to 5
  goodPoints: string[];
  improvePoints: string[];
  naturalTip?: string;
}

export interface FactCheckItem {
  claim: string;
  status: 'verified' | 'needs_check' | 'opinion';
  note: string;
  sourceTitle?: string;
  sourceUrl?: string;
}

export interface CoachingFeedback {
  transcript: string;
  overallComment: string;
  criteria: CriterionFeedback[];
  factChecks: FactCheckItem[];
  retryFocusPoints: string[];
  retryPrompt: string;
  round2Comparison?: string;
  groundingSources?: GroundingSource[];
  isDemo?: boolean;
}

export interface SpeechAttempt {
  round: 1 | 2;
  durationSec: number;
  audioUrl?: string;
  liveTranscript: string;
  feedback: CoachingFeedback;
  timestamp: string;
}

export interface HistorySession {
  id: string;
  date: string;
  mode: PracticeMode;
  topic: TopicItem;
  attempts: SpeechAttempt[];
}

export interface AppSettings {
  apiKey: string;
  model: string;
  enableAiPhotoGen: boolean;
  enableSearchGrounding: boolean;
}

export const CATEGORY_LABELS: Record<TopicCategory, string> = {
  all: 'おまかせ',
  daily: '日常生活[にちじょうせいかつ]',
  culture: '文化[ぶんか]',
  work: '仕事[しごと]',
  society: '社会問題[しゃかいもんだい]',
};

export const MATERIAL_LABELS: Record<MaterialPreference, string> = {
  auto: 'おまかせ',
  photo: '写真[しゃしん]',
  chart: '統計[とうけい]グラフ',
};
