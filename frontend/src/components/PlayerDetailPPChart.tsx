import { LineChart } from '@mui/x-charts/LineChart';
import './PlayerDetailPPChart.css';

interface PlayerDetailPPChartProps {
  predictedPoints: number[];
  gwLabels?: string[];
}

const margin = { right: 24 };

export default function PlayerDetailPPChart({
  predictedPoints,
  gwLabels = ['GW1', 'GW2', 'GW3', 'GW4', 'GW5'],
}: PlayerDetailPPChartProps) {
  return (
    <div className="player-detail-ppchart">
      <LineChart
        height={300}
        series={[
          { data: predictedPoints, label: 'Predicted Points', area: true, showMark: false }
        ]}
        xAxis={[
          {
            scaleType: 'point',
            data: gwLabels,
          }
        ]}
        yAxis={[
          {
            min: 0,         // Set minimum value to 5
            max: 10,        // Optional: set max if you want to cap at 10
          }
        ]}
        margin={margin}
      />
    </div>
  );
}