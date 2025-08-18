import React from 'react';
import { ResponsiveContainer, Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Legend } from 'recharts';
import type { Element } from '../types/fpl';

interface MultiAreaRadarProps {
  player: Element | Element[];
  showTitle?: boolean; // <-- Add this prop
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
  "#bd56ed", "#8884d8", "#82ca9d", "#ffc658", "#e7e0d9ff", "#00c49f", "#ff4f81", "#d17e7eff", "#bd56ed",
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
          right: -100,
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
        padding: 0,
      }}
    >
      {showTitle && (
        <h3 style={{
          color: '#fff',
          marginTop: 0,
          marginBottom: 0,
          padding: 0,
          textAlign: 'center',
          lineHeight: 1.1,
        }}>
          Summary
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

export default MultiAreaRadar;