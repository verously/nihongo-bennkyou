import React from 'react';
import { Clock, Trash2, X } from 'lucide-react';
import { CATEGORY_LABELS, type HistorySession } from '../types';
import { RubyText } from '../utils/furigana';

interface HistoryDrawerProps {
  sessions: HistorySession[];
  onSelectSession: (session: HistorySession) => void;
  onClearHistory: () => void;
  onClose: () => void;
}

export const HistoryDrawer: React.FC<HistoryDrawerProps> = ({
  sessions,
  onSelectSession,
  onClearHistory,
  onClose,
}) => {
  return (
    <div
      className="drawer-backdrop"
      role="dialog"
      aria-modal="true"
      aria-label="練習履歴"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="drawer-panel">
        <div className="drawer-header">
          <h2 className="modal-title">
            <RubyText text="練習[れんしゅう]の履歴[りれき]" />
          </h2>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            {sessions.length > 0 && (
              <button
                id="btn-clear-history"
                type="button"
                className="btn-ghost"
                onClick={onClearHistory}
                style={{ color: 'var(--shu-accent)' }}
              >
                <Trash2 size={14} />
                <span>
                  <RubyText text="全削除[ぜんさくじょ]" />
                </span>
              </button>
            )}
            <button
              id="btn-close-history"
              type="button"
              className="btn-ghost"
              onClick={onClose}
              aria-label="閉じる"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="drawer-body">
          {sessions.length === 0 ? (
            <div
              style={{
                textAlign: 'center',
                padding: '44px 16px',
                color: 'var(--ink-muted)',
                fontSize: 14,
              }}
            >
              <Clock size={28} style={{ opacity: 0.45, marginBottom: 10 }} />
              <p style={{ margin: 0 }}>
                <RubyText text="まだ練習[れんしゅう]の記録[きろく]がありません。1回[かい]スピーチを終[お]えるとここに保存[ほぞん]されます。" />
              </p>
            </div>
          ) : (
            sessions.map((s) => (
              <div
                key={s.id}
                className="history-item"
                onClick={() => {
                  onSelectSession(s);
                  onClose();
                }}
              >
                <div className="history-item-meta">
                  <span className="category-tag">
                    <RubyText text={CATEGORY_LABELS[s.topic.category]} />
                  </span>
                  <span>{s.date}</span>
                  <span>
                    <RubyText text={`${s.attempts.length}回[かい]録音[ろくおん]`} />
                  </span>
                </div>
                <div className="history-item-title ruby-prose">
                  <RubyText text={s.topic.title} />
                </div>
                {s.attempts[s.attempts.length - 1] && (
                  <p
                    style={{
                      margin: 0,
                      fontSize: 12.5,
                      color: 'var(--ink-secondary)',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {s.attempts[s.attempts.length - 1].feedback.transcript}
                  </p>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
