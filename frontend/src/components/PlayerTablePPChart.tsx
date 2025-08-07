import { LineChart } from '@mui/x-charts/LineChart';
import './PlayerTablePPChart.css';

const margin = { right: 24 };

interface PlayerTablePPChartProps {
  players: {
    web_name: string;
    predicted_points_gw: number[]; // Array of predicted points for next 5 GWs
  }[];
  gwLabels?: string[];
}

export default function PlayerTablePPChart({
  players,
  gwLabels = ['GW1', 'GW2', 'GW3', 'GW4', 'GW5'],
}: PlayerTablePPChartProps) {
  const series = players.map(player => ({
    data: player.predicted_points_gw,
    label: player.web_name,
    showMark: true,
  }));

  return (
    <div className="player-table-ppchart">
      <h3 style={{ color: '#fff', marginTop: 0 }}>xPoints (Next 5 GWs)</h3>
      <LineChart
        height={300}
        series={series}
        xAxis={[{ scaleType: 'point', data: gwLabels }]}
        yAxis={[{ width: 50, min: 0 }]}
        margin={margin}
      />
    </div>
  );
}
