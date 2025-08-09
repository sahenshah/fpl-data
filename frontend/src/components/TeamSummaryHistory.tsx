import React, { useEffect, useState } from 'react';
import { LineChart } from '@mui/x-charts/LineChart';
import Typography from '@mui/material/Typography';

interface TeamSummaryHistoryProps {
  teamId: string;
}

const margin = { right: 24 };

const TeamSummaryHistory: React.FC<TeamSummaryHistoryProps> = ({ teamId }) => {
  const [history, setHistory] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (teamId) {
      setLoading(true);
      setError(null);
      fetch(`/api/entry/${teamId}/history`)
        .then(res => res.json())
        .then(data => {
          setHistory(data);
          setLoading(false);
        })
        .catch(() => {
          setError('Failed to fetch history data');
          setLoading(false);
        });
    } else {
      setHistory(null);
    }
  }, [teamId]);

  if (!teamId) return null;
  if (loading) return <p>Loading history...</p>;
  if (error) return <p style={{ color: 'red' }}>{error}</p>;
  if (!history || !history.past || !history.past.length) return <p>No history found.</p>;

  // Prepare data for the line chart
  const yData = history.past.map((season: any) => season.rank);
  // Format xLabels to show only last 5 characters (e.g. "16/17" instead of "2016/17")
  const xLabels = history.past.map((season: any) => season.season_name.slice(-5));
  const points = history.past.map((season: any) => season.total_points);

  return (
    <div style={{ width: '100%', textAlign: 'center' }}>
      <Typography variant="h6" gutterBottom style={{ textAlign: 'center', marginBottom: 0, color: '#8d8d8dff' }}>
        Manager History
      </Typography>
      <LineChart
        height={300}
        series={[
          {
            data: yData,
            label: 'Rank',
            showMark: true,
            valueFormatter: (value, context) =>
              `${value} (Points: ${points[context.dataIndex]})`
          },
        ]}
        xAxis={[{ scaleType: 'point', data: xLabels }]}
        yAxis={[
          {
            width: 50,
            valueFormatter: (v: number) =>
              v >= 1000000 ? `${(v / 1000000).toFixed(1)}M` : v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v.toString()
          }
        ]}
        margin={margin}
      />
    </div>
  );
};

export default TeamSummaryHistory;