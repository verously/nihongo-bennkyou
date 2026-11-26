import React from 'react';
import { BookOpen, History, Languages, Settings, Sparkles } from 'lucide-react';
import type { PracticeMode } from '../types';
import { RubyText } from '../utils/furigana';

interface HeaderBarProps {
  mode: PracticeMode;
  onModeChange: (mode: PracticeMode) => void;
  showFurigana: boolean;
  onToggleFurigana: () => void;
  hasApiKey: boolean;
  historyCount: number;
  onOpenHistory: () => void;
  onOpenSettings: () => void;
}

export const HeaderBar: React.FC<HeaderBarProps> = ({
  mode,
  onModeChange,
  showFurigana,
  onToggleFurigana,
  hasApiKey,
  historyCount,
  onOpenHistory,
  onOpenSettings,
}) => {
  return (
    <header className="top-header">
      <div className="top-header-inner">
        <div className="brand-block">
          <div className="brand-seal" aria-hidden="true">
            話
          </div>
          <div className="brand-titles">
            <h1>ことばスタジオ</h1>
            <p className="brand-subtitle">
              <RubyText text="日本語[にほんご]スピーキング練習[れんしゅう]コーチ" />
            </p>
          </div>
        </div>

        <nav className="mode-switcher" aria-label="練習モード選択">
          <button
            id="btn-mode-guided"
            type="button"
            className={`mode-btn ${mode === 'guided' ? 'active' : ''}`}
            onClick={() => onModeChange('guided')}
          >
            <BookOpen size={14} />
            <span>ステップガイド</span>
            <span className="mode-tag">N3</span>
          </button>
          <button
            id="btn-mode-free"
            type="button"
            className={`mode-btn ${mode === 'free' ? 'active' : ''}`}
            onClick={() => onModeChange('free')}
          >
            <Sparkles size={14} />
            <span>フリースピーチ</span>
            <span className="mode-tag">
              <RubyText text="中上級[ちゅうじょうきゅう]" />
            </span>
          </button>
        </nav>

        <div className="header-actions">
          <button
            id="btn-toggle-furigana"
            type="button"
            className={`util-btn ${showFurigana ? 'active' : ''}`}
            onClick={onToggleFurigana}
            aria-pressed={showFurigana}
          >
            <Languages size={15} />
            <span>ふりがな {showFurigana ? 'ON' : 'OFF'}</span>
          </button>

          <button
            id="btn-open-history"
            type="button"
            className="util-btn"
            onClick={onOpenHistory}
          >
            <History size={15} />
            <span>
              <RubyText text="履歴[りれき]" />
            </span>
            {historyCount > 0 && <span className="count-badge">{historyCount}</span>}
          </button>

          <button
            id="btn-open-settings"
            type="button"
            className="util-btn"
            onClick={onOpenSettings}
          >
            <span className={`status-dot ${hasApiKey ? 'connected' : ''}`} />
            <Settings size={15} />
            <span>
              {hasApiKey ? (
                <RubyText text="Gemini接続中[せつぞくちゅう]" />
              ) : (
                <RubyText text="API設定[せってい]" />
              )}
            </span>
          </button>
        </div>
      </div>
    </header>
  );
};
