import React from 'react';
import { ResponsiveContainer, Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Tooltip } from 'recharts';
import type { Element } from '../types/fpl';
import styles from './MultiAreaRadar.module.css';

// Custom Tooltip for better player styling and header
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
                // border: '2px solid #fff',
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

interface MultiAreaRadarProps {
  player: Element | Element[];
  showTitle?: boolean;
}

const METRICS = [
  {
    key: 'points_per_game',
    label: 'Pts /game Rank',
    max: 10,
    normalize: (v: number) => v / 10,
  },
  {
    key: 'selected_by_percent',
    label: 'Selected %',
    max: 1,
    normalize: (v: number) => v / 100,
  },
  {
    key: 'elite_selected_percent',
    label: 'Elite Selected %',
    max: 1,
    normalize: (v: number) => v / 100,
  },
  {
    key: 'ict_index',
    label: 'ICT index',
    max: 1,
    normalize: (v: number) => v / 20,
  },
  {
    key: 'pxm_next5_per_m',
    label: 'xMins /£M <5>',
    max: 20,
    normalize: (v: number) => v / 20,
  },
  {
    key: 'pp_next5_per_m',
    label: 'xPoints /£M <5>',
    max: 1,
    normalize: (v: number) => v / 1,
  },
];

const COLORS = [
  "#bd56ed", "#8884d8", "#82ca9d", "#ffc658", "#e7e0d9ff", "#00c49f", "#ff4f81", "#d17e7eff",
  "#1f77b4", "#ff7f0e", "#2ca02c", "#d62728", "#9467bd", "#8c564b", "#e377c2", "#7f7f7f",
  "#bcbd22", "#17becf", "#393b79", "#637939"
];

const MultiAreaRadar: React.FC<MultiAreaRadarProps> = ({ player, showTitle }) => {
  const players: Element[] = Array.isArray(player) ? player : [player];

  // Responsive settings
  const isSmallScreen = typeof window !== "undefined" && window.innerWidth < 600;
  const chartHeight = isSmallScreen ? 260 : 400;
  const chartCx = isSmallScreen ? "53%" : "50%";
  const angleAxisFontSize = isSmallScreen ? 8 : 11;
  const radiusAxisFontSize = isSmallScreen ? 7 : 10;

  const data = METRICS.map(metric => {
    const entry: { metric: string; [playerName: string]: number | string } = {
      metric: metric.label,
    };
    players.forEach(p => {
      let rawValue: number;
      if (metric.key === 'selected_by_percent' || metric.key === 'elite_selected_percent') {
        rawValue = parseFloat((p[metric.key as keyof Element] as string) || '0');
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
    <div className={styles['multi-area-radar-container']}>
      {showTitle && (
        <h3 className={styles['multi-area-radar-title']}>
          Summary
        </h3>
      )}
      <div className={styles['multi-area-radar-inner']}>
        <ResponsiveContainer width="100%" height={chartHeight}>
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
                dot={true}
              />
            ))}
          </RadarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default MultiAreaRadar;