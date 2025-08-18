import React from 'react';
import { ResponsiveContainer, Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Legend } from 'recharts';
import type { Element } from '../types/fpl';

interface MultiAreaRadarProps {
  player: Element | Element[];
  showTitle?: boolean; // <-- Add this prop
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
  "#8884d8", "#82ca9d", "#ffc658", "#e7e0d9ff", "#00c49f", "#ff4f81", "#d17e7eff", "#bd57ed",
  "#1f77b4", "#ff7f0e", "#2ca02c", "#d62728", "#9467bd", "#8c564b", "#e377c2", "#7f7f7f",
  "#bcbd22", "#17becf", "#393b79", "#637939"
];

const MultiAreaRadarDefence: React.FC<MultiAreaRadarProps> = ({ player, showTitle }) => {
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
      if (metric.custom) {
        rawValue = metric.custom(p);
      } else {
        rawValue = Number(p[metric.key as keyof Element]) || 0;
      }
      entry[p.web_name] = metric.normalize(rawValue);
    });
    return entry;
  });

  const radiusTickFormatter = (value: number) => {
    if (value === 0.5) return '0.5';
    if (value === 1) return '1';
    return '';
  };

  const legendProps = isSmallScreen
    ? {
        verticalAlign: "bottom" as const,
        align: "center" as const,
        layout: "horizontal" as const,
        wrapperStyle: {
          marginTop: 20,
          color: "#fff",
          fontSize: 12,
          fontFamily: "inherit",
        },
      }
    : {
        verticalAlign: "middle" as const,
        align: "right" as const,
        layout: "vertical" as const,
        wrapperStyle: {
          right: -60,
          top: 0,
          height: "100%",
          width: 120,
          color: "#fff",
          fontSize: 12,
          fontFamily: "inherit",
        },
      };

  return (
    <div
      style={{
        width: '100%',
        maxWidth: isSmallScreen ? 320 : 500,
        margin: '0 auto',
      }}
    >
      {showTitle && (
        <h3 style={{ color: '#fff', marginTop: 0, marginBottom: 0, textAlign: 'center' }}>
          Defensive Summary
        </h3>
      )}
      <div style={{ marginTop: -12 }}>
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
              domain={[0, 1]}
              tick={{
                fontSize: radiusAxisFontSize,
                fontFamily: 'inherit',
                fill: '#aaa',
              }}
              tickFormatter={radiusTickFormatter}
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
            {players.length > 1 && <Legend {...legendProps} />}
          </RadarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default MultiAreaRadarDefence;