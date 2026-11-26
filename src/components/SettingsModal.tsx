import React, { useState } from 'react';
import {
  CheckCircle2,
  Eye,
  EyeOff,
  ExternalLink,
  Loader2,
  RefreshCw,
  X,
  XCircle,
} from 'lucide-react';
import type { AppSettings } from '../types';
import { RubyText } from '../utils/furigana';
import {
  fetchAvailableGeminiModels,
  RECOMMENDED_MODELS,
  testGeminiConnection,
  type GeminiModelOption,
} from '../services/geminiService';

interface SettingsModalProps {
  settings: AppSettings;
  onSave: (next: AppSettings) => void;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  settings,
  onSave,
  onClose,
}) => {
  const [draft, setDraft] = useState<AppSettings>(settings);
  const [showKey, setShowKey] = useState(false);
  const [modelOptions, setModelOptions] = useState<GeminiModelOption[]>(() => {
    const exists = RECOMMENDED_MODELS.some((m) => m.id === settings.model);
    return exists
      ? RECOMMENDED_MODELS
      : [{ id: settings.model, label: settings.model }, ...RECOMMENDED_MODELS];
  });
  const [loadingModels, setLoadingModels] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    ok: boolean;
    message: string;
    suggestedModel?: string;
  } | null>(null);

  const handleRefreshModels = async () => {
    if (!draft.apiKey.trim()) return;
    setLoadingModels(true);
    setTestResult(null);
    try {
      const liveModels = await fetchAvailableGeminiModels(draft.apiKey);
      setModelOptions(liveModels);
      if (!liveModels.some((m) => m.id === draft.model) && liveModels[0]) {
        setDraft((prev) => ({ ...prev, model: liveModels[0].id }));
      }
      setTestResult({
        ok: true,
        message: `利用可能なモデル一覧（${liveModels.length}件）を取得しました。`,
      });
    } catch (err: any) {
      setTestResult({
        ok: false,
        message: err?.message || 'モデル一覧の取得に失敗しました。',
      });
    } finally {
      setLoadingModels(false);
    }
  };

  const handleTest = async (modelOverride?: string) => {
    const targetModel = modelOverride || draft.model;
    setTesting(true);
    setTestResult(null);
    const res = await testGeminiConnection(draft.apiKey, targetModel);
    // If Gemini explicitly suggested a newer model, automatically switch and retest once!
    if (!res.ok && res.suggestedModel && !modelOverride) {
      const nextModel = res.suggestedModel;
      setModelOptions((prev) =>
        prev.some((m) => m.id === nextModel)
          ? prev
          : [{ id: nextModel, label: `${nextModel}（自動検出）` }, ...prev]
      );
      setDraft((prev) => ({ ...prev, model: nextModel }));
      const retryRes = await testGeminiConnection(draft.apiKey, nextModel);
      setTestResult(retryRes);
      setTesting(false);
      return;
    }
    setTestResult(res);
    setTesting(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({ ...draft, apiKey: draft.apiKey.trim() });
    onClose();
  };

  return (
    <div
      className="modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="settings-modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="modal-dialog">
        <div className="modal-header">
          <h2 id="settings-modal-title" className="modal-title">
            <RubyText text="Gemini API 設定[せってい]" />
          </h2>
          <button
            id="btn-close-settings"
            type="button"
            className="btn-ghost"
            onClick={onClose}
            aria-label="閉じる"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label" htmlFor="input-gemini-apikey">
              Gemini API Key
            </label>
            <div className="input-row">
              <input
                id="input-gemini-apikey"
                type={showKey ? 'text' : 'password'}
                className="text-input"
                value={draft.apiKey}
                onChange={(e) => setDraft({ ...draft, apiKey: e.target.value })}
                placeholder="AIzaSy..."
                autoComplete="off"
              />
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setShowKey((v) => !v)}
                aria-label="キーの表示切り替え"
              >
                {showKey ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
            <p className="form-hint">
              <RubyText text="キーはこのパソコンのブラウザ内[ない]（localStorage）だけに保存[ほぞん]され、外部[がいぶ]サーバーには送信[そうしん]されません。" />
              <br />
              <a
                href="https://aistudio.google.com/apikey"
                target="_blank"
                rel="noreferrer"
                style={{ display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 4 }}
              >
                <span>Google AI Studio でAPIキーを取得する</span>
                <ExternalLink size={12} />
              </a>
            </p>
          </div>

          <div className="form-group">
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 6,
                gap: 8,
              }}
            >
              <label className="form-label" htmlFor="select-gemini-model" style={{ marginBottom: 0 }}>
                <RubyText text="使用[しよう]モデル" />
              </label>
              <button
                id="btn-fetch-models"
                type="button"
                className="btn-ghost"
                onClick={handleRefreshModels}
                disabled={loadingModels || !draft.apiKey.trim()}
                style={{ fontSize: 12, padding: '3px 8px' }}
              >
                {loadingModels ? (
                  <Loader2 size={13} className="spin" />
                ) : (
                  <RefreshCw size={13} />
                )}
                <span>
                  <RubyText text="最新[さいしん]モデル一覧[いちらん]を取得[しゅとく]" />
                </span>
              </button>
            </div>
            <select
              id="select-gemini-model"
              className="select-input"
              value={draft.model}
              onChange={(e) => setDraft({ ...draft, model: e.target.value })}
            >
              {modelOptions.map((opt) => (
                <option key={opt.id} value={opt.id}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="checkbox-row">
              <input
                type="checkbox"
                checked={draft.enableSearchGrounding}
                onChange={(e) =>
                  setDraft({ ...draft, enableSearchGrounding: e.target.checked })
                }
              />
              <span>
                <strong>
                  <RubyText text="Web検索[けんさく]で統計[とうけい]データ取得[しゅとく]・事実確認[じじつかくにん]を行[おこな]う" />
                </strong>
                <div className="form-hint" style={{ marginTop: 2 }}>
                  <RubyText text="Google検索[けんさく]を使[つか]って信頼[しんらい]できる統計[とうけい]グラフ作成[さくせい]や、発言中[はつげんちゅう]の事実[じじつ]チェックを行[おこな]います（無料枠[むりょうわく]で制限[せいげん]された場合[ばあい]は自動[じどう]で通常添削[つうじょうてんさく]に切[き]り替[か]わります）。" />
                </div>
              </span>
            </label>
          </div>

          <div className="form-group">
            <label className="checkbox-row">
              <input
                type="checkbox"
                checked={draft.enableAiPhotoGen}
                onChange={(e) =>
                  setDraft({ ...draft, enableAiPhotoGen: e.target.checked })
                }
              />
              <span>
                <strong>
                  <RubyText text="新[あたら]しいお題[だい]でAI写真[しゃしん]を自動生成[じどうせいせい]する" />
                </strong>
                <div className="form-hint" style={{ marginTop: 2 }}>
                  <RubyText text="オフの場合[ばあい]や無料枠[むりょうわく]で画像生成[がぞうせいせい]が使[つか]えない場合[ばあい]は、アプリ内蔵[ないぞう]の日本[にほん]の風景写真[ふうけいしゃしん]を自動[じどう]で使[つか]います。" />
                </div>
              </span>
            </label>
          </div>

          {testResult && (
            <div
              className={`inline-alert ${testResult.ok ? 'info' : 'error'}`}
              style={{ marginBottom: 16 }}
            >
              {testResult.ok ? (
                <CheckCircle2 size={16} style={{ flexShrink: 0, marginTop: 2 }} />
              ) : (
                <XCircle size={16} style={{ flexShrink: 0, marginTop: 2 }} />
              )}
              <span>{testResult.message}</span>
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
            <button
              id="btn-test-gemini"
              type="button"
              className="btn-secondary"
              onClick={() => handleTest()}
              disabled={testing || !draft.apiKey.trim()}
            >
              {testing && <Loader2 size={14} className="spin" />}
              <span>
                <RubyText text="接続[せつぞく]テスト" />
              </span>
            </button>

            <div style={{ display: 'flex', gap: 8 }}>
              <button type="button" className="btn-ghost" onClick={onClose}>
                <RubyText text="キャンセル" />
              </button>
              <button id="btn-save-settings" type="submit" className="btn-primary">
                <RubyText text="設定[せってい]を保存[ほぞん]" />
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
