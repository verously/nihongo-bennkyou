import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  Edit3,
  Loader2,
  Mic,
  RotateCcw,
  Send,
  Square,
  Volume2,
} from 'lucide-react';
import type { GuidedStep } from '../types';
import { RubyText } from '../utils/furigana';

interface RecorderStudioProps {
  round: 1 | 2;
  hasApiKey: boolean;
  isSubmitting: boolean;
  guidedSteps?: GuidedStep[];
  guideNotes?: Record<string, string>;
  onEditGuide?: () => void;
  onSubmitSpeech: (payload: {
    audioBlob: Blob | null;
    audioUrl?: string;
    liveTranscript: string;
    durationSec: number;
  }) => void;
}

const MAX_BAR_SECONDS = 75;
const WAVE_BAR_COUNT = 16;

function formatTimer(totalSec: number): string {
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export const RecorderStudio: React.FC<RecorderStudioProps> = ({
  round,
  hasApiKey,
  isSubmitting,
  guidedSteps,
  guideNotes,
  onEditGuide,
  onSubmitSpeech,
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [elapsedSec, setElapsedSec] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | undefined>(undefined);
  const [transcript, setTranscript] = useState('');
  const [interimText, setInterimText] = useState('');
  const [micError, setMicError] = useState<string | null>(null);
  const [waveLevels, setWaveLevels] = useState<number[]>(
    Array.from({ length: WAVE_BAR_COUNT }, () => 18)
  );

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const timerRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const rafRef = useRef<number | null>(null);
  const recognitionRef = useRef<any>(null);
  const isRecordingRef = useRef<boolean>(false);

  const cleanupMedia = useCallback(() => {
    isRecordingRef.current = false;
    if (timerRef.current) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    if (recognitionRef.current) {
      try {
        recognitionRef.current.onend = null;
        recognitionRef.current.stop();
      } catch {
        // ignore
      }
      recognitionRef.current = null;
    }
    if (audioCtxRef.current) {
      audioCtxRef.current.close().catch(() => {});
      audioCtxRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setWaveLevels(Array.from({ length: WAVE_BAR_COUNT }, () => 18));
    setInterimText('');
  }, []);

  useEffect(() => {
    return () => {
      cleanupMedia();
    };
  }, [cleanupMedia]);

  const startSpeechRecognition = () => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    const createAndStart = () => {
      if (!isRecordingRef.current) return;
      const rec = new SpeechRecognition();
      rec.lang = 'ja-JP';
      rec.continuous = true;
      rec.interimResults = true;

      rec.onresult = (event: any) => {
        let finalAdd = '';
        let interim = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const piece = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalAdd += piece;
          } else {
            interim += piece;
          }
        }
        if (finalAdd) {
          setTranscript((prev) => (prev ? `${prev}${finalAdd}` : finalAdd));
        }
        setInterimText(interim);
      };

      rec.onend = () => {
        // Chrome automatically stops recognition after pauses — restart seamlessly while recording!
        if (isRecordingRef.current) {
          try {
            createAndStart();
          } catch {
            // ignore
          }
        }
      };

      rec.onerror = () => {
        // Keep audio recording going even if browser speech recognition hits a snag
      };

      recognitionRef.current = rec;
      try {
        rec.start();
      } catch {
        // ignore
      }
    };

    createAndStart();
  };

  const startRecording = useCallback(async () => {
    setMicError(null);
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
      setAudioUrl(undefined);
    }
    setAudioBlob(null);
    setElapsedSec(0);
    setTranscript('');
    setInterimText('');
    chunksRef.current = [];

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setMicError(
        'このブラウザではマイク録音機能が利用できません。下のテキスト欄に直接入力して練習することもできます。'
      );
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const mimeCandidates = [
        'audio/webm;codecs=opus',
        'audio/webm',
        'audio/mp4',
        'audio/ogg',
      ];
      const supportedMime = mimeCandidates.find((m) =>
        typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(m)
      );

      const recorder = supportedMime
        ? new MediaRecorder(stream, { mimeType: supportedMime })
        : new MediaRecorder(stream);

      recorder.ondataavailable = (ev) => {
        if (ev.data && ev.data.size > 0) {
          chunksRef.current.push(ev.data);
        }
      };

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, {
          type: recorder.mimeType || 'audio/webm',
        });
        setAudioBlob(blob);
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);
      };

      mediaRecorderRef.current = recorder;
      recorder.start(250);
      isRecordingRef.current = true;
      setIsRecording(true);
      startTimeRef.current = Date.now();

      timerRef.current = window.setInterval(() => {
        const sec = Math.floor((Date.now() - startTimeRef.current) / 1000);
        setElapsedSec(sec);
      }, 250);

      // Audio visualizer via AnalyserNode
      try {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        const ctx = new AudioCtx();
        audioCtxRef.current = ctx;
        const source = ctx.createMediaStreamSource(stream);
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 64;
        source.connect(analyser);
        const freqData = new Uint8Array(analyser.frequencyBinCount);

        const tick = () => {
          if (!isRecordingRef.current) return;
          analyser.getByteFrequencyData(freqData);
          const bars: number[] = [];
          for (let i = 0; i < WAVE_BAR_COUNT; i++) {
            const val = freqData[i % freqData.length] || 0;
            bars.push(Math.max(16, Math.min(100, Math.round((val / 255) * 100))));
          }
          setWaveLevels(bars);
          rafRef.current = requestAnimationFrame(tick);
        };
        rafRef.current = requestAnimationFrame(tick);
      } catch {
        // Visualizer is purely decorative; recording still works without it
      }

      startSpeechRecognition();
    } catch (err: any) {
      setMicError(
        err?.name === 'NotAllowedError'
          ? 'マイクの使用が許可されていません。ブラウザのアドレスバー付近からマイクを許可するか、下のテキスト欄に入力して試すこともできます。'
          : 'マイクが見つかりませんでした。マイクを接続するか、下のテキスト欄に入力してお試しください。'
      );
      cleanupMedia();
    }
  }, [audioUrl, cleanupMedia]);

  const stopRecording = useCallback(() => {
    isRecordingRef.current = false;
    setIsRecording(false);
    const finalSec = Math.max(1, Math.round((Date.now() - startTimeRef.current) / 1000));
    setElapsedSec(finalSec);

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    cleanupMedia();
  }, [cleanupMedia]);

  // Desktop Spacebar shortcut to toggle recording when not typing inside an input/textarea
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code !== 'Space') return;
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || tag === 'BUTTON') {
        return;
      }
      e.preventDefault();
      if (isRecordingRef.current) {
        stopRecording();
      } else if (!isSubmitting) {
        startRecording();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isSubmitting, startRecording, stopRecording]);

  const handleReset = () => {
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
      setAudioUrl(undefined);
    }
    setAudioBlob(null);
    setElapsedSec(0);
    setTranscript('');
    setInterimText('');
    setMicError(null);
  };

  const handleSubmit = () => {
    const combinedTranscript = `${transcript}${interimText}`.trim();
    const effectiveDuration =
      elapsedSec > 0 ? elapsedSec : Math.max(15, Math.round(combinedTranscript.length / 4));
    onSubmitSpeech({
      audioBlob,
      audioUrl,
      liveTranscript: combinedTranscript,
      durationSec: effectiveDuration,
    });
  };

  const inTarget = elapsedSec >= 30 && elapsedSec <= 60;
  const overTarget = elapsedSec > 60;
  const barPct = Math.min(100, Math.round((elapsedSec / MAX_BAR_SECONDS) * 100));

  const filledGuideNotes =
    guidedSteps && guideNotes
      ? guidedSteps
          .map((s) => ({ step: s, note: (guideNotes[s.id] || '').trim() }))
          .filter((item) => item.note.length > 0)
      : [];

  const canSubmit = !isRecording && !isSubmitting && (Boolean(audioBlob) || transcript.trim().length > 0);

  return (
    <section className="surface-card section-card" aria-label="スピーチ録音スタジオ">
      <div className="section-header">
        <h2 className="section-title">
          <span className="section-step-badge">
            {round === 1 ? 'SPEECH' : 'RETRY'}
          </span>
          {round === 1 ? (
            <RubyText text="30〜60秒[びょう]で話[はな]してみよう" />
          ) : (
            <RubyText text="改善点[かいぜんてん]を意識[いしき]して2回目[かいめ]を話[はな]そう" />
          )}
        </h2>
      </div>

      {/* Show learner's OWN memos from Step-by-Step Guide (zero AI answers!) */}
      {filledGuideNotes.length > 0 && (
        <div className="own-memo-summary">
          <div className="own-memo-header">
            <p className="own-memo-title">
              <RubyText text="あなたが整理[せいり]した構成[こうせい]メモ（これを見[み]ながら話[はな]せます）" />
            </p>
            {onEditGuide && (
              <button type="button" className="btn-ghost" onClick={onEditGuide}>
                <Edit3 size={13} />
                <span>
                  <RubyText text="メモを編集[へんしゅう]" />
                </span>
              </button>
            )}
          </div>
          <div className="own-memo-list">
            {filledGuideNotes.map(({ step, note }) => (
              <div key={step.id} className="own-memo-item">
                <span className="own-memo-tag">
                  <RubyText text={step.stageLabel} />
                </span>
                <span>{note}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="recorder-stage">
        {/* 30-60s Visual Pace Timer */}
        <div className="timer-panel">
          <div className="timer-top-row">
            <div
              id="speech-timer-display"
              className={`timer-readout ${
                inTarget
                  ? 'in-target'
                  : overTarget
                    ? 'over-target'
                    : isRecording
                      ? 'recording'
                      : ''
              }`}
            >
              {formatTimer(elapsedSec)}
            </div>
            <div className="timer-target-label">
              <RubyText text="目標[もくひょう]：30秒[びょう] 〜 60秒[びょう]" />
            </div>
          </div>

          <div className="pace-bar-wrap" aria-hidden="true">
            <div className="pace-target-zone" />
            <div
              className={`pace-fill ${
                inTarget ? 'in-target' : overTarget ? 'over-target' : ''
              }`}
              style={{ width: `${barPct}%` }}
            />
          </div>

          <div className="pace-scale">
            <span>0s</span>
            <span>30s</span>
            <span>60s</span>
            <span>75s</span>
          </div>

          <p
            className={`pace-guidance ${
              inTarget ? 'in-target' : overTarget ? 'over-target' : ''
            }`}
          >
            {!isRecording && elapsedSec === 0 && (
              <RubyText text="準備[じゅんび]ができたら「録音[ろくおん]を始[はじ]める」を押[お]して話[はな]してください。" />
            )}
            {isRecording && elapsedSec < 30 && (
              <RubyText text="良[よ]いペースです！理由[りゆう]や自分[じぶん]の経験[けいけん]も足[た]して30秒[びょう]を目指[めざ]しましょう。" />
            )}
            {inTarget && (
              <RubyText text="ちょうどいい長[なが]さ（30〜60秒[びょう]）です！きりのいいところでまとめましょう。" />
            )}
            {overTarget && (
              <RubyText text="60秒[びょう]を超[こ]えました。そろそろ最後[さいご]のまとめに入[はい]りましょう。" />
            )}
            {!isRecording && elapsedSec > 0 && elapsedSec < 30 && (
              <RubyText text={`録音時間[ろくおんじかん]は${elapsedSec}秒[びょう]です。このまま送[おく]ることも、撮[と]り直[なお]すこともできます。`} />
            )}
          </p>
        </div>

        {/* Record / Stop Trigger + Waveform */}
        <div className="recorder-action-row">
          <div className="record-trigger-group">
            {!isRecording ? (
              <button
                id="btn-record-start"
                type="button"
                className="record-btn"
                onClick={startRecording}
                disabled={isSubmitting}
              >
                <Mic size={19} />
                <span>
                  {audioBlob ? (
                    <RubyText text="もう 一度[いちど] 録音[ろくおん]する" />
                  ) : (
                    <RubyText text="録音[ろくおん]を始[はじ]める" />
                  )}
                </span>
              </button>
            ) : (
              <button
                id="btn-record-stop"
                type="button"
                className="record-btn is-recording"
                onClick={stopRecording}
              >
                <Square size={16} fill="currentColor" />
                <span>
                  <RubyText text="録音[ろくおん]を止[と]める" />
                </span>
              </button>
            )}

            <span className="shortcut-hint">
              <span className="kbd-chip">Space</span>{' '}
              <RubyText text="で開始[かいし]・停止[ていし]" />
            </span>
          </div>

          <div className="waveform-bars" aria-hidden="true">
            {waveLevels.map((lvl, idx) => (
              <div
                key={idx}
                className={`wave-bar ${isRecording ? 'active' : ''}`}
                style={{ height: `${Math.max(16, lvl)}%` }}
              />
            ))}
          </div>
        </div>

        {micError && (
          <div className="inline-alert warn" role="alert">
            <AlertCircle size={16} style={{ flexShrink: 0, marginTop: 2 }} />
            <span>{micError}</span>
          </div>
        )}

        {/* Playback of Learner's Recorded Audio */}
        {audioUrl && !isRecording && (
          <div className="audio-playback-box">
            <div className="audio-playback-header">
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <Volume2 size={15} />
                <RubyText text="録音[ろくおん]した音声[おんせい]を聞[き]き直[なお]す" />
              </span>
              <span style={{ fontSize: 12, color: 'var(--matsuba-ok)' }}>
                {hasApiKey ? (
                  <RubyText text="この音声[おんせい]をそのままGeminiに送信[そうしん]します" />
                ) : (
                  <RubyText text="録音[ろくおん]完了[かんりょう]（デモモード）" />
                )}
              </span>
            </div>
            <audio controls src={audioUrl} />
          </div>
        )}

        {/* Live Transcript / Fallback Text Box */}
        <div className="transcript-field-wrap">
          <div className="transcript-label-row">
            <label htmlFor="textarea-speech-transcript">
              <RubyText text="リアルタイム文字起[もじお]こし（補助[ほじょ]メモ・マイクなし入力[にゅうりょく]にも対応[たいおう]）" />
            </label>
            <span style={{ fontSize: 11.5, color: 'var(--ink-muted)' }}>
              {`${transcript}${interimText}`.length}
              <RubyText text="文字[もじ]" />
            </span>
          </div>
          <textarea
            id="textarea-speech-transcript"
            className="transcript-textarea"
            value={isRecording ? `${transcript}${interimText}` : transcript}
            onChange={(e) => setTranscript(e.target.value)}
            readOnly={isRecording}
            placeholder="録音するとここに日本語が自動で表示されます（Chrome / Edge推奨）。マイクを使えないときは、ここに直接話したい文を入力してテストすることもできます。"
          />
        </div>

        {/* Submit Actions */}
        <div className="submit-bar">
          <button
            id="btn-reset-recording"
            type="button"
            className="btn-secondary"
            onClick={handleReset}
            disabled={isRecording || isSubmitting || (!audioBlob && !transcript)}
          >
            <RotateCcw size={14} />
            <span>
              <RubyText text="やり直[なお]す" />
            </span>
          </button>

          <button
            id="btn-submit-speech"
            type="button"
            className="btn-primary"
            onClick={handleSubmit}
            disabled={!canSubmit}
          >
            {isSubmitting ? (
              <>
                <Loader2 size={15} className="spin" />
                <span>
                  <RubyText text="コーチが分析中[ぶんせきちゅう]..." />
                </span>
              </>
            ) : (
              <>
                <Send size={15} />
                <span>
                  <RubyText text="コーチに送[おく]ってフィードバックをもらう" />
                </span>
              </>
            )}
          </button>
        </div>
      </div>
    </section>
  );
};
