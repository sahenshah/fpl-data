import * as React from 'react';
import CloseIcon from '@mui/icons-material/Close';
import './PlayerDetail.css';
import type { Element, Team } from '../types/fpl';
import { getCurrentGameweek } from '../App';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import PlayerStatistics from './PlayerStatistics';
import PlayerFixturesResults from './PlayerFixturesResults';
import PlayerPastSeasons from './PlayerPastSeasons';
import { styled } from '@mui/material/styles';

interface PlayerDetailProps {
  player: Element;
  team: Team | undefined;
  onClose: () => void;
  teams?: Team[];
  events?: { id: number; is_next: boolean }[]; // Pass events as a prop
}

const positionMap: Record<number, string> = {
  1: 'GK',
  2: 'DEF',
  3: 'MID',
  4: 'FWD',
};

const StyledTabsBar = styled('div')({
  background: '#1c1c20',
  borderRadius: 24,
  minHeight: 44, // Match the selected tab's height (was 36)
  height: 44,    // Ensure the bar is exactly the same height as the tab
  padding: 0,
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  margin: '24px auto 16px auto',
  width: 'fit-content',
});

const StyledTabs = styled(Tabs)({
  minHeight: 0,
  height: 44, // Match the bar and tab height
  '& .MuiTabs-flexContainer': {
    gap: 0,
  },
  '& .MuiTabs-indicator': {
    display: 'none',
  },
});

const StyledTab = styled(Tab)(() => ({
  color: '#fff',
  fontWeight: 500,
  fontSize: '0.7rem',
  borderRadius: 24,
  minHeight: 44, // Match the bar and tab height
  height: 44,
  minWidth: 120,
  margin: '0 0px',
  background: 'transparent',
  transition: 'background 0.2s',
  zIndex: 1,
  '&.Mui-selected': {
    background: '#7768f6',
    color: '#fff',
    borderRadius: 24,
    zIndex: 2,
    boxShadow: '0 2px 8px rgba(119,104,246,0.10)',
  },
}));

const PlayerDetail: React.FC<PlayerDetailProps> = ({ player, team, onClose, teams }) => {
  const [currentGW, setCurrentGW] = React.useState<number>(1);
  const [tab, setTab] = React.useState(0);
  
  // Build predicted points for next 5 gameweeks
  const predictedPointsNext5: number[] = [];
  for (let i = 0; i < 5; i++) {
    const gw = currentGW + i;
    const key = `pp_gw_${gw}` as keyof Element;
    const val = player[key];
    predictedPointsNext5.push(typeof val === 'number' ? val : Number(val) || 0);
  }

  // Build xMins for next 5 gameweeks
  const xMinsNext5: number[] = [];
  for (let i = 0; i < 5; i++) {
    const gw = currentGW + i;
    const key = `xmins_gw_${gw}` as keyof Element;
    const val = player[key];
    xMinsNext5.push(typeof val === 'number' ? val : Number(val) || 0);
  }

  // Fetch current gameweek on mount
  React.useEffect(() => {
    getCurrentGameweek().then(gw => {
      if (gw) setCurrentGW(gw);
    });
  }, []);

  const handleTabChange = (_: React.SyntheticEvent, newValue: number) => {
    setTab(newValue);
  };
  
  return (
    <div 
      className="player-detail-modal"
      style={{
        height: '90vh', // <-- Set a fixed height relative to viewport
        maxHeight: '90vh',
        minHeight: '600px', // Optional: set a minimum height for usability
        borderRadius: '32px',
        overflowY: 'auto',
        scrollbarWidth: 'auto',
        scrollbarColor: '#888 #212027',
        boxSizing: 'border-box',
      }}
    >
      <button onClick={onClose} className="player-detail-close-btn" aria-label="Close">
        <CloseIcon style={{ color: '#fff', fontSize: 20 }} />
      </button>
      {/* --- Always show the top section --- */}
      <div className="player-detail-top-section">
        <div className="player-detail-header-row">
          {team && (
            <img
              src={`/team-badges/${team.short_name}.svg`}
              alt={team.short_name}
              className="player-detail-team-badge-fullheight"
            />
          )}
          <div className="player-detail-header-text">
            <h2 className="player-detail-web-name">{player.web_name}</h2>
            <div className="player-names-row">
              <span className="player-detail-name">{player.first_name} {player.second_name}</span>
            </div>
            <span className="player-detail-position">
              <strong>{positionMap[player.element_type] || player.element_type}</strong>
              <span className="player-detail-separator"> | </span>
              <span className="player-detail-value" style={{ fontWeight: 400 }}>
                <strong>£{(player.now_cost / 10).toFixed(1)}</strong>
              </span>
            </span>
          </div>
        </div>
        {player.news && player.news.trim() !== '' && (
          <div className="player-detail-news-row">
            {player.news}
          </div>
        )}
      </div>
      {/* --- Tabs moved below the top section --- */}
      <StyledTabsBar>
        <StyledTabs value={tab} onChange={handleTabChange} centered>
          <StyledTab label="Statistics" style={{ textTransform: 'none' }}/>
          <StyledTab label="Fixtures & Results" style={{ textTransform: 'none' }}/>
          <StyledTab label="Past Seasons" style={{ textTransform: 'none' }}/>
        </StyledTabs>
      </StyledTabsBar>
      {/* --- Tab content remains unchanged --- */}
      {tab === 0 && (
        <PlayerStatistics player={player} />
      )}
      {tab === 1 && (
        <PlayerFixturesResults player={player} teams={teams} />
      )}
      {tab === 2 && (
        <PlayerPastSeasons player={player} />
      )}
    </div>
  );
};

export default PlayerDetail;