import React from 'react';
import type { ChartData } from '../types';
import { RubyText } from '../utils/furigana';

interface StatChartProps {
  chart: ChartData;
}

export const StatChart: React.FC<StatChartProps> = ({ chart }) => {
  const maxVal = Math.max(...chart.items.map((i) => Number(i.value) || 0), 1);

  return (
    <div className="chart-card" role="figure" aria-label={chart.title}>
      <h3 className="chart-title ruby-prose">
        <RubyText text={chart.title} />
      </h3>
      {chart.subtitle && (
        <p className="chart-subtitle">
          <RubyText text={chart.subtitle} />
        </p>
      )}

      {chart.chartType === 'horizontalBar' ? (
        <div className="chart-bars-horizontal">
          {chart.items.map((item, idx) => {
            const pct = Math.max(4, Math.round((item.value / maxVal) * 100));
            return (
              <div key={`${item.label}-${idx}`} className="hbar-row">
                <div className="hbar-label">{item.label}</div>
                <div className="hbar-track">
                  <div
                    className={`hbar-fill ${item.highlight ? 'highlight' : ''}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <div className="hbar-value">
                  {item.value}
                  {chart.unit}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <>
          <div className="chart-bars-vertical">
            {chart.items.map((item, idx) => {
              const pct = Math.max(8, Math.round((item.value / maxVal) * 100));
              return (
                <div key={`${item.label}-${idx}`} className="vbar-col">
                  <div className="vbar-value">
                    {item.value}
                    {chart.unit}
                  </div>
                  <div className="vbar-track">
                    <div
                      className={`vbar-fill ${item.highlight ? 'highlight' : ''}`}
                      style={{ height: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
          <div className="vbar-labels">
            {chart.items.map((item, idx) => (
              <div key={`lbl-${item.label}-${idx}`} className="vbar-label">
                {item.label}
              </div>
            ))}
          </div>
        </>
      )}

      <div className="chart-source">
        <span>
          <RubyText text={`出典[しゅってん]：${chart.sourceName}`} />
        </span>
        {chart.year && <span>{chart.year}</span>}
      </div>
    </div>
  );
};
