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

export async function getLastPredictedGw(): Promise<number | undefined> {
  try {
    const res = await fetch('/api/fpl_data/last_predicted_gw');
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
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [isChartHovered, setIsChartHovered] = useState(false);
  const [scrollIndex, setScrollIndex] = useState(0);

  const chartContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function fetchGwRange() {
      const [currentGw, lastPredGw] = await Promise.all([
        getCurrentGameweek(),
        getLastPredictedGw(),
      ]);
      if (currentGw && lastPredGw && lastPredGw >= currentGw) {
        setGwRange([currentGw, lastPredGw]);
      }
    }
    fetchGwRange();
  }, []);

  const gwCount = gwRange[1] - gwRange[0] + 1;
  const computedGwLabels = Array.from(
    { length: gwCount },
    (_, i) => `GW${gwRange[0] + i}`
  );
  const labels = computedGwLabels ?? gwLabels;

  // Show 5 gameweeks at a time
  const visibleCount = 5;
  // Calculate the max scroll index
  const maxScroll = Math.max(0, labels.length - visibleCount);

  // Prepare data for recharts: one object per GW, with each player's value as a key
  const data = labels.map((label, idx) => {
    const obj: { name: string; [key: string]: number | string } = { name: label };
    players.forEach(player => {
      const arr = mode === 'xPoints' ? player.predicted_points_gw : player.predicted_xmins_gw ?? [];
      obj[player.web_name] = arr[idx] ?? 0;
    });
    return obj;
  });

  // Slice the data for the visible window
  const visibleData = data.slice(scrollIndex, scrollIndex + visibleCount);

  // // Scroll handlers
  // const handleScrollLeft = () => setScrollIndex(idx => Math.max(0, idx - 1));
  // const handleScrollRight = () => setScrollIndex(idx => Math.min(maxScroll, idx + 1));

  return (
    <div style={{ position: 'relative', width: '100%' }}>
      <div
        ref={chartContainerRef}
        style={{
          width: '100%',
          overflowX: 'auto',
          scrollbarWidth: 'thin',
          scrollbarColor: '#7768f6 #1a1c22',
        }}
      >
        <div style={{ minWidth: 700 }}>
          <ResponsiveContainer width="100%" height={420}>
            <RechartsLineChart
              data={visibleData}
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
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip
                content={({ label, payload, active }) =>
                  active && payload && payload.length ? (
                    <div className={styles['line-chart-tooltip']}>
                      <div className={styles['line-chart-tooltip-label']}>{label}</div>
                      {payload.map((entry, idx) => (
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
      <div style={{ display: 'flex', alignItems: 'center', marginTop: 24 }}>
        {/* Increased marginTop for more space between X axis and slider */}
        <input
          type="range"
          min={0}
          max={maxScroll}
          value={scrollIndex}
          onChange={e => setScrollIndex(Number(e.target.value))}
          style={{
            width: '100%',
            background: 'transparent',
            WebkitAppearance: 'none',
            height: 8,
            margin: 0,
            padding: 0,
          }}
          aria-label="Scroll gameweeks"
          className={styles['line-chart-slider']}
        />
      </div>
    </div>
  );
}
