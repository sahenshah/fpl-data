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
    key: 'ict_index',
    label: 'ICT index',
    max: 1,
    normalize: (v: number) => v / 20,
  },
  {
    key: 'expected_goal_involvements_per_90',
    label: 'xGI/90',
    max: 1,
    normalize: (v: number) => v / 1,
  },
  {
    key: 'expected_goals_per_90',
    label: 'xG/90',
    max: 1,
    normalize: (v: number) => v / 1,
  },
  {
    label: 'Goals/90',
    max: 1,
    normalize: (v: number) => v / 1,
    custom: (p: Element) => p.minutes ? p.goals_scored / (p.minutes / 90) : 0,
  },
  {
    label: 'Assists/90',
    max: 1,
    normalize: (v: number) => v / 1,
    custom: (p: Element) => p.minutes ? p.assists / (p.minutes / 90) : 0,
  },
  {
    key: 'expected_assists_per_90',
    label: 'xA/90',
    max: 1,
    normalize: (v: number) => v / 1,
  },
];

const COLORS = [
  "#8373F7", "#bd57ed", "#82ca9d", "#ffc658", "#e7e0d9ff", "#00c49f", "#ff4f81", "#d17e7eff",
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

const MultiAreaRadarAttack: React.FC<MultiAreaRadarProps> = ({ player, showTitle, height, width }) => {
  const players: Element[] = Array.isArray(player) ? player : [player];

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

  // Responsive legend position
  const isSmallScreen = typeof window !== "undefined" && window.innerWidth < 700;
  // Use height and width from props, fallback to responsive defaults
  const chartHeight = typeof height === 'number'
    ? height
    : (isSmallScreen ? 260 : 550);
  const chartWidth = width ?? '100%';
  const chartCx = isSmallScreen ? "53%" : "50%";

  // Responsive font sizes for axis labels
  const angleAxisFontSize = isSmallScreen ? 8 : 11;
  const radiusAxisFontSize = isSmallScreen ? 7 : 10;

  return (
    <div
      style={{
        width: '100%',
        maxWidth: isSmallScreen ? 350 : 500,
        margin: '0 auto',
      }}
    >
      {showTitle && (
        <h3 style={{ color: '#fff', marginTop: 0, marginBottom: 0, textAlign: 'center' }}>
          Attacking Summary
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
                fillOpacity={players.length === 1 ? 0.8 : 0.4}
                dot={
                  players.length === 1
                    ? (props) => (
                        <circle
                          {...(props as React.SVGProps<SVGCircleElement>)}
                          r={6}
                          fill="#fff"
                          fillOpacity={1}
                          stroke={COLORS[idx % COLORS.length]}
                          strokeWidth={2}
                          style={{ transition: 'r 0.2s, stroke-width 0.2s' }}
                        />
                      )
                    : true
                }
                activeDot={
                  players.length === 1
                    ? (props) => (
                        <circle
                          {...(props as React.SVGProps<SVGCircleElement>)}
                          r={6}
                          fill="#8373F7"
                          fillOpacity={1}
                          stroke="none"
                          strokeWidth={0}
                          style={{ transition: 'r 0.2s, stroke-width 0.2s' }}
                        />
                      )
                    : true
                }
              />
            ))}
          </RadarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default MultiAreaRadarAttack;