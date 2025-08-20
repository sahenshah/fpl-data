import { useEffect, useState } from 'react';
import {
  ResponsiveContainer,
  LineChart as RechartsLineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
} from 'recharts';
import { getCurrentGameweek } from '../App';
import './Next5LineChart.css';

interface Next5LineChartProps {
  players: {
    web_name: string;
    predicted_points_gw: number[];
    predicted_xmins_gw?: number[];
  }[];
  gwLabels?: string[];
  mode?: 'xPoints' | 'xMins';
  onRefresh?: () => void;
}

async function getLastPredictedGw(): Promise<number | undefined> {
  try {
    const res = await fetch('/api/fpl_data/last_predicted_gw');
    const data = await res.json();
    return data?.last_predicted_gw;
  } catch (e) {
    console.error('Failed to fetch last predicted gw:', e);
    return undefined;
  }
}

export default function Next5LineChart({
  players,
  gwLabels,
  mode = 'xPoints',
}: Next5LineChartProps) {
  const [gwRange, setGwRange] = useState<[number, number]>([1, 5]);

  useEffect(() => {
    async function fetchGwRange() {
      const [currentGw, lastPredGw] = await Promise.all([
        getCurrentGameweek(),
        getLastPredictedGw(),
      ]);
      console.log("getCurrentGameweek returned:", currentGw);
      console.log("getLastPredictedGw returned:", lastPredGw); // <-- Log lastPredGw here
      if (currentGw && lastPredGw && lastPredGw >= currentGw) {
        setGwRange([currentGw, lastPredGw]);
      }
    }
    fetchGwRange();
  }, []);

  // Compute GW labels based on gwRange
  const computedGwLabels = Array.from(
    { length: gwRange[1] - gwRange[0] + 1 },
    (_, i) => `GW${gwRange[0] + i}`
  );

  // const labels = gwLabels ?? computedGwLabels;
  const labels = computedGwLabels ?? gwLabels;

  // Prepare data for recharts: one object per GW, with each player's value as a key
  const data = labels.map((label, idx) => {
    const obj: { name: string; [key: string]: number | string } = { name: label };
    players.forEach(player => {
      const arr = mode === 'xPoints' ? player.predicted_points_gw : player.predicted_xmins_gw ?? [];
      obj[player.web_name] = arr[idx] ?? 0;
    });
    return obj;
  });

  return (
    <ResponsiveContainer width="100%" height={400}>
      <RechartsLineChart
        data={data}
        margin={{
          top: 8,
          right: 40,
          left: -20,
          bottom: 8,
        }}
        style={{ background: '#333' }}
      >
        <XAxis dataKey="name" />
        <YAxis />
        <Tooltip
          content={({ label, payload, active }) =>
            active && payload && payload.length ? (
              <div
                style={{
                  background: "rgba(24, 24, 32, 0.9)",
                  border: "1px solid #888",
                  borderRadius: 4,
                  padding: 8,
                  color: "#fff",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
                }}
              >
                <div style={{ fontWeight: "bold", marginBottom: 4 }}>{label}</div>
                {payload.map((entry, idx) => (
                  <div key={idx} style={{ color: entry.color }}>
                    {entry.name}: {entry.value}
                  </div>
                ))}
              </div>
            ) : null
          }
        />
        {players.map((player, idx) => (
          <Line
            key={player.web_name}
            type="monotone"
            dataKey={player.web_name}
            stroke={`hsl(${(idx * 360) / players.length}, 70%, 55%)`}
            activeDot={{ r: 6 }}
            dot={false}
          />
        ))}
      </RechartsLineChart>
    </ResponsiveContainer>
  );
}
