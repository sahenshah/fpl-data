import { useEffect, useState, useMemo } from 'react';
import { AreaChart, Area, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useMediaQuery } from '@mui/material';
import Slider from '@mui/material/Slider';
import { getCurrentGameweek } from '../App'; // adjust import path as needed

interface AreaAndLineChartProps {
  player: any;
  gwStart?: number;
  gwEnd?: number;
}

const AreaAndLineChart = ({ player }: AreaAndLineChartProps) => {
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

  // Default to [1, gwEnd] until we fetch current GW
  const [gwRange, setGwRange] = useState<[number, number]>([1, gwEnd]);

  useEffect(() => {
    async function setInitialGwRange() {
      const currentGw = await getCurrentGameweek();
      if (currentGw) {
        const lower = Math.max(1, currentGw - 3);
        const upper = Math.min(gwEnd, currentGw + 3);
        setGwRange([lower, upper]);
      } else {
        setGwRange([1, gwEnd]);
      }
    }
    setInitialGwRange();
  }, [gwEnd]);

  // State for history points and minutes
  const [historyPoints, setHistoryPoints] = useState<{ [gw: number]: number }>({});
  const [historyMinutes, setHistoryMinutes] = useState<{ [gw: number]: number }>({});

  useEffect(() => {
    setGwRange(([min, max]) => [
      Math.max(1, Math.min(min, gwEnd)),
      Math.max(1, Math.min(max, gwEnd)),
    ]);
  }, [gwEnd]);

  // Fetch from static_json instead of backend API
  useEffect(() => {
    fetch('/static_json/element_summary_history.json')
      .then(res => res.json())
      .then(data => {
        // If data is an array of histories, filter for this player
        const playerHistory = Array.isArray(data)
          ? data.filter((row: any) => row.element === player.id || row.player_id === player.id)
          : [];
        const pointsMap: { [gw: number]: number } = {};
        const minutesMap: { [gw: number]: number } = {};
        playerHistory.forEach((row: any) => {
          const gw = row.round ?? row.fixture;
          if (gw && typeof row.total_points === 'number') {
            pointsMap[gw] = row.total_points;
          }
          if (gw && typeof row.minutes === 'number') {
            minutesMap[gw] = row.minutes;
          }
        });
        setHistoryPoints(pointsMap);
        setHistoryMinutes(minutesMap);
      });
  }, [player.id]);

  // Prepare data for the chart (show from gwRange[0] to gwRange[1])
  const allData = [];
  for (let gw = gwRange[0]; gw <= gwRange[1]; gw++) {
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

  return (
    <div style={{ width: '100%' }}>
      <ResponsiveContainer width="100%" height={300}>
        <AreaChart
          width={500}
          height={300}
          data={allData}
          margin={{
            top: 30,
            right: -20,
            left: -30,
            bottom: 5,
          }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis 
            dataKey="name"
            tick={{ fill: "#fff" }}
          />
          <YAxis 
            yAxisId="left"
            tick={{ fill: "#fff" }}
          />
          <YAxis 
            yAxisId="right"
            orientation="right"
            tick={{ fill: "#fff" }}
          />
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
                fontSize: isSmallScreen ? '0.65rem' : '0.8rem',
                width: '100%',
                justifyContent: 'center',
                marginBottom: 8,
              }}>
                <span style={{ display: 'flex', alignItems: 'center' }}>
                  <span style={{
                    width: 16,
                    height: 2,
                    background: '#ea123c',
                    display: 'inline-block',
                    marginRight: 4,
                    borderRadius: 2
                  }}></span>
                  xPoints
                </span>
                <span style={{ display: 'flex', alignItems: 'center' }}>
                  <span style={{
                    width: 16,
                    height: 8,
                    background: '#722d4a',
                    display: 'inline-block',
                    marginRight: 4,
                    borderRadius: 2
                  }}></span>
                  Points
                </span>
                <span style={{ display: 'flex', alignItems: 'center' }}>
                  <span style={{
                    width: 16,
                    height: 2,
                    background: '#71abfb',
                    display: 'inline-block',
                    marginRight: 4,
                    borderRadius: 2
                  }}></span>
                  xMins
                </span>
                <span style={{ display: 'flex', alignItems: 'center' }}>
                  <span style={{
                    width: 16,
                    height: 8,
                    background: '#174255',
                    display: 'inline-block',
                    marginRight: 4,
                    borderRadius: 2
                  }}></span>
                  Minutes
                </span>
              </div>
            )}
          />
          <Line
            yAxisId="left"
            type="linear"
            dataKey="xPoints"
            stroke="#ea123c"
            name="xPoints"
            dot={false}
            activeDot={{ r: 6 }}
          />
          <Area
            yAxisId="left"
            type="linear"
            dataKey="Points"
            stroke="#722d4a"
            fill="#722d4a"
            name="Points"
            activeDot={{ r: 6 }}
          />
          <Line
            yAxisId="right"
            type="linear"
            dataKey="xMins"
            stroke="#71abfb"
            name="xMins"
            dot={false}
            activeDot={{ r: 6 }}
          />
          <Area
            yAxisId="right"
            type="linear"
            dataKey="Minutes"
            stroke="#104c66d0"
            fill="#17425598"
            name="Minutes"
            dot={false}
            activeDot={{ r: 6 }}
          />
        </AreaChart>
      </ResponsiveContainer>
      {/* Slider moved below the chart */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: 16 }}>
        <Slider
          value={gwRange}
          min={1}
          max={gwEnd}
          step={1}
          onChange={(_, value) => setGwRange(value as [number, number])}
          valueLabelDisplay="auto"
          sx={{
            width: '90%',
            mx: 2,
            paddingTop: '24px',
            color: '#7768f6',
            '& .MuiSlider-rail': {
              height: 22,
              borderRadius: 4,
              color: '#000000ff'
            },
            '& .MuiSlider-track': {
              height: 22,
              borderRadius: 0,
            },
            '& .MuiSlider-thumb': {
              color: '#000000ff',
              outline: '3px solid #7768f6',
              height: 18,
              width: 18,
            },
          }}
          disableSwap
        />
      </div>
    </div>
  );
};

export default AreaAndLineChart;
