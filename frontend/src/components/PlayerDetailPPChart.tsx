import { LineChart } from '@mui/x-charts/LineChart';
import './PlayerDetailPPChart.css';
import { getCurrentGameweek } from '../App';
import { useEffect, useState } from 'react';

interface PlayerDetailPPChartProps {
  predictedPoints: number[];
  predictedXmins: number[];
  gwLabels?: string[];
}

const margin = { left: 24, right: 48, top: 20, bottom: 20 };

export default function PlayerDetailPPChart({
  predictedPoints,
  predictedXmins,
  gwLabels,
}: PlayerDetailPPChartProps) {
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

  return (
    <div
      className="player-detail-ppchart"
      style={{
        paddingLeft: '0',
        overflowX: 'hidden'
      }}
    >
      <div
        style={{
          width: 'calc(100% + 75px)',
          marginLeft: '-25px',
          pointerEvents: 'none',
        }}
      >
        <LineChart
          height={300}
          series={[
            { data: predictedPoints, label: 'xPoints', yAxisId: 'leftAxisId', area: true },
            { data: predictedXmins, label: 'xMinutes', yAxisId: 'rightAxisId' },
          ]}
          xAxis={[
            {
              scaleType: 'point',
              data: labels,
              labelStyle: { padding: 0, fontSize: 11 },
            }
          ]}
          yAxis={[
            { 
              id: 'leftAxisId',
              width: 40,
              min: 0,
              max: 10,
              label: 'xPoints',
              labelStyle: { padding: 0, fontSize: 11 },
              tickLabelStyle: { fontSize: 10 }, 
            },
            { 
              id: 'rightAxisId',
              position: 'right',
              min: 0,
              max: 100,
              label: 'xMinutes',
              width: 45,
              labelStyle: { padding: 0, fontSize: 11 },
              tickLabelStyle: { fontSize: 10 }, 
            },
          ]}
          margin={margin}
        />
      </div>
    </div>
  );
}