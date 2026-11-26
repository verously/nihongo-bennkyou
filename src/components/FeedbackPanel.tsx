import React, { useState } from 'react';
import {
  ArrowRight,
  CheckCircle2,
  ExternalLink,
  Lightbulb,
  MessageSquareQuote,
  RefreshCw,
  SearchCheck,
  Sparkles,
  Volume2,
} from 'lucide-react';
import type { CoachingFeedback } from '../types';
import { RubyText } from '../utils/furigana';
import { isTtsSupported, speakJapanese, stopSpeaking } from '../utils/tts';

interface FeedbackPanelProps {
  round: 1 | 2;
  durationSec: number;
  feedback: CoachingFeedback;
  onStartRound2: () => void;
  onNextTopic: () => void;
  onOpenSettings: () => void;
}

export const FeedbackPanel: React.FC<FeedbackPanelProps> = ({
  round,
  durationSec,
  feedback,
  onStartRound2,
  onNextTopic,
  onOpenSettings,
}) => {
  const [speakingKey, setSpeakingKey] = useState<string | null>(null);
  const ttsAvailable = isTtsSupported();

  const handleSpeak = (key: string, text: string) => {
    if (speakingKey === key) {
      stopSpeaking();
      setSpeakingKey(null);
      return;
    }
    setSpeakingKey(key);
    speakJapanese(text, () => setSpeakingKey(null));
  };

  return (
    <section className="surface-card section-card" aria-label="コーチからのフィードバック" id="feedback-section">
      <div className="section-header">
        <h2 className="section-title">
          <span className="section-step-badge">FEEDBACK</span>
          <RubyText text={`コーチからのフィードバック（${round}回目[かいめ]・${durationSec}秒[びょう]）`} />
        </h2>
        {feedback.isDemo && (
          <button
            type="button"
            className="btn-ghost"
            onClick={onOpenSettings}
            style={{ color: 'var(--ai-primary)' }}
          >
            <Sparkles size={14} />
            <span>
              <RubyText text="Gemini APIで本格添削[ほんかくてんさく]" />
            </span>
          </button>
        )}
      </div>

      <div className="feedback-stack">
        {/* Round 2 Progress Comparison Banner */}
        {round === 2 && feedback.round2Comparison && (
          <div className="feedback-summary-banner growth" id="round2-growth-banner">
            <p className="banner-eyebrow">
              <Sparkles size={14} />
              <RubyText text="1回目[かいめ] → 2回目[かいめ]の成長[せいちょう]ポイント" />
            </p>
            <div className="ruby-prose">
              <RubyText text={feedback.round2Comparison} />
            </div>
          </div>
        )}

        {/* Overall Comment */}
        <div className="feedback-summary-banner">
          <p className="banner-eyebrow">
            <MessageSquareQuote size={14} />
            <RubyText text="コーチからの総評[そうひょう]" />
          </p>
          <div className="ruby-prose">
            <RubyText text={feedback.overallComment} />
          </div>
        </div>

        {/* Transcript Heard */}
        <div>
          <p
            style={{
              margin: '0 0 6px',
              fontSize: 12.5,
              fontWeight: 700,
              color: 'var(--ink-secondary)',
            }}
          >
            <RubyText text="聞[き]き取[と]ったあなたの発言[はつげん]" />
          </p>
          <div className="transcript-quote ruby-prose">
            <RubyText text={feedback.transcript} />
          </div>
        </div>

        {/* 4 Criteria Breakdown */}
        <div className="criteria-list">
          {feedback.criteria.map((crit) => (
            <article key={crit.key} className="criterion-block" id={`criterion-${crit.key}`}>
              <div className="criterion-head">
                <h3 className="criterion-name">
                  <RubyText text={crit.label} />
                </h3>
                <div className="score-dots" aria-label={`評価 ${crit.score} / 5`}>
                  {[1, 2, 3, 4, 5].map((n) => (
                    <span
                      key={n}
                      className={`score-dot ${n <= crit.score ? 'filled' : ''}`}
                    />
                  ))}
                  <span className="score-num">{crit.score}/5</span>
                </div>
              </div>

              <div className="point-columns">
                <div>
                  <p className="point-group-title good">
                    <CheckCircle2 size={14} />
                    <RubyText text="良[よ]かった点[てん]" />
                  </p>
                  <ul className="point-list ruby-prose">
                    {crit.goodPoints.map((pt, idx) => (
                      <li key={idx}>
                        <RubyText text={pt} />
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  <p className="point-group-title improve">
                    <Lightbulb size={14} />
                    <RubyText text="改善[かいぜん]すべき点[てん]" />
                  </p>
                  <ul className="point-list ruby-prose">
                    {crit.improvePoints.map((pt, idx) => (
                      <li key={idx}>
                        <RubyText text={pt} />
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {crit.naturalTip && (
                <div className="natural-tip-bar">
                  <div className="ruby-prose">
                    <strong style={{ fontSize: 12, color: 'var(--ai-primary)', marginRight: 8 }}>
                      <RubyText text="使[つか]えるフレーズ：" />
                    </strong>
                    <RubyText text={crit.naturalTip} />
                  </div>
                  {ttsAvailable && (
                    <button
                      type="button"
                      className="tts-btn"
                      onClick={() => handleSpeak(crit.key, crit.naturalTip!)}
                    >
                      <Volume2 size={13} />
                      <span>
                        {speakingKey === crit.key ? (
                          <RubyText text="停止[ていし]" />
                        ) : (
                          <RubyText text="発音[はつおん]を聞[き]く" />
                        )}
                      </span>
                    </button>
                  )}
                </div>
              )}
            </article>
          ))}
        </div>

        {/* Step 6: Fact Check vs Opinion */}
        {feedback.factChecks && feedback.factChecks.length > 0 && (
          <div>
            <h3
              style={{
                margin: '4px 0 10px',
                fontSize: 15,
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: 7,
              }}
            >
              <SearchCheck size={16} color="var(--ai-primary)" />
              <RubyText text="事実[じじつ]と意見[いけん]の区別[くべつ]（Web確認[かくにん]）" />
            </h3>
            <div className="fact-check-list">
              {feedback.factChecks.map((fc, idx) => (
                <div key={idx} className="fact-row">
                  <div className="fact-head">
                    <span className={`fact-badge ${fc.status}`}>
                      {fc.status === 'verified' && <RubyText text="確認[かくにん]できた事実[じじつ]" />}
                      {fc.status === 'opinion' && <RubyText text="あなたの意見[いけん]・感想[かんそう]" />}
                      {fc.status === 'needs_check' && <RubyText text="事実確認[じじつかくにん]メモ" />}
                    </span>
                    <span className="fact-claim ruby-prose">
                      <RubyText text={fc.claim} />
                    </span>
                  </div>
                  <p className="fact-note ruby-prose">
                    <RubyText text={fc.note} />
                  </p>
                </div>
              ))}
            </div>

            {feedback.groundingSources && feedback.groundingSources.length > 0 && (
              <div className="source-links">
                {feedback.groundingSources.map((src, i) => (
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
        )}

        {/* Step 7: Prompt to Speak Again on Same Topic (Round 2) or Next Topic */}
        <div className="retry-cta-box">
          <div className="ruby-prose" style={{ fontWeight: 600 }}>
            <RubyText
              text={
                round === 1
                  ? feedback.retryPrompt
                  : '2回目[かいめ]のリトライまでお疲[つか]れさまでした！次[つぎ]のテーマにも挑戦[ちょうせん]してみましょう。'
              }
            />
          </div>

          <div className="retry-cta-actions">
            {round === 1 ? (
              <>
                <button
                  id="btn-start-round2"
                  type="button"
                  className="btn-primary"
                  onClick={onStartRound2}
                >
                  <RefreshCw size={15} />
                  <span>
                    <RubyText text="改善点[かいぜんてん]を意識[いしき]して2回目[かいめ]に挑戦[ちょうせん]する" />
                  </span>
                </button>
                <button
                  id="btn-skip-to-next-topic"
                  type="button"
                  className="btn-secondary"
                  onClick={onNextTopic}
                >
                  <span>
                    <RubyText text="別[べつ]のお題[だい]へ進[すす]む" />
                  </span>
                  <ArrowRight size={14} />
                </button>
              </>
            ) : (
              <>
                <button
                  id="btn-next-topic-after-r2"
                  type="button"
                  className="btn-primary"
                  onClick={onNextTopic}
                >
                  <span>
                    <RubyText text="新[あたら]しいお題[だい]に挑戦[ちょうせん]する" />
                  </span>
                  <ArrowRight size={15} />
                </button>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={onStartRound2}
                >
                  <RefreshCw size={14} />
                  <span>
                    <RubyText text="このテーマでもう一度[いちど]話[はな]す" />
                  </span>
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};
