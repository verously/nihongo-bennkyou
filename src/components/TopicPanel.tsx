import React from 'react';
import {
  BarChart3,
  Camera,
  ExternalLink,
  Loader2,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Target,
} from 'lucide-react';
import {
  CATEGORY_LABELS,
  MATERIAL_LABELS,
  type MaterialPreference,
  type TopicCategory,
  type TopicItem,
} from '../types';
import { RubyText } from '../utils/furigana';
import { StatChart } from './StatChart';

interface TopicPanelProps {
  topic: TopicItem;
  round: 1 | 2;
  selectedCategory: TopicCategory;
  onSelectCategory: (cat: TopicCategory) => void;
  materialPref: MaterialPreference;
  onSelectMaterial: (pref: MaterialPreference) => void;
  onGenerateNewTopic: () => void;
  isGeneratingTopic: boolean;
  retryFocusPoints?: string[];
  hasApiKey: boolean;
}

const CATEGORIES: TopicCategory[] = ['all', 'daily', 'culture', 'work', 'society'];
const MATERIALS: MaterialPreference[] = ['auto', 'photo', 'chart'];

export const TopicPanel: React.FC<TopicPanelProps> = ({
  topic,
  round,
  selectedCategory,
  onSelectCategory,
  materialPref,
  onSelectMaterial,
  onGenerateNewTopic,
  isGeneratingTopic,
  retryFocusPoints,
  hasApiKey,
}) => {
  return (
    <aside className="topic-column" aria-label="お題と材料">
      {/* Topic Selector Controls */}
      <div className="surface-card topic-controls">
        <div className="chip-group" role="group" aria-label="テーマのカテゴリ">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              id={`chip-cat-${cat}`}
              type="button"
              className={`filter-chip ${selectedCategory === cat ? 'active' : ''}`}
              onClick={() => onSelectCategory(cat)}
            >
              <RubyText text={CATEGORY_LABELS[cat]} />
            </button>
          ))}
        </div>

        <div className="control-row">
          <div className="material-toggle" role="group" aria-label="材料のタイプ">
            {MATERIALS.map((mat) => (
              <button
                key={mat}
                id={`btn-material-${mat}`}
                type="button"
                className={`material-btn ${materialPref === mat ? 'active' : ''}`}
                onClick={() => onSelectMaterial(mat)}
              >
                {mat === 'photo' && <Camera size={12} />}
                {mat === 'chart' && <BarChart3 size={12} />}
                <RubyText text={MATERIAL_LABELS[mat]} />
              </button>
            ))}
          </div>

          <button
            id="btn-new-topic"
            type="button"
            className="btn-primary"
            onClick={onGenerateNewTopic}
            disabled={isGeneratingTopic}
          >
            {isGeneratingTopic ? (
              <Loader2 size={15} className="spin" />
            ) : (
              <RefreshCw size={15} />
            )}
            <span>
              {isGeneratingTopic ? (
                <RubyText text="お題[だい]を作成中[さくせいちゅう]..." />
              ) : (
                <RubyText text="新[あたら]しいお題[だい]" />
              )}
            </span>
          </button>
        </div>
      </div>

      {/* Main Topic Stimulus Card */}
      <article className="surface-card topic-card">
        <div className="topic-card-header">
          <div className="topic-meta-row">
            <div className="meta-badges">
              <span className="category-tag">
                <RubyText text={CATEGORY_LABELS[topic.category]} />
              </span>
              <span className={`round-badge ${round === 2 ? 'round-2' : ''}`}>
                {round === 1 ? (
                  <RubyText text="1回目[かいめ]のスピーチ" />
                ) : (
                  <RubyText text="2回目[かいめ]（改善[かいぜん]リトライ）" />
                )}
              </span>
            </div>
            {topic.isAiGenerated ? (
              <span className="ai-badge">
                <Sparkles size={12} />
                <span>Gemini生成</span>
              </span>
            ) : (
              <span className="ai-badge">
                <RubyText text={hasApiKey ? '厳選[げんせん]お題[だい]' : 'デモお題[だい]'} />
              </span>
            )}
          </div>

          <h2 className="topic-title ruby-prose" id="current-topic-title">
            <RubyText text={topic.title} />
          </h2>
        </div>

        <div className="stimulus-stage">
          {topic.materialType === 'photo' && topic.imageUrl ? (
            <>
              <div className="stimulus-photo-frame">
                <img src={topic.imageUrl} alt={topic.imageAlt || topic.title} />
              </div>
              {topic.imageCaption && (
                <p className="stimulus-caption">
                  <RubyText text={topic.imageCaption} />
                </p>
              )}
            </>
          ) : topic.chart ? (
            <StatChart chart={topic.chart} />
          ) : null}

          {topic.groundingSources && topic.groundingSources.length > 0 && (
            <div className="source-links">
              {topic.groundingSources.map((src, i) => (
                <a
                  key={src.uri + i}
                  href={src.uri}
                  target="_blank"
                  rel="noreferrer"
                  className="source-link-chip"
                >
                  <ExternalLink size={11} />
                  <span>{src.title}</span>
                </a>
              ))}
            </div>
          )}
        </div>

        <div className="topic-instruction-box">
          <p className="topic-instruction ruby-prose">
            <RubyText text={topic.promptInstruction} />
          </p>
          <div className="no-spoiler-note">
            <ShieldCheck size={15} style={{ flexShrink: 0, marginTop: 2 }} />
            <span>
              <RubyText text="話[はな]す前[まえ]に模範解答[もはんかいとう]や意見[いけん]の例[れい]は出[だ]しません。自分[じぶん]の言葉[ことば]で考[かんが]えて話[はな]してみましょう。" />
            </span>
          </div>
        </div>
      </article>

      {/* Round 2 Pinned Focus Reminders (NO full script!) */}
      {round === 2 && retryFocusPoints && retryFocusPoints.length > 0 && (
        <section className="retry-pin-card" aria-label="2回目で意識するポイント">
          <h3 className="retry-pin-title">
            <Target size={15} />
            <RubyText text="2回目[かいめ]で意識[いしき]するポイント" />
          </h3>
          <ul className="retry-pin-list ruby-prose">
            {retryFocusPoints.map((pt, i) => (
              <li key={i}>
                <RubyText text={pt} />
              </li>
            ))}
          </ul>
        </section>
      )}
    </aside>
  );
};
