import { useEffect, useState } from 'react';
import type { FPLBootstrapResponse } from './types/fpl';
import TeamTable from './components/TeamTable';
import PlayerTable from './components/PlayerTable';
import FixtureTable from './components/FixtureTable'; 
import Accordion from '@mui/material/Accordion';
import AccordionSummary from '@mui/material/AccordionSummary';
import AccordionDetails from '@mui/material/AccordionDetails';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import TeamSummary from './components/TeamSummary';

function App() {
  const [fplData, setFplData] = useState<FPLBootstrapResponse | null>(null);
  const [fixtures, setFixtures] = useState<any[]>([]);
  const [inputTeamId, setInputTeamId] = useState<string>(''); // For input box
  const [teamId, setTeamId] = useState<string>(''); // Set only on Enter
  const [teamIdError, setTeamIdError] = useState<string>(''); // Error state

  useEffect(() => {
    fetch('/api/bootstrap-static')
      .then((res) => res.json())
      .then((data: FPLBootstrapResponse) => setFplData(data))
      .catch(console.error);

    fetch('/api/fixtures')
      .then((res) => res.json())
      .then((data) => setFixtures(data))
      .catch(console.error);
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
    <div style={{ padding: '24px', boxSizing: 'border-box' }}>
      {fplData && (
        <div>
          <div style={{
            display: 'flex',
            alignItems: 'center', // <-- change from 'left' to 'center'
            gap: '16px',
            marginBottom: '8px',
            justifyContent: 'center'
          }}>
            <img src="/fpl_data_logo.png" alt="FPL Data Logo" style={{ width: '48px', height: '48px' }} />
            <h1 style={{ margin: 0 }}>FPL Data</h1>
          </div>
          <p>Total FPL Players: {fplData.total_players}</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
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
            <p style={{ color: 'red', marginBottom: '8px' }}>{teamIdError}</p>
          )}
          {isValidTeamId && (
            <TeamSummary teamId={teamId} />
          )}
          <Accordion>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <h2>Players</h2>
            </AccordionSummary>
            <AccordionDetails>
              <PlayerTable players={fplData.elements} teams={fplData.teams} />
            </AccordionDetails>
          </Accordion>
          <Accordion>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <h2>Fixtures</h2>
            </AccordionSummary>
            <AccordionDetails>
              <FixtureTable teams={fplData.teams} fixtures={fixtures} /> 
            </AccordionDetails>
          </Accordion>
          <Accordion>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <h2>Teams</h2>
            </AccordionSummary>
            <AccordionDetails>
              <TeamTable teams={fplData.teams} />
            </AccordionDetails>
          </Accordion>
        </div>
      )}
    </div>
  );
}

export default App;
