import { useEffect, useState } from 'react';
import type { FPLBootstrapResponse } from './types/fpl';
import TeamTable from './components/TeamTable';
import PlayerTable from './components/PlayerTable';
import type { Element } from './types/fpl'; // <-- Use Element, not Player
import FixtureTable from './components/FixtureTable'; 
import Accordion from '@mui/material/Accordion';
import AccordionSummary from '@mui/material/AccordionSummary';
import AccordionDetails from '@mui/material/AccordionDetails';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import TeamSummary from './components/TeamSummary';

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
    <div className="app-main-container" style={{ padding: '8px', width: '100%' }}>
      {fplData && (
        <div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '8px' }}>
            <img
              src="/fpl_iq_logo_nb.png"
              alt="FPL IQ Logo"
              style={{ width: '300px', height: '300px', marginBottom: '12px' }}
            />
          </div>
          <p style={{ textAlign: 'center', width: '100%' }}>
            Total FPL Players: {fplData.total_players}
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
          <Accordion>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <h2>Players</h2>
            </AccordionSummary>
            <AccordionDetails>
              <PlayerTable players={fplData.elements as Element[]} teams={fplData.teams} />
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
