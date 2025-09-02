import { useEffect, useRef, useState } from 'react';
import {
  ResponsiveContainer,
  LineChart as RechartsLineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
} from 'recharts';
import { getCurrentGameweek } from '../App';
import styles from './LineChart.module.css';
import Slider from '@mui/material/Slider';
import useMediaQuery from '@mui/material/useMediaQuery';

interface LineChartProps {
  players: {
    web_name: string;
    predicted_points_gw: number[];
    predicted_xmins_gw?: number[];
  }[];
  gwLabels?: string[];
  mode?: 'xPoints' | 'xMins';
  onRefresh?: () => void;
}

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL;
export async function getLastPredictedGw(): Promise<number | undefined> {
  try {
    const res = await fetch(`${apiBaseUrl}/api/fpl_data/last_predicted_gw`);
    const data = await res.json();
    return data?.last_predicted_gw;
  } catch (e) {
    console.error('Failed to fetch last predicted gw:', e);
    return undefined;
  }
}

function CustomDot(props: any) {
  const { cx, cy, stroke, index, activeIndex, isChartHovered } = props;
  const isActive = index === activeIndex;
  const borderColor = isChartHovered ? (isActive ? stroke : "#888") : stroke;
  const fillColor = isChartHovered ? (isActive ? stroke : "#212027") : "#212027";
  return (
    <circle
      cx={cx}
      cy={cy}
      r={7}
      fill={fillColor}
      stroke={borderColor}
      strokeWidth={2}
      style={{ pointerEvents: "auto" }}
    />
  );
}

