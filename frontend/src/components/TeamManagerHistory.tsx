import React, { useEffect, useState } from 'react';
import styles from './TeamHistory.module.css';
import { Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, BarChart, Bar } from 'recharts';

interface TeamHistoryProps {
  teamId: string;
}

interface SeasonData {
  season_name: string;
  total_points: number;
  rank: number;
}

const TeamManagerHistory: React.FC<TeamHistoryProps> = ({ teamId }) => {
  const [chartData, setChartData] = useState<SeasonData[]>([]);

  useEffect(() => {
    // Get team history from cache
    const teamHistoryRaw = localStorage.getItem(`team_${teamId}_history_data`);
    if (teamHistoryRaw) {
      const teamHistory = JSON.parse(teamHistoryRaw);
      if (teamHistory && teamHistory.past) {
        // teamHistory.past is an array of previous seasons
        setChartData(teamHistory.past);
      }
    }
  }, [teamId]);

  return (
    <div className={styles['team-history-container']}>
      {chartData.length > 0 ? (
        <>
          <div className={styles['chart-legend']}>
            <span style={{ display: 'flex', alignItems: 'center' }}>
              <span style={{
                width: 10,
                height: 10,
                background: '#82ca9d',
                display: 'inline-block',
                marginRight: 4,
                borderRadius: '50%'
              }}></span>
              Overall Rank
            </span>
            <span style={{ display: 'flex', alignItems: 'center' }}>
              <span style={{
                width: 10,
                height: 10,
                background: '#8884d8',
                display: 'inline-block',
                marginRight: 4,
                borderRadius: '50%'
              }}></span>
              Total Points
            </span>
          </div>
          <div className={styles['chart-scroll-outer']}>
            <div className={styles['chart-scroll-inner']}>
              <ResponsiveContainer minWidth={700} height={340}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="season_name" 
                    label={{ value: 'Season', position: 'insideBottom', offset: -5 }} 
                    tick={{ fontSize: 12 }} 
                  />
                  <YAxis
                    yAxisId="left"
                    domain={[0, 2000000]}
                    label={{ value: 'Overall Rank', angle: -90, position: 'insideLeft', style: { textAnchor: 'middle' } }}
                    tick={{ fontSize: 12 }} 
                    tickFormatter={(value) => {
                      if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
                      if (value >= 1000) return `${(value / 1000).toFixed(0)}k`
                      return value;
                    }}
                  />
                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    domain={[1000, 3000]}
                    label={{ value: 'Total Points', angle: 90, position: 'insideRight', style: { textAnchor: 'middle' } }}
                    tick={{ fontSize: 12 }} 
                    tickFormatter={(value) => {
                      if (value >= 1000) return `${(value / 1000).toFixed(0)}k`
                      return value;
                    }}
                  />
                  <Tooltip
                    cursor={{ fill: 'transparent' }}
                    content={({ label, payload, active }) =>
                      active && payload && payload.length ? (
                        <div style={{ background: "rgb(24, 24, 32, 0.9)", border: "1px solid #ffffffff", borderRadius: 4, padding: 8 }}>
                          <div style={{ fontWeight: "bold" }}>GW {label}</div>
                          {payload.map((entry, idx) => (
                            <div key={idx} style={{ color: entry.color }}>
                              {entry.name}: {entry.value}
                            </div>
                          ))}
                        </div>
                      ) : null
                    }
                  />
                  <Bar
                    yAxisId="right"
                    dataKey="total_points"
                    name="Total Points"
                    fill="#8884d8"
                    barSize={24}
                    radius={[6, 6, 0, 0]}
                  />
                  <Line
                    yAxisId="left"
                    type="linear"
                    dataKey="rank"
                    stroke="#82ca9d"
                    name="Overall Rank"
                    dot={false}
                    activeDot={{ r: 6 }}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </>
      ) : (
        <div>No past seasons history found.</div>
      )}
    </div>
  );
};

export default TeamManagerHistory;