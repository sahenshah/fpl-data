import { LineChart } from '@mui/x-charts/LineChart';
import './PlayerDetailPPChart.css';

interface PlayerDetailPPChartProps {
  predictedPoints: number[];
  predictedXmins: number[];
  gwLabels?: string[];
}

const margin = { right: 24 };

export default function PlayerDetailPPChart({
  predictedPoints,
  predictedXmins,
  gwLabels = ['GW1', 'GW2', 'GW3', 'GW4', 'GW5'],
}: PlayerDetailPPChartProps) {
  return (
    <div className="player-detail-ppchart">
      <LineChart
        height={300}
        series={[
          { data: predictedPoints, label: 'xPoints', yAxisId: 'leftAxisId', area: true },
          { data: predictedXmins, label: 'xMinutes', yAxisId: 'rightAxisId' },
        ]}
        xAxis={[
          {
            scaleType: 'point',
            data: gwLabels,
          }
        ]}
        yAxis={[
          { id: 'leftAxisId', width: 50, min: 0, max: 10, label: 'xPoints' }, // Y axis label
          { id: 'rightAxisId', position: 'right', min: 0, max: 100, label: 'xMinutes' }, // Right Y axis label
        ]}
        margin={margin}
      />
    </div>
  );
}