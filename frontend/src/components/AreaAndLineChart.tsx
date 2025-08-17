import { useEffect, useState, useMemo } from 'react';
import { AreaChart, Area, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useMediaQuery } from '@mui/material';

interface AreaAndLineChartProps {
  player: any;
  gwStart?: number;
  gwEnd?: number;
}

const AreaAndLineChart = ({ player, gwStart = 1 }: AreaAndLineChartProps) => {
  // Dynamically calculate gwEnd based on the last populated predicted GW column
  const gwEnd = useMemo(() => {
    let lastGW = 1;
    for (let i = 1; i <= 38; i++) {
      if (
        player[`pp_gw_${i}`] !== undefined &&
        player[`pp_gw_${i}`] !== null &&
        player[`pp_gw_${i}`] !== ''
      ) {
        lastGW = i;
      }
    }
    return lastGW;
  }, [player]);

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
          data.history.forEach((row: any) => {
            const gw = row.round ?? row.fixture;
            if (gw && typeof row.total_points === 'number') {
              pointsMap[gw] = row.total_points;
            }
            if (gw && typeof row.minutes === 'number') {
              minutesMap[gw] = row.minutes;
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

  const isSmallScreen = useMediaQuery ? useMediaQuery('(max-width:600px)') : window.innerWidth < 600;

  return (
    <ResponsiveContainer width="100%" height={300}>
      <AreaChart
        width={500}
        height={300}
        data={data}
        margin={{
          top: 30,
          right: -20,
          left: -30,
          bottom: 5,
        }}
      >
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="name" />
        <YAxis yAxisId="left" />
        <YAxis yAxisId="right" orientation="right" />
        <Tooltip
          content={({ label, payload, active }) =>
            active && payload && payload.length ? (
              <div style={{ background: "rgb(24, 24, 32, 0.9)", border: "1px solid #ffffffff", borderRadius: 4, padding: 8 }}>
                <div style={{ fontWeight: "bold" }}>{label}</div>
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
            fontSize: isSmallScreen ? '0.75rem' : '1rem',
          }}
        />
        <Area
          yAxisId="left"
          type="monotone"
          dataKey="xPoints"
          stroke="#8884d8"
          fill="#8884d8"
          name="xPoints"
        />
        <Area
          yAxisId="left"
          type="monotone"
          dataKey="Points"
          stroke="#82ca9d"
          fill="#82ca9d"
          name="Points"
        />
        <Line
          yAxisId="right"
          type="monotone"
          dataKey="xMins"
          stroke="#ffc658"
          name="xMins"
          activeDot={{ r: 8 }}
        />
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
