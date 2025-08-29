import React from 'react';
import { ResponsiveContainer, Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Tooltip } from 'recharts';
import type { Element } from '../types/fpl';
import styles from './MultiAreaRadar.module.css';

interface MultiAreaRadarProps {
  player: Element | Element[];
  showTitle?: boolean;
  height?: number;
  width?: number | string;
}

const METRICS = [
  {
    key: 'defensive_contributions_per_90',
    label: 'DefCon/90',
    max: 10,
    normalize: (v: number) => v / 10,
  },
  {
    key: 'clean_sheets_per_90',
    label: 'CS/90',
    max: 1,
    normalize: (v: number) => v / 1,
  },
  {
    key: 'expected_goals_conceded_per_90',
    label: 'xGC/90',
    max: 1,
    normalize: (v: number) => v / 1,
  },
  {
    label: 'CBI/90',
    max: 10,
    normalize: (v: number) => v / 10,
    custom: (p: Element) => p.minutes ? (Number(p.clearances_blocks_interceptions) / p.minutes) * 90 : 0,
  },
  {
    label: 'Tackles/90',
    max: 10,
    normalize: (v: number) => v / 10,
    custom: (p: Element) => p.minutes ? (Number(p.tackles) / p.minutes) * 90 : 0,
  },
  {
    label: 'Recoveries/90',
    max: 10,
    normalize: (v: number) => v / 10,
    custom: (p: Element) => p.minutes ? (Number(p.recoveries) / p.minutes) * 90 : 0,
  },
];

const COLORS = [
  "#bd57ed", "#8884d8", "#82ca9d", "#ffc658", "#e7e0d9ff", "#00c49f", "#ff4f81", "#d17e7eff",
  "#1f77b4", "#ff7f0e", "#2ca02c", "#d62728", "#9467bd", "#8c564b", "#e377c2", "#7f7f7f",
  "#bcbd22", "#17becf", "#393b79", "#637939"
];

// Custom Tooltip using MultiAreaRadar.module.css
const CustomTooltip = ({ payload, label }: any) => {
  if (!payload || !payload.length) return null;
  return (
    <div>
      <div className={styles['multi-area-radar-tooltip-header']}>{label}</div>
      <div className={styles['multi-area-radar-tooltip-content']}>
        {payload.map((entry: any) => (
          <div key={entry.name} className={styles['multi-area-radar-tooltip-player']}>
            <span
              style={{
                display: 'inline-block',
                width: 14,
                height: 14,
                borderRadius: '50%',
                background: entry.color,
                marginRight: 8,
                verticalAlign: 'middle',
                flexShrink: 0,
              }}
            />
            <span className={styles['multi-area-radar-tooltip-label']}>{entry.name}</span>
            <span className={styles['multi-area-radar-tooltip-value']}>{entry.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

const MultiAreaRadarDefence: React.FC<MultiAreaRadarProps> = ({ player, showTitle, height, width }) => {
  const players: Element[] = Array.isArray(player) ? player : [player];

  // Responsive settings
  const isSmallScreen = typeof window !== "undefined" && window.innerWidth < 600;
  const chartHeight = typeof height === 'number' ? height : (isSmallScreen ? 260 : 550);
  const chartWidth = width ?? '100%';
  const chartCx = isSmallScreen ? "53%" : "50%";
  const angleAxisFontSize = isSmallScreen ? 8 : 11;
  const radiusAxisFontSize = isSmallScreen ? 7 : 10;

  const data = METRICS.map(metric => {
    const entry: { metric: string; [playerName: string]: number | string } = {
      metric: metric.label,
    };
    players.forEach(p => {
      let rawValue: number;
      if (metric.custom) {
        rawValue = metric.custom(p);
      } else {
        rawValue = Number(p[metric.key as keyof Element]) || 0;
      }
      // Normalise and round to 2 decimal places (do NOT cap at 1)
      let normValue = metric.normalize(rawValue);
      normValue = Number(normValue.toFixed(2));
      entry[p.web_name] = normValue;
    });
    return entry;
  });

  return (
    <div
      style={{
        width: '100%',
        maxWidth: width || (isSmallScreen ? 320 : 500),
        margin: '0 auto',
      }}
    >
      {showTitle && (
        <h3 style={{ color: '#fff', marginTop: 0, marginBottom: 0, textAlign: 'center' }}>
          Defensive Summary
        </h3>
      )}
      <div style={{ marginTop: -12 }}>
        <ResponsiveContainer width={chartWidth} height={chartHeight}>
          <RadarChart
            cx={chartCx}
            cy="50%"
            data={data}
          >
            <PolarGrid />
            <PolarAngleAxis
              dataKey="metric"
              tick={{
                fontSize: angleAxisFontSize,
                fontFamily: 'inherit',
                fill: '#fff',
              }}
              tickLine={false}
            />
            <PolarRadiusAxis
              angle={0}
              tick={{
                fontSize: radiusAxisFontSize,
                fontFamily: 'inherit',
                fill: '#aaa',
              }}
            />
            <Tooltip
              content={CustomTooltip}
              wrapperClassName={styles['multi-area-radar-tooltip-wrapper']}
              cursor={{ className: styles['multi-area-radar-tooltip-cursor'] }}
            />
            {players.map((p, idx) => (
              <Radar
                key={p.web_name}
                name={p.web_name}
                dataKey={p.web_name}
                stroke={COLORS[idx % COLORS.length]}
                fill={COLORS[idx % COLORS.length]}
                fillOpacity={0.4}
              />
            ))}
          </RadarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default MultiAreaRadarDefence;