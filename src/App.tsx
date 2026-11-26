import { useEffect, useState } from 'react';
import { AlertCircle } from 'lucide-react';
import type {
  AppSettings,
  HistorySession,
  MaterialPreference,
  PracticeMode,
  SpeechAttempt,
  TopicCategory,
  TopicItem,
} from './types';
import { CURATED_TOPICS } from './data/curatedTopics';
import {
  evaluateSpeechDemo,
  evaluateSpeechWithGemini,
  generateTopicWithGemini,
} from './services/geminiService';
import { HeaderBar } from './components/HeaderBar';
import { TopicPanel } from './components/TopicPanel';
import { GuidedPrepPanel } from './components/GuidedPrepPanel';
import { RecorderStudio } from './components/RecorderStudio';
import { FeedbackPanel } from './components/FeedbackPanel';
import { SettingsModal } from './components/SettingsModal';
import { HistoryDrawer } from './components/HistoryDrawer';
import { RubyText } from './utils/furigana';

const STORAGE_SETTINGS = 'kotoba_studio_settings_v1';
const STORAGE_HISTORY = 'kotoba_studio_history_v1';
const STORAGE_FURIGANA = 'kotoba_studio_furigana_v1';
const STORAGE_MODE = 'kotoba_studio_mode_v1';

const DEFAULT_SETTINGS: AppSettings = {
  apiKey: '',
  model: 'gemini-3.8-flash',
  enableAiPhotoGen: true,
  enableSearchGrounding: true,
};

const DEPRECATED_MODELS = new Set([
  'gemini-2.5-flash',
  'gemini-2.5-pro',
  'gemini-2.0-flash',
  'gemini-2.5-flash-lite',
]);

type WorkspacePhase = 'guide' | 'record' | 'feedback';

function loadJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function loadSettings(): AppSettings {
  const saved = loadJson<AppSettings>(STORAGE_SETTINGS, DEFAULT_SETTINGS);
  if (!saved.model || DEPRECATED_MODELS.has(saved.model)) {
    return { ...DEFAULT_SETTINGS, ...saved, model: 'gemini-3.8-flash' };
  }
  return { ...DEFAULT_SETTINGS, ...saved };
}