export default function LineChart({
  players,
  gwLabels,
  mode = 'xPoints',
}: LineChartProps) {
  const [gwRange, setGwRange] = useState<[number, number]>([1, 38]);
  const [sliderMax, setSliderMax] = useState<number>(38); // <-- Track the true max for the slider
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [isChartHovered, setIsChartHovered] = useState(false);

  const chartContainerRef = useRef<HTMLDivElement>(null);

  const isSmallScreen = useMediaQuery('(max-width:600px)');

  useEffect(() => {
    async function fetchGwRange() {
      const [currentGw, lastPredGw] = await Promise.all([
        getCurrentGameweek(),
        getLastPredictedGw(),
      ]);
      if (currentGw && lastPredGw && lastPredGw >= currentGw) {
        setSliderMax(lastPredGw); // Always set the slider max to lastPredGw
        const rightThumb = isSmallScreen
          ? Math.min(lastPredGw, currentGw + 5)
          : lastPredGw;
        setGwRange([currentGw, rightThumb]);
      }
    }
    fetchGwRange();
    // Add isSmallScreen as a dependency if you want it to update on resize
  }, [isSmallScreen]);

  const gwCount = gwRange[1] - gwRange[0] + 1;
  const computedGwLabels = Array.from(
    { length: gwCount },
    (_, i) => `GW${gwRange[0] + i}`
  );
  const labels = computedGwLabels ?? gwLabels;

  // Prepare data for recharts: one object per GW, with each player's value as a key
  const data = labels.map((label, idx) => {
    const gwIdx = gwRange[0] + idx - 1;
    const obj: { name: string; [key: string]: number | string } = { name: label };
    players.forEach(player => {
      const arr = mode === 'xPoints' ? player.predicted_points_gw : player.predicted_xmins_gw ?? [];
      obj[player.web_name] = arr[gwIdx] ?? 0;
    });
    return obj;
  });

  // Always use the fixed sliderMax for the slider's max value
  const minGameweek = 1;

  // Limit to 20 players for large screens and 10 for small screens, show message if more
  if( isSmallScreen && players.length > 10 )
    return( <div style={{ color: '#c70000ff', textAlign: 'center', padding: 24 }}>
        Please select no more than 10 players for the expected data chart.
      </div>)
  else if ( !isSmallScreen && players.length > 20) {
    return (
      <div style={{ color: '#c70000ff', textAlign: 'center', padding: 24 }}>
        Please select no more than 20 players for the expected data chart.
      </div>
    );
  }

  return (
    <div style={{ position: 'relative', width: '100%' }}>
      <div
        ref={chartContainerRef}
        style={{
          width: '100%',
          overflowX: 'auto',
          overflowY: isChartHovered ? undefined : 'hidden',
          scrollbarWidth: 'thin',
          scrollbarColor: '#7768f6 #1a1c22',
        }}
      >
        <div
          style={{
            minWidth: isSmallScreen ? 0 : 700,
            maxWidth: isSmallScreen ? '100vw' : '100%',
            margin: '0 auto',
            height: '100%',
            maxHeight: '420px',
            boxSizing: 'border-box',
          }}
        >
          <ResponsiveContainer
            width="100%"
            height={isSmallScreen ? 300 : 420}
          >
            <RechartsLineChart
              data={data}
              margin={{
                top: 8,
                right: 40,
                left: -20,
                bottom: 35,
              }}
              style={{ background: 'transparent' }}
              onMouseMove={state => {
                setIsChartHovered(true);
                if (state && state.activeTooltipIndex !== undefined) {
                  const idx = state.activeTooltipIndex;
                  setActiveIndex(typeof idx === 'number' ? idx : null);
                }
              }}
              onMouseLeave={() => {
                setActiveIndex(null);
                setIsChartHovered(false);
              }}
            >
              <XAxis dataKey="name" tick={{ fill: "#fff" }} />
              <YAxis tick={{ fill: "#fff" }} />
              <Tooltip
                content={({ label, payload, active }) =>
                  active && payload && payload.length ? (
                    <div className={styles['line-chart-tooltip']}>
                      <div className={styles['line-chart-tooltip-label']}>{label}</div>
                      <div className={styles['line-chart-tooltip-items']}>
                        {payload
                          .slice() // Make a copy so we don't mutate the original
                          .sort((a, b) => (b.value ?? 0) - (a.value ?? 0)) // Descending order
                          .map((entry, idx) => (
                            <div key={idx} className={styles['line-chart-tooltip-item']}>
                              <div
                                className={styles['line-chart-tooltip-dot']}
                                style={{
                                  backgroundColor: players.find(p => p.web_name === entry.name)
                                    ? `hsl(${(players.findIndex(p => p.web_name === entry.name) * 360) / players.length}, 70%, 55%)`
                                    : entry.color
                                }}
                              />
                              <span className={styles['line-chart-tooltip-text']} style={{ flex: 1, textAlign: "left" }}>
                                {entry.name}
                              </span>
                              <span className={styles['line-chart-tooltip-value']} style={{ minWidth: 32, textAlign: "right", marginLeft: 12, fontWeight: 600 }}>
                                {entry.value}
                              </span>
                            </div>
                          ))}
                      </div>
                    </div>
                  ) : null
                }
              />
              {players.map((player, idx) => {
                const playerColor = `hsl(${(idx * 360) / players.length}, 70%, 55%)`;
                const lineColor = isChartHovered ? "#888" : playerColor;
                return (
                  <Line
                    key={player.web_name}
                    type="linear"
                    dataKey={player.web_name}
                    stroke={lineColor}
                    dot={dotProps => (
                      <CustomDot
                        {...dotProps}
                        stroke={playerColor}
                        activeIndex={activeIndex}
                        isChartHovered={isChartHovered}
                      />
                    )}
                    activeDot={{
                      r: 9,
                      strokeWidth: 0,
                      fill: playerColor,
                      stroke: "none",
                      style: { "--dot-color": playerColor } as React.CSSProperties,
                    }}
                  />
                );
              })}
            </RechartsLineChart>
          </ResponsiveContainer>
        </div>
      </div>
      {/* Range slider for min/max gameweek */}
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        marginTop: isSmallScreen ? 0 : 24, 
      }}>
        <Slider
          value={gwRange}
          min={minGameweek}
          max={sliderMax}
          step={1}
          onChange={(_, value) => setGwRange(value as [number, number])}
          valueLabelDisplay="auto"
          sx={{ 
            width: '90%', 
            mx: 2, 
            color: '#7768f6',
            '& .MuiSlider-rail': {
              height: 22, // Increase rail thickness here (default is 4)
              borderRadius: 4,
              color: '#000000ff'
            },
            '& .MuiSlider-track': {
              height: 22, // Match the rail thickness
              borderRadius: 4,
            },
            '& .MuiSlider-thumb': {
              color: '#000000ff',
              outline: '8px solid #7768f6',
              height: 8,
              width: 8,
            },
            // Left thumb (first thumb)
            '& .MuiSlider-thumb[data-index="0"]': {
              borderTopLeftRadius: '50%',
              borderBottomLeftRadius: '50%',
              borderTopRightRadius: '0',
              borderBottomRightRadius: '0',
            },
            // Right thumb (second thumb)
            '& .MuiSlider-thumb[data-index="1"]': {
              borderTopLeftRadius: '0',
              borderBottomLeftRadius: '0',
              borderTopRightRadius: '50%',
              borderBottomRightRadius: '50%',
            },
          }}
          disableSwap
        />
      </div>
    </div>
  );
}
