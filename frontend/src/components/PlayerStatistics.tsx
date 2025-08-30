import React from 'react';
import AreaAndLineChart from './AreaAndLineChart';
import MultiAreaRadar from './MultiAreaRadar';
import MultiAreaRadarAttack from './MultiAreaRadarAttack';
import MultiAreaRadarDefence from './MultiAreaRadarDefence';

interface PlayerStatisticsProps {
  player: any;
}

const PlayerStatistics: React.FC<PlayerStatisticsProps> = ({ player }) => {
  // Data boxes for statistics
  return (
    <div>
      {/* Data boxes row */}
      <div
        style={{
          overflowX: 'auto',
          width: '100%',
          padding: 0,
          margin: 0,
          scrollbarWidth: 'thin',
          scrollbarColor: '#888 #212027',
        }}
      >
        <div
          className="player-detail-data-row"
          style={{
            display: 'flex',
            flexDirection: 'row',
            flexWrap: 'nowrap',
            gap: 30,
            minWidth: 400,
            justifyContent: 'flex-start',
            alignItems: 'center',
            padding: '0 8px',
          }}
        >
          {[
            { label: 'Total Points', value: player.total_points },
            { label: 'Minutes', value: player.minutes },
            { label: 'Points /game', value: player.points_per_game },
            { label: 'Goals', value: player.goals_scored },
            { label: 'Assists', value: player.assists },
            { label: 'Clean Sheets', value: player.clean_sheets },
            { label: 'Def Con', value: player.defensive_contribution },
            { label: 'xGI /90', value: player.expected_goal_involvements_per_90 },
            { label: 'xG /90', value: player.expected_goals_per_90 },
            { label: 'xA /90', value: player.expected_assists_per_90 },
            { label: 'Def Con /90', value: player.defensive_contribution_per_90 },
            { label: 'Elite Selected %', value: player.elite_selected_percent },
            { label: 'xPoints (next 5)', value: player.predicted_points_next5 },
            { label: 'xPoints /£M', value: player.pp_next5_per_m },
            { label: 'xMins (next 5)', value: player.predicted_xmins_next5 },
            { label: 'xMins /£M', value: player.pxm_next5_per_m },
            { label: 'Form', value: player.form },
            { label: 'ICT Index', value: player.ict_index },
          ].map((item) => (
            <div
              key={item.label}
              className="player-detail-data-box"
              style={{
                flex: '0 0 auto',
                minWidth: 90,
                padding: '10px 10px',
                borderRadius: '24px',
                textAlign: 'center',
                fontSize: window.innerWidth < 600 ? '0.85rem' : '1rem',
              }}
            >
              <span
                className="player-detail-data-label"
                style={{
                  display: 'block',
                  fontSize: window.innerWidth < 600 ? '0.72rem' : '0.92rem',
                  fontWeight: 400,
                  color: '#9e9d9dff',
                  marginBottom: 2,
                }}
              >
                {item.label}
              </span>
              <span
                className="player-detail-data-value"
                style={{
                  fontWeight: 600,
                  fontSize: window.innerWidth < 600 ? '1rem' : '1.15rem',
                }}
              >
                {item.value}
              </span>
            </div>
          ))}
        </div>
      </div>
      <AreaAndLineChart player={player} />
      {/* Add margin below the chart for spacing */}
      <div style={{ height: 32 }} />
      <div
        style={{
          display: 'flex',
          flexDirection: 'row',
          flexWrap: 'wrap',
          gap: 24,
          justifyContent: 'center',
          alignItems: 'flex-start',
          width: '100%',
        }}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            width: '100%',
            maxWidth: 500,
            background: '#1c1c20',
            borderRadius: 24,
            padding: '24px 12px',
            boxShadow: '0 2px 16px rgba(0,0,0,0.12)',
          }}
        >
          <h3
            style={{
              color: '#fff',
              marginBottom: 8,
              marginTop: 0,
              textAlign: window.innerWidth < 600 ? 'left' : 'center',
              width: '100%',
              paddingLeft: window.innerWidth < 600 ? 8 : 0,
            }}
          >
            Attacking Summary
          </h3>
          <MultiAreaRadarAttack player={player} showTitle={false} height={400}/>
        </div>
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            width: '100%',
            maxWidth: 500,
            background: '#1c1c20',
            borderRadius: 24,
            padding: '24px 12px',
            boxShadow: '0 2px 16px rgba(0,0,0,0.12)',
          }}
        >
          <h3
            style={{
              color: '#fff',
              marginBottom: 8,
              marginTop: 0,
              textAlign: window.innerWidth < 600 ? 'left' : 'center',
              width: '100%',
              paddingLeft: window.innerWidth < 600 ? 8 : 0,
            }}
          >
            Defensive Summary
          </h3>
          <MultiAreaRadarDefence player={player} showTitle={false} height={400}/>
        </div>
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            width: '100%',
            maxWidth: 500,
            background: '#1c1c20',
            borderRadius: 24,
            padding: '24px 12px',
            boxShadow: '0 2px 16px rgba(0,0,0,0.12)',
          }}
        >
          <h3
            style={{
              color: '#fff',
              marginBottom: 8,
              marginTop: 0,
              textAlign: window.innerWidth < 600 ? 'left' : 'center',
              width: '100%',
              paddingLeft: window.innerWidth < 600 ? 8 : 0,
            }}
          >
            Summary
          </h3>
          <MultiAreaRadar player={player} showTitle={false} height={400}/>
        </div>
      </div>
    </div>
  );
};

export default PlayerStatistics;