export function App() {
  const [settings, setSettings] = useState<AppSettings>(() => loadSettings());
  const [showFurigana, setShowFurigana] = useState<boolean>(() =>
    loadJson<boolean>(STORAGE_FURIGANA, true)
  );
  const [mode, setMode] = useState<PracticeMode>(() =>
    loadJson<PracticeMode>(STORAGE_MODE, 'guided')
  );
  const [history, setHistory] = useState<HistorySession[]>(() =>
    loadJson<HistorySession[]>(STORAGE_HISTORY, [])
  );

  const [selectedCategory, setSelectedCategory] = useState<TopicCategory>('all');
  const [materialPref, setMaterialPref] = useState<MaterialPreference>('auto');
  const [topic, setTopic] = useState<TopicItem>(CURATED_TOPICS[0]);
  const [seenTopicIds, setSeenTopicIds] = useState<string[]>([CURATED_TOPICS[0].id]);

  const [round, setRound] = useState<1 | 2>(1);
  const [phase, setPhase] = useState<WorkspacePhase>(() =>
    loadJson<PracticeMode>(STORAGE_MODE, 'guided') === 'guided' ? 'guide' : 'record'
  );
  const [guideNotes, setGuideNotes] = useState<Record<string, string>>({});
  const [attempts, setAttempts] = useState<SpeechAttempt[]>([]);
  const [sessionId, setSessionId] = useState<string>(() => `sess-${Date.now()}`);
  const [recorderKey, setRecorderKey] = useState<number>(1);

  const [isGeneratingTopic, setIsGeneratingTopic] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);

  const hasApiKey = Boolean(settings.apiKey.trim());

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_SETTINGS, JSON.stringify(settings));
    } catch {
      // ignore storage quota
    }
  }, [settings]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_FURIGANA, JSON.stringify(showFurigana));
    } catch {
      // ignore
    }
  }, [showFurigana]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_MODE, JSON.stringify(mode));
    } catch {
      // ignore
    }
  }, [mode]);

  useEffect(() => {
    try {
      // Strip transient blob audioUrls before saving to localStorage
      const serializable = history.slice(0, 30).map((s) => ({
        ...s,
        attempts: s.attempts.map(({ audioUrl: _omit, ...rest }) => rest),
      }));
      localStorage.setItem(STORAGE_HISTORY, JSON.stringify(serializable));
    } catch {
      // ignore
    }
  }, [history]);

  const handleModeChange = (nextMode: PracticeMode) => {
    setMode(nextMode);
    if (attempts.length === 0) {
      setPhase(nextMode === 'guided' ? 'guide' : 'record');
    }
  };

  const pickCuratedTopic = (
    cat: TopicCategory,
    mat: MaterialPreference,
    currentId: string
  ): TopicItem => {
    let pool = CURATED_TOPICS.filter((t) => {
      const catOk = cat === 'all' || t.category === cat;
      const matOk = mat === 'auto' || t.materialType === mat;
      return catOk && matOk;
    });

    if (pool.length === 0) {
      // Relax material filter if exact combo isn't in curated list
      pool = CURATED_TOPICS.filter((t) => cat === 'all' || t.category === cat);
    }
    if (pool.length === 0) {
      pool = CURATED_TOPICS;
    }

    const notCurrent = pool.filter((t) => t.id !== currentId);
    const candidates = notCurrent.length > 0 ? notCurrent : pool;
    const unseen = candidates.filter((t) => !seenTopicIds.includes(t.id));
    const pickFrom = unseen.length > 0 ? unseen : candidates;
    return pickFrom[Math.floor(Math.random() * pickFrom.length)];
  };

  const resetForTopic = (nextTopic: TopicItem) => {
    setTopic(nextTopic);
    setSeenTopicIds((prev) => Array.from(new Set([...prev.slice(-10), nextTopic.id])));
    setRound(1);
    setGuideNotes({});
    setAttempts([]);
    setSessionId(`sess-${Date.now()}`);
    setRecorderKey((k) => k + 1);
    setPhase(mode === 'guided' ? 'guide' : 'record');
    setErrorMsg(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleGenerateNewTopic = async () => {
    setErrorMsg(null);
    if (!hasApiKey) {
      const next = pickCuratedTopic(selectedCategory, materialPref, topic.id);
      resetForTopic(next);
      return;
    }

    setIsGeneratingTopic(true);
    try {
      const generated = await generateTopicWithGemini(
        settings,
        selectedCategory,
        materialPref,
        mode,
        seenTopicIds
      );
      resetForTopic(generated);
    } catch (err: any) {
      setErrorMsg(
        `${err?.message || 'お題の生成に失敗しました。'} 厳選お題に切り替えて続けられます。`
      );
      const fallback = pickCuratedTopic(selectedCategory, materialPref, topic.id);
      resetForTopic(fallback);
    } finally {
      setIsGeneratingTopic(false);
    }
  };

  const handleSubmitSpeech = async (payload: {
    audioBlob: Blob | null;
    audioUrl?: string;
    liveTranscript: string;
    durationSec: number;
  }) => {
    setErrorMsg(null);
    setIsSubmitting(true);

    const previousAttempt = round === 2 ? attempts[0] : undefined;

    try {
      const feedback = hasApiKey
        ? await evaluateSpeechWithGemini({
            settings,
            topic,
            mode,
            round,
            audioBlob: payload.audioBlob,
            liveTranscript: payload.liveTranscript,
            durationSec: payload.durationSec,
            previousAttempt,
          })
        : await new Promise<ReturnType<typeof evaluateSpeechDemo>>((resolve) =>
            window.setTimeout(
              () =>
                resolve(
                  evaluateSpeechDemo({
                    topic,
                    mode,
                    round,
                    audioBlob: payload.audioBlob,
                    liveTranscript: payload.liveTranscript,
                    durationSec: payload.durationSec,
                    previousAttempt,
                  })
                ),
              350
            )
          );

      const newAttempt: SpeechAttempt = {
        round,
        durationSec: payload.durationSec,
        audioUrl: payload.audioUrl,
        liveTranscript: payload.liveTranscript,
        feedback,
        timestamp: new Date().toLocaleTimeString('ja-JP', {
          hour: '2-digit',
          minute: '2-digit',
        }),
      };

      const nextAttempts = round === 1 ? [newAttempt] : [attempts[0], newAttempt].filter(Boolean);
      setAttempts(nextAttempts);
      setPhase('feedback');

      // Save or update session in history
      const dateStr = new Date().toLocaleDateString('ja-JP', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
      setHistory((prev) => {
        const updatedSession: HistorySession = {
          id: sessionId,
          date: dateStr,
          mode,
          topic,
          attempts: nextAttempts,
        };
        const others = prev.filter((s) => s.id !== sessionId);
        return [updatedSession, ...others];
      });
    } catch (err: any) {
      setErrorMsg(err?.message || 'フィードバックの生成中にエラーが発生しました。');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStartRound2 = () => {
    setRound(2);
    setRecorderKey((k) => k + 1);
    setPhase('record');
    setErrorMsg(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSelectHistorySession = (sess: HistorySession) => {
    setTopic(sess.topic);
    setMode(sess.mode);
    setSessionId(sess.id);
    setAttempts(sess.attempts);
    setRound(sess.attempts.length >= 2 ? 2 : 1);
    setGuideNotes({});
    setPhase(sess.attempts.length > 0 ? 'feedback' : 'record');
    setErrorMsg(null);
  };

  const latestAttempt = attempts[attempts.length - 1];
  const round1FocusPoints = attempts[0]?.feedback.retryFocusPoints;

  return (
    <div className={`app-shell ${showFurigana ? 'furigana-on' : 'furigana-off'}`}>
      <HeaderBar
        mode={mode}
        onModeChange={handleModeChange}
        showFurigana={showFurigana}
        onToggleFurigana={() => setShowFurigana((v) => !v)}
        hasApiKey={hasApiKey}
        historyCount={history.length}
        onOpenHistory={() => setHistoryOpen(true)}
        onOpenSettings={() => setSettingsOpen(true)}
      />

      <main className="studio-main">
        <TopicPanel
          topic={topic}
          round={round}
          selectedCategory={selectedCategory}
          onSelectCategory={setSelectedCategory}
          materialPref={materialPref}
          onSelectMaterial={setMaterialPref}
          onGenerateNewTopic={handleGenerateNewTopic}
          isGeneratingTopic={isGeneratingTopic}
          retryFocusPoints={round === 2 ? round1FocusPoints : undefined}
          hasApiKey={hasApiKey}
        />

        <div className="workspace-column">
          {!hasApiKey && (
            <div className="inline-alert info" id="demo-mode-banner">
              <AlertCircle size={16} style={{ flexShrink: 0, marginTop: 2 }} />
              <div className="ruby-prose">
                <RubyText text="現在[げんざい]はデモモードで動作中[どうさちゅう]です。このまま練習[れんしゅう]の流[なが]れを試[ため]せます。右上[みぎうえ]の「API設定[せってい]」にGemini APIキーを登録[とうろく]すると、実際[じっさい]の音声[おんせい]を聞[き]いた本格的[ほんかくてき]な添削[てんさく]・Web事実確認[じじつかくにん]・お題[だい]の自動生成[じどうせいせい]が使[つか]えます。" />
              </div>
            </div>
          )}

          {errorMsg && (
            <div className="inline-alert error" role="alert">
              <AlertCircle size={16} style={{ flexShrink: 0, marginTop: 2 }} />
              <span>{errorMsg}</span>
            </div>
          )}

          {phase === 'guide' && mode === 'guided' && round === 1 && (
            <GuidedPrepPanel
              steps={topic.guidedSteps}
              notes={guideNotes}
              onUpdateNote={(stepId, value) =>
                setGuideNotes((prev) => ({ ...prev, [stepId]: value }))
              }
              onFinishGuide={() => setPhase('record')}
            />
          )}

          {phase === 'record' && (
            <RecorderStudio
              key={recorderKey}
              round={round}
              hasApiKey={hasApiKey}
              isSubmitting={isSubmitting}
              guidedSteps={mode === 'guided' ? topic.guidedSteps : undefined}
              guideNotes={mode === 'guided' ? guideNotes : undefined}
              onEditGuide={
                mode === 'guided' && round === 1 ? () => setPhase('guide') : undefined
              }
              onSubmitSpeech={handleSubmitSpeech}
            />
          )}

          {phase === 'feedback' && latestAttempt && (
            <FeedbackPanel
              round={latestAttempt.round}
              durationSec={latestAttempt.durationSec}
              feedback={latestAttempt.feedback}
              onStartRound2={handleStartRound2}
              onNextTopic={handleGenerateNewTopic}
              onOpenSettings={() => setSettingsOpen(true)}
            />
          )}
        </div>
      </main>

      {settingsOpen && (
        <SettingsModal
          settings={settings}
          onSave={setSettings}
          onClose={() => setSettingsOpen(false)}
        />
      )}

      {historyOpen && (
        <HistoryDrawer
          sessions={history}
          onSelectSession={handleSelectHistorySession}
          onClearHistory={() => setHistory([])}
          onClose={() => setHistoryOpen(false)}
        />
      )}
    </div>
  );
}

export default App;
