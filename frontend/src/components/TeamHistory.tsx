import React, { useEffect, useState } from 'react';
import styles from './TeamHistory.module.css';
import { Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend, BarChart, Bar } from 'recharts';

interface TeamHistoryProps {
  teamId: string;
}

interface GWData {
  event: number;
  overall_rank: number;
  rank_sort: number;
  points: number;
  total_points: number;
  value: number;
  points_on_bench: number;
  event_transfers: number;
  event_transfers_cost: number;
  xPoints?: number;
  startingPoints?: number;
}

const TeamHistory: React.FC<TeamHistoryProps> = ({ teamId }) => {
  const [chartData, setChartData] = useState<GWData[]>([]);
  const [totalPlayers, setTotalPlayers] = useState<number | null>(null);

  useEffect(() => {
    Promise.all([
      fetch('/static_json/elements.json').then(res => res.json()),
      fetch('/static_json/element_summary_history.json').then(res => res.json())
    ]).then(([elements]) => {
      const teamHistoryRaw = localStorage.getItem(`team_${teamId}_history_data`);
      const picksRaw = localStorage.getItem(`team_${teamId}_picks_data`);

      let picksArray: any[] = [];
      if (picksRaw) picksArray = JSON.parse(picksRaw);

      console.log('teamHistoryRaw:', teamHistoryRaw);
      if (teamHistoryRaw) {
        try {
          const teamHistory = JSON.parse(teamHistoryRaw);
          console.log('teamHistory:', teamHistory);

          if (teamHistory && teamHistory.current) {
            const gwData = teamHistory.current.map((gw: any) => {
              const picksData = picksArray.find((p: any) => p.gw === gw.event);
              const picks = picksData?.picks?.picks || [];
              const startingPicks = picks.filter((p: any) => p.position <= 11);

              let xPoints = 0;
              startingPicks.forEach((pick: any) => {
                const player = elements.find((e: { id: any; }) => e.id === pick.element);
                const ppGwKey = `pp_gw_${gw.event}`;
                const expected = player && player[ppGwKey] !== undefined ? Number(player[ppGwKey]) : 0;
                xPoints += pick.is_captain ? expected * 2 : expected;
              });

              const startingPoints = gw.points;

              return {
                event: gw.event,
                overall_rank: gw.overall_rank,
                rank_sort: gw.rank_sort,
                points: gw.points,
                total_points: gw.total_points,
                value: gw.value,
                points_on_bench: gw.points_on_bench,
                event_transfers: gw.event_transfers,
                event_transfers_cost: gw.event_transfers_cost,
                xPoints: Number(xPoints.toFixed(1)),
                startingPoints,
              };
            });
            setChartData(gwData);
          }
        } catch (e) {
          console.error('Invalid JSON in teamHistoryRaw:', e);
        }
      }
    });

    fetch('https://corsproxy.io/?https://fantasy.premierleague.com/api/bootstrap-static/')
      .then(res => res.json())
      .then(data => setTotalPlayers(data.total_players))
      .catch(() => setTotalPlayers(null));
  }, [teamId]);

  useEffect(() => {
    const handleStorage = (event: StorageEvent) => {
      if (event.key === `team_${teamId}_history_data`) {
        // Re-run your data loading logic here
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, [teamId]);

  return (
    <div className={styles['team-history-container']}>
      {totalPlayers !== null && chartData.length > 0 ? (
        <ResponsiveContainer width="100%" height={340}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey="event" 
              label={{ value: 'Gameweek', position: 'insideBottom', offset: -5 }} 
              tick={{ fontSize: 12 }} 
            />
            <YAxis
              yAxisId="left"
              domain={[1, totalPlayers]}
              reversed={false}
              label={{ value: 'Overall Rank', angle: -90, position: 'insideLeft', style: { textAnchor: 'middle' }}}
              tick={{ fontSize: 12 }} 
              tickFormatter={(value) => {
                if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
                if (value >= 1000) return `${(value / 1000).toFixed(0)}k`;
                return value;
              }}
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              label={{ value: 'Points', angle: -90, position: 'insideRight', style: { textAnchor: 'middle' }}}
              tick={{ fontSize: 12 }} 
              allowDecimals={false}
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
            <Legend
              verticalAlign="top"
              height={36}
              wrapperStyle={{
                display: 'flex',
                left: 0,
                justifyContent: 'center',
                width: '100%',
                marginBottom: 8,
              }}
              content={() => (
                <div style={{
                  display: 'flex',
                  gap: 16,
                  color: '#dfdfdfff',
                  width: '100%',
                  justifyContent: 'center',
                  marginBottom: 8,
                }}>
                  <span style={{ display: 'flex', alignItems: 'center' }}>
                    <span style={{
                      width: 10,
                      height: 10,
                      background: '#722d4a',
                      display: 'inline-block',
                      marginRight: 4,
                      borderRadius: '50%'
                    }}></span>
                    xPoints
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center' }}>
                    <span style={{
                      width: 10,
                      height: 10,
                      background: '#ea123c',
                      display: 'inline-block',
                      marginRight: 4,
                      borderRadius: '50%'
                    }}></span>
                    Points
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center' }}>
                    <span style={{
                      width: 10,
                      height: 10,
                      background: '#71abfb',
                      display: 'inline-block',
                      marginRight: 4,
                      borderRadius: '50%'
                    }}></span>
                    GW Rank
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center' }}>
                    <span style={{
                      width: 10,
                      height: 10,
                      background: '#009e28ff',
                      display: 'inline-block',
                      marginRight: 4,
                      borderRadius: '50%'
                    }}></span>
                    Overall Rank
                  </span>
                </div>
              )}
            />
            {/* Bar charts for xPoints and Points */}
            <Bar 
                yAxisId="right" 
                dataKey="xPoints" 
                name="xPoints" 
                fill="#722d4a" 
                barSize={14} 
                radius={[6, 6, 0, 0]} 
                stackId="a" 
            />
            <Bar 
                yAxisId="right" 
                dataKey="startingPoints" 
                name="Points" 
                fill="#ea123c" 
                barSize={14} 
                radius={[6, 6, 0, 0]} 
                stackId="b" 
            />
            {/* Line charts for ranks */}
            <Line 
                yAxisId="left" 
                type="linear" 
                dataKey="overall_rank" 
                stroke="#009e28ff" 
                name="Overall Rank" 
                dot={false}
                activeDot={{ r: 6 }}
            />
            <Line 
                yAxisId="left" 
                type="linear" 
                dataKey="rank_sort" 
                stroke="#71abfb" 
                name="GW Rank " 
                dot={false}
                activeDot={{ r: 6 }}
            />
          </BarChart>
        </ResponsiveContainer>
      ) : (
        <div>Loading history data...</div>
      )}
    </div>
  );
};

export default TeamHistory;