import { useEffect, useState } from 'react';
import type { FPLBootstrapResponse } from './types/fpl';
import TeamTable from './components/TeamTable';
import PlayerTable from './components/PlayerTable';
import type { Element } from './types/fpl'; // <-- Use Element, not Player
import FixtureTable from './components/FixtureTable'; 
import TeamSummary from './components/TeamSummary';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import Box from '@mui/material/Box';
import Fade from '@mui/material/Fade';

// Replace the old getCurrentGameweek function with this async version
export async function getCurrentGameweek(): Promise<number | undefined> {
  try {
    const res = await fetch('/api/fpl_data/events');
    const events = await res.json();
    const nextEvent = events.find((ev: { is_next: boolean }) => ev.is_next === true);
    return nextEvent ? nextEvent.id : undefined;
  } catch (e) {
    console.error('Failed to fetch events:', e);
    return undefined;
  }
}

function App() {
  const [fplData, setFplData] = useState<FPLBootstrapResponse | null>(null);
  const [fixtures, setFixtures] = useState<any[]>([]);
  const [inputTeamId, setInputTeamId] = useState<string>(''); // For input box
  const [teamId, setTeamId] = useState<string>(''); // Set only on Enter
  const [teamIdError, setTeamIdError] = useState<string>(''); // Error state
  const [realTotalPlayers, setRealTotalPlayers] = useState<number | null>(null);
  const [showTotalPlayersAndTeamInput, setShowTotalPlayersAndTeamInput] = useState<boolean>(true);
  const [tabIndex, setTabIndex] = useState(0);

  useEffect(() => {
    // Fetch from local API/database endpoints
    Promise.all([
      fetch('/api/fpl_data/bootstrap-static').then(res => res.json()),
      fetch('/api/fpl_data/fixtures').then(res => res.json())
    ])
      .then(([bootstrapData, fixturesData]) => {
        setFplData(bootstrapData);
        setFixtures(fixturesData);
      })
      .catch(console.error);
  }, []);

  useEffect(() => {
    fetch('/api/bootstrap-static')
      .then(res => {
        if (!res.ok) {
          setShowTotalPlayersAndTeamInput(false);
          return null;
        }
        setShowTotalPlayersAndTeamInput(true);
        return res.json();
      })
      .then(data => {
        if (data && typeof data.total_players === 'number') {
          setRealTotalPlayers(data.total_players);
        }
      })
      .catch(() => {
        setShowTotalPlayersAndTeamInput(false);
      });
  }, []);

  const isValidTeamId = teamId && /^\d+$/.test(teamId) && Number(teamId) > 0;

  // Handler for Enter key
  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      if (/^\d+$/.test(inputTeamId) && Number(inputTeamId) > 0) {
        setTeamId(inputTeamId);
        setTeamIdError('');
      } else {
        setTeamIdError('Please enter a valid team ID');
        setTeamId('');
      }
    }
  };

  return (
    <div
      className="app-main-container"
      style={{
        padding: '8px',
        width: '100vw',
        minHeight: '100vh',
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center', // Center horizontally
        justifyContent: 'flex-start', // Top align vertically
        background: '#181820'
      }}
    >
      {fplData && (
        <div style={{ width: '100%', maxWidth: 1400, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '8px' }}>
            <img
              src="/fpl_iq_logo_nb.png"
              alt="FPL IQ Logo"
              style={{ width: '300px', height: '300px', marginBottom: '12px' }}
            />
          </div>
          {showTotalPlayersAndTeamInput && (
            <>
              <p style={{ textAlign: 'center', width: '100%' }}>
                Total FPL Players: {realTotalPlayers ?? '...'}
              </p>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                marginBottom: '8px',
                paddingBottom: '20px',
                width: '100%'
              }}>
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  placeholder="Team ID..."
                  value={inputTeamId}
                  onChange={e => setInputTeamId(e.target.value)}
                  onKeyDown={handleInputKeyDown}
                  style={{ padding: '8px', width: '100%', maxWidth: 400 }}
                />
                <button
                  type="button"
                  onClick={() => {
                    setInputTeamId('');
                    setTeamId('');
                    setTeamIdError('');
                  }}
                  style={{
                    padding: '8px 12px',
                    background: '#7a7a7aff',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer'
                  }}
                >
                  Clear
                </button>
              </div>
              {teamIdError && (
                <p style={{ color: 'red', marginBottom: '8px', textAlign: 'center' }}>{teamIdError}</p>
              )}
              {isValidTeamId && (
                <TeamSummary teamId={teamId} />
              )}
            </>
          )}
          <Box sx={{ width: '100%' }}>
            <Tabs
              value={tabIndex}
              onChange={(_, newValue) => setTabIndex(newValue)}
              centered
              textColor="inherit"
              TabIndicatorProps={{ style: { display: 'none' } }}
              sx={{
                marginBottom: 2,
                '& .MuiTab-root': {
                  minWidth: 120,
                  color: '#fff',
                  background: 'transparent',
                  borderRadius: '8px 8px 0 0',
                  transition: 'background 0.2s',
                  outline: 'none', // Remove focus outline
                },
                '& .Mui-selected': {
                  background: '#41054b',
                  color: '#fff',
                },
                '& .MuiTab-root:focus': {
                  outline: 'none', // Remove white border on focus
                },
              }}
            >
              <Tab label="Players" />
              <Tab label="Fixtures" />
              <Tab label="Teams" />
            </Tabs>
            <Fade in={tabIndex === 0} timeout={400} unmountOnExit>
              <div>
                <PlayerTable players={fplData.elements as Element[]} teams={fplData.teams} />
              </div>
            </Fade>
            <Fade in={tabIndex === 1} timeout={400} unmountOnExit>
              <div>
                <FixtureTable teams={fplData.teams} fixtures={fixtures} />
              </div>
            </Fade>
            <Fade in={tabIndex === 2} timeout={400} unmountOnExit>
              <div>
                <TeamTable teams={fplData.teams} />
              </div>
            </Fade>
          </Box>
        </div>
      )}
    </div>
  );
}

export default App;
