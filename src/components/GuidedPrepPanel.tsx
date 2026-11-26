import React, { useEffect, useRef, useState } from 'react';
import { ArrowRight, Check, Mic, MicOff, SkipForward } from 'lucide-react';
import type { GuidedStep } from '../types';
import { RubyText } from '../utils/furigana';

interface GuidedPrepPanelProps {
  steps: GuidedStep[];
  notes: Record<string, string>;
  onUpdateNote: (stepId: string, value: string) => void;
  onFinishGuide: () => void;
}

export const GuidedPrepPanel: React.FC<GuidedPrepPanelProps> = ({
  steps,
  notes,
  onUpdateNote,
  onFinishGuide,
}) => {
  const [activeIdx, setActiveIdx] = useState(0);
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);

  const currentStep = steps[activeIdx] || steps[0];
  const speechSupported =
    typeof window !== 'undefined' &&
    Boolean((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);

  useEffect(() => {
    setActiveIdx(0);
    stopMiniVoice();
  }, [steps]);

  useEffect(() => {
    return () => {
      stopMiniVoice();
    };
  }, []);

  const stopMiniVoice = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // ignore
      }
      recognitionRef.current = null;
    }
    setIsListening(false);
  };

  const toggleMiniVoice = () => {
    if (!speechSupported || !currentStep) return;
    if (isListening) {
      stopMiniVoice();
      return;
    }

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const rec = new SpeechRecognition();
    rec.lang = 'ja-JP';
    rec.interimResults = false;
    rec.continuous = false;

    const targetStepId = currentStep.id;
    const existingText = notes[targetStepId] || '';

    rec.onresult = (event: any) => {
      let spoken = '';
      for (let i = 0; i < event.results.length; i++) {
        spoken += event.results[i][0].transcript;
      }
      const next = existingText ? `${existingText} ${spoken.trim()}` : spoken.trim();
      onUpdateNote(targetStepId, next);
    };

    rec.onend = () => {
      setIsListening(false);
      recognitionRef.current = null;
    };

    rec.onerror = () => {
      setIsListening(false);
      recognitionRef.current = null;
    };

    recognitionRef.current = rec;
    setIsListening(true);
    try {
      rec.start();
    } catch {
      setIsListening(false);
    }
  };

  const handleNext = () => {
    stopMiniVoice();
    if (activeIdx < steps.length - 1) {
      setActiveIdx((prev) => prev + 1);
    } else {
      onFinishGuide();
    }
  };

  if (!currentStep) return null;

  return (
    <section className="surface-card section-card" aria-label="ステップガイド">
      <div className="section-header">
        <h2 className="section-title">
          <span className="section-step-badge">STEP 1</span>
          <RubyText text="質問[しつもん]に答[こた]えて考[かんが]えを整理[せいり]しよう" />
        </h2>
        <button
          id="btn-skip-guide"
          type="button"
          className="btn-ghost"
          onClick={() => {
            stopMiniVoice();
            onFinishGuide();
          }}
        >
          <SkipForward size={14} />
          <span>
            <RubyText text="すぐ本番[ほんばん]へ" />
          </span>
        </button>
      </div>

      {/* 3-Step Indicator */}
      <div className="guide-stepper" role="tablist" aria-label="ガイドのステップ">
        {steps.map((step, idx) => {
          const hasMemo = Boolean((notes[step.id] || '').trim());
          const isCurrent = idx === activeIdx;
          const isDone = idx < activeIdx || hasMemo;
          return (
            <button
              key={step.id}
              id={`btn-guide-step-${idx + 1}`}
              type="button"
              role="tab"
              aria-selected={isCurrent}
              className={`guide-step-pill ${isCurrent ? 'active' : isDone ? 'done' : ''}`}
              onClick={() => {
                stopMiniVoice();
                setActiveIdx(idx);
              }}
            >
              <span className="step-num">
                {!isCurrent && hasMemo ? <Check size={12} /> : idx + 1}
              </span>
              <span>
                <RubyText text={step.stageLabel} />
              </span>
            </button>
          );
        })}
      </div>

      {/* Active Guiding Question */}
      <div className="guide-question-box">
        <p className="guide-question-text ruby-prose" id="guide-active-question">
          <RubyText text={currentStep.question} />
        </p>

        <div className="guide-memo-row">
          <textarea
            id="textarea-guide-memo"
            className="guide-textarea"
            value={notes[currentStep.id] || ''}
            onChange={(e) => onUpdateNote(currentStep.id, e.target.value)}
            placeholder={currentStep.placeholder}
            aria-label="自分のキーワードメモ"
          />

          <div className="guide-actions-bar">
            {speechSupported ? (
              <button
                id="btn-guide-voice-memo"
                type="button"
                className={`voice-mini-btn ${isListening ? 'listening' : ''}`}
                onClick={toggleMiniVoice}
              >
                {isListening ? <MicOff size={14} /> : <Mic size={14} />}
                <span>
                  {isListening ? (
                    <RubyText text="聞[き]き取[と]り中[ちゅう]...（クリックで停止[ていし]）" />
                  ) : (
                    <RubyText text="声[こえ]で短[みじか]くメモする" />
                  )}
                </span>
              </button>
            ) : (
              <span style={{ fontSize: 12, color: 'var(--ink-muted)' }}>
                <RubyText text="※ 頭[あたま]の中[なか]で考[かんが]えるだけでもOKです" />
              </span>
            )}

            <button
              id="btn-guide-next"
              type="button"
              className="btn-primary"
              onClick={handleNext}
            >
              <span>
                {activeIdx < steps.length - 1 ? (
                  <RubyText text="次[つぎ]の質問[しつもん]へ" />
                ) : (
                  <RubyText text="まとまった！30〜60秒[びょう]で話[はな]す" />
                )}
              </span>
              <ArrowRight size={15} />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};
