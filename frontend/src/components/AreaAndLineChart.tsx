import { useEffect, useState } from 'react';
import { AreaChart, Area, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface AreaAndLineChartProps {
  player: any;
  gwStart?: number;
  gwEnd?: number;
}

interface HistoryRow {
  fixture: number;
  total_points: number;
  minutes: number;
}

const AreaAndLineChart = ({ player, gwStart = 1, gwEnd = 5 }: AreaAndLineChartProps) => {
  // State for history points and minutes
  const [historyPoints, setHistoryPoints] = useState<{ [gw: number]: number }>({});
  const [historyMinutes, setHistoryMinutes] = useState<{ [gw: number]: number }>({});

  useEffect(() => {
    // Fetch the element summary history for this player
    fetch(`/api/fpl_data/element-summary-history/${player.id}`)
      .then(res => res.json())
      .then(data => {
        const pointsMap: { [gw: number]: number } = {};
        const minutesMap: { [gw: number]: number } = {};
        if (data && Array.isArray(data.history)) {
          data.history.forEach((row: HistoryRow) => {
            if (row.fixture && typeof row.total_points === 'number') {
              pointsMap[row.fixture] = row.total_points;
            }
            if (row.fixture && typeof row.minutes === 'number') {
              minutesMap[row.fixture] = row.minutes;
            }
          });
        }
        setHistoryPoints(pointsMap);
        setHistoryMinutes(minutesMap);
      });
  }, [player.id]);

  // Prepare data for the chart
  const data = [];
  for (let gw = gwStart; gw <= gwEnd; gw++) {
    const xPoints = player[`pp_gw_${gw}`];
    const xMins = player[`xmins_gw_${gw}`];
    const points = historyPoints[gw];
    const minutes = historyMinutes[gw];
    data.push({
      name: `GW${gw}`,
      xPoints: Number(xPoints ?? 0),
      xMins: Number(xMins ?? 0),
      Points: typeof points === 'number' ? points : null,
      Minutes: typeof minutes === 'number' ? minutes : null,
    });
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <AreaChart
        width={500}
        height={300}
        data={data}
        margin={{
          top: 30,
          right: -20,
          left: -40,
          bottom: 5,
        }}
      >
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="name" />
        <YAxis yAxisId="left" />
        <YAxis yAxisId="right" orientation="right" />
        <Tooltip />
        <Legend verticalAlign="top" height={36} />
        {/* Area for predicted xPoints */}
        <Area
          yAxisId="left"
          type="monotone"
          dataKey="xPoints"
          stroke="#8884d8"
          fill="#8884d8"
          name="xPoints"
        />
        {/* Area for actual Points from history */}
        <Area
          yAxisId="left"
          type="monotone"
          dataKey="Points"
          stroke="#82ca9d"
          fill="#82ca9d"
          name="Points"
        />
        {/* Line for xMins (predicted) */}
        <Line
          yAxisId="right"
          type="monotone"
          dataKey="xMins"
          stroke="#ffc658"
          name="xMins"
          activeDot={{ r: 8 }}
        />
        {/* Line for Minutes (actual from history) */}
        <Line
          yAxisId="right"
          type="monotone"
          dataKey="Minutes"
          stroke="#f5232396"
          name="Minutes"
          dot={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
};

export default AreaAndLineChart;
