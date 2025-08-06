import { useEffect, useState } from 'react';
import type { FPLBootstrapResponse } from './types/fpl';
import TeamTable from './components/TeamTable';
import PlayerTable from './components/PlayerTable';
import FixtureTable from './components/FixtureTable'; 
import Accordion from '@mui/material/Accordion';
import AccordionSummary from '@mui/material/AccordionSummary';
import AccordionDetails from '@mui/material/AccordionDetails';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';

function App() {
  const [fplData, setFplData] = useState<FPLBootstrapResponse | null>(null);
  const [fixtures, setFixtures] = useState<any[]>([]); // Update type if you have a Fixture type

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

  return (
    <div style={{ padding: '24px', boxSizing: 'border-box' }}>
      {fplData && (
        <div>
          <h1>FPL Data</h1>
          <p>Total FPL Players: {fplData.total_players}</p>
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
              {/* <pre>{JSON.stringify(fixtures, null, 2)}</pre> */}
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
