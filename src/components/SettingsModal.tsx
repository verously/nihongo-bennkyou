import React, { useState } from 'react';
import { CheckCircle2, Eye, EyeOff, ExternalLink, Loader2, X, XCircle } from 'lucide-react';
import type { AppSettings } from '../types';
import { RubyText } from '../utils/furigana';
import { testGeminiConnection } from '../services/geminiService';

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
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    const res = await testGeminiConnection(draft.apiKey, draft.model);
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
            <label className="form-label" htmlFor="select-gemini-model">
              <RubyText text="使用[しよう]モデル" />
            </label>
            <select
              id="select-gemini-model"
              className="select-input"
              value={draft.model}
              onChange={(e) => setDraft({ ...draft, model: e.target.value })}
            >
              <option value="gemini-2.5-flash">gemini-2.5-flash（おすすめ・高速・音声対応）</option>
              <option value="gemini-2.5-pro">gemini-2.5-pro（高精度な添削向け）</option>
              <option value="gemini-2.0-flash">gemini-2.0-flash（軽量）</option>
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
                  <RubyText text="Google検索[けんさく]を使[つか]って信頼[しんらい]できる統計[とうけい]グラフ作成[さくせい]や、発言中[はつげんちゅう]の事実[じじつ]チェックを行[おこな]います。" />
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
              onClick={handleTest}
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
