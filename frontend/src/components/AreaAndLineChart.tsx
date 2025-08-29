import { useEffect, useState, useMemo } from 'react';
import { AreaChart, Area, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useMediaQuery } from '@mui/material';
import styles from './LineChart.module.css';

interface AreaAndLineChartProps {
  player: any;
  gwStart?: number;
  gwEnd?: number;
}

const VISIBLE_GW_COUNT = 5;

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
  const allData = [];
  for (let gw = gwStart; gw <= gwEnd; gw++) {
    const xPoints = player[`pp_gw_${gw}`];
    const xMins = player[`xmins_gw_${gw}`];
    const points = historyPoints[gw];
    const minutes = historyMinutes[gw];
    allData.push({
      name: `GW${gw}`,
      xPoints: Number(xPoints ?? 0),
      xMins: Number(xMins ?? 0),
      Points: typeof points === 'number' ? points : null,
      Minutes: typeof minutes === 'number' ? minutes : null,
    });
  }

  const isSmallScreen = useMediaQuery ? useMediaQuery('(max-width:600px)') : window.innerWidth < 600;

  // Scroll state for visible gameweeks
  const [scrollIndex, setScrollIndex] = useState(0);
  const maxScroll = Math.max(0, allData.length - VISIBLE_GW_COUNT);
  const visibleData = allData.slice(scrollIndex, scrollIndex + VISIBLE_GW_COUNT);

  return (
    <div style={{ width: '100%' }}>
      <ResponsiveContainer width="100%" height={300}>
        <AreaChart
          width={500}
          height={300}
          data={visibleData}
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
          <Line
            yAxisId="left"
            type="linear"
            dataKey="xPoints"
            stroke="#9c162e"
            name="xPoints"
            activeDot={{ r: 6 }}
          />
          <Area
            yAxisId="left"
            type="linear"
            dataKey="Points"
            stroke="#5c2a41ff"
            fill="#5c2a41ff"
            name="Points"
            activeDot={{ r: 6 }}
          />
          <Line
            yAxisId="right"
            type="linear"
            dataKey="xMins"
            stroke="#4c76b7"
            name="xMins"
            activeDot={{ r: 6 }}
          />
          <Area
            yAxisId="right"
            type="linear"
            dataKey="Minutes"
            stroke="#184152ff"
            fill="#184152b0"
            name="Minutes"
            dot={false}
            activeDot={{ r: 6 }}
          />
        </AreaChart>
      </ResponsiveContainer>
      <div style={{ marginTop: 12, textAlign: 'center', justifyContent: 'center' }}>
        <input
          type="range"
          min={0}
          max={maxScroll}
          value={scrollIndex}
          onChange={e => setScrollIndex(Number(e.target.value))}
          style={{
            width: '75%',
            background: 'transparent',
            WebkitAppearance: 'none',
            height: 8,
            margin: 0,
            padding: 0,
          }}
          className={styles["line-chart-slider"]}
          aria-label="Scroll gameweeks"
        />
      </div>
    </div>
  );
};

export default AreaAndLineChart;
