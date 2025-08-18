import React from 'react';
import { ResponsiveContainer, Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Legend } from 'recharts';
import type { Element } from '../types/fpl';

interface MultiAreaRadarProps {
  player: Element | Element[];
}

const METRICS = [
  {
    key: 'points_per_game',
    label: 'Pts /game Rank',
    max: 10,
    normalize: (v: number) => v / 10,
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
    key: 'expected_assists_per_90',
    label: 'xA/90',
    max: 1,
    normalize: (v: number) => v / 1,
  },
  {
    key: 'defensive_contribution_per_90',
    label: 'DefCon/90',
    max: 20,
    normalize: (v: number) => v / 20,
  },
  {
    key: 'pp_next5_per_m',
    label: 'xP /£M',
    max: 1,
    normalize: (v: number) => v / 1,
  },
];

const COLORS = [
  "#8884d8", "#82ca9d", "#ffc658", "#ff7300", "#00c49f", "#ff4f81", "#a28fd0", "#d0ed57"
];

const MultiAreaRadar: React.FC<MultiAreaRadarProps> = ({ player }) => {
  const players: Element[] = Array.isArray(player) ? player : [player];

  const data = METRICS.map(metric => {
    const entry: { metric: string; [playerName: string]: number | string } = {
      metric: metric.label,
    };
    players.forEach(p => {
      entry[p.web_name] = metric.normalize(Number(p[metric.key as keyof Element]) || 0);
    });
    return entry;
  });

  const radiusTickFormatter = (value: number) => {
    if (value === 0.5) return '0.5';
    if (value === 1) return '1';
    return '';
  };

  // Responsive legend position
  const isSmallScreen = typeof window !== "undefined" && window.innerWidth < 600;
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
        maxWidth: 500,
        margin: '0 auto',
      }}
    >
      <ResponsiveContainer width="100%" height={400}>
        <RadarChart
          cx={isSmallScreen ? "53%" : "50%"}
          cy="50%"
          outerRadius="80%"
          data={data}
        >
          <PolarGrid />
          <PolarAngleAxis
            dataKey="metric"
            tick={{
              fontSize: 11,
              fontFamily: 'inherit',
              fill: '#fff',
            }}
            tickLine={false}
          />
          <PolarRadiusAxis
            angle={0}
            domain={[0, 1]}
            tick={{
              fontSize: 10,
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
  );
};

export default MultiAreaRadar;