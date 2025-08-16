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

export default function Next5LineChart({
  players,
  gwLabels,
  mode = 'xPoints',
}: Next5LineChartProps) {
  const [gwRange, setGwRange] = useState<[number, number]>([1, 5]);

  useEffect(() => {
    getCurrentGameweek().then(gw => {
      if (gw) {
        setGwRange([gw, gw + 4 > 38 ? 38 : gw + 4]);
      }
    });
  }, []);

  // Compute GW labels based on gwRange
  const computedGwLabels = Array.from(
    { length: gwRange[1] - gwRange[0] + 1 },
    (_, i) => `GW${gwRange[0] + i}`
  );

  const labels = gwLabels ?? computedGwLabels;

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
    <ResponsiveContainer width="100%" height={300}>
      <RechartsLineChart
        data={data}
        margin={{
          top: 5,
          right: 40,
          left: -20,
          bottom: 5,
        }}
        style={{ background: '#333' }}
      >
        {/* <CartesianGrid strokeDasharray="3 3" /> */}
        <XAxis dataKey="name" />
        <YAxis />
        <Tooltip />
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
