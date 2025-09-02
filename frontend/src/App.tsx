import { useEffect, useState } from 'react';
import CircularProgress from '@mui/material/CircularProgress';
import FixtureTable from './components/FixtureTable'; 
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import Box from '@mui/material/Box';
import Fade from '@mui/material/Fade';
import PlayerData from './components/PlayerData'; 

const fetchJson = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status}`);
  return res.json();
};

export async function getCurrentGameweek(): Promise<number | undefined> {
  try {
    const res = await fetch('/static_json/events.json');
    const events = await res.json();
    const nextEvent = events.find((ev: { is_next: number }) => ev.is_next === 1);
    return nextEvent ? nextEvent.id : undefined;
  } catch (e) {
    console.error('Failed to fetch events:', e);
    return undefined;
  }
}

function App() {
  const [fplData, setFplData] = useState<any>(null);
  const [fixtures, setFixtures] = useState<any[]>([]);
  const [tabIndex, setTabIndex] = useState(0);
  const [showSplash, setShowSplash] = useState(true);
  const [fadeSplash, setFadeSplash] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [teams, elements, events, fixturesData] = await Promise.all([
          fetchJson('/static_json/teams.json'),
          fetchJson('/static_json/elements.json'),
          fetchJson('/static_json/events.json'),
          fetchJson('/static_json/fixtures.json'),
        ]);
        setFplData({
          teams,
          elements,
          events,
        });
        setFixtures(fixturesData);
        setLoading(false);
      } catch (err) {
        console.error('Error loading static_json:', err);
        setLoading(false);
      }
    };
    loadData();
  }, []);

  useEffect(() => {
    if (!loading) {
      const fadeTimer = setTimeout(() => setFadeSplash(true), 1000);
      const hideTimer = setTimeout(() => setShowSplash(false), 1400);
      return () => {
        clearTimeout(fadeTimer);
        clearTimeout(hideTimer);
      };
    }
  }, [loading]);

  if (showSplash || loading) {
    return (
      <div
        style={{
          width: '100vw',
          height: '100vh',
          background: '#14161a',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'opacity 0.4s',
          opacity: fadeSplash ? 0 : 1,
          flexDirection: 'column',
        }}
      >
        <img
          src="/fpl_iq_logo_nb.png"
          alt="FPL IQ Logo"
          style={{ width: '300px', height: '300px', marginBottom: 32 }}
        />
        <CircularProgress size={48} thickness={4} style={{ color: '#fff' }} />
      </div>
    );
  }

  if (!fplData) {
    return <div style={{ color: '#fff', padding: 32 }}>Failed to load data. Check your static_json files.</div>;
  }

  return (
    <div
      style={{
        padding: 8,
        width: '100vw',
        minHeight: '100vh',
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'flex-start',
        background: '#14161a',
        overflowX: 'hidden',
      }}
    >
      {/* Heading section with logo and tabs */}
      <div
        style={{
          width: '95%',
          maxWidth: '95%',
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 24,
          margin: '24px auto',
          background: '#212027',
          borderRadius: 48,
          boxShadow: '0 2px 12px rgba(0,0,0,0.13)',
          padding: '12px 24px',
          boxSizing: 'border-box',
          overflow: 'hidden', 
        }}
      >
        <img
          src="/fpl_iq_logo_nb.png"
          alt="FPL IQ Logo"
          style={{
            width: 64,
            height: 64,
            objectFit: 'contain',
            marginRight: 24,
          }}
        />
        <Box sx={{ flex: 1, display: 'flex', justifyContent: 'flex-end' }}>
          <Tabs
            value={tabIndex}
            onChange={(_, newValue) => setTabIndex(newValue)}
            centered={false}
            textColor="inherit"
            TabIndicatorProps={{ style: { display: 'none' } }}
            sx={{
              '& .MuiTab-root': {
                minWidth: 120,
                color: '#fff',
                background: 'transparent',
                borderRadius: '32px',
                transition: 'background 0.2s',
                outline: 'none',
                fontSize: '0.7rem',
                fontWeight: 600,
                textTransform: 'none',
                '@media (max-width: 500px)': {
                  minWidth: 70,
                  fontSize: '0.7rem',
                  padding: '2px 6px',
                },
              },
              '& .Mui-selected': {
                background: '#7768f6',
                color: '#fff',
              },
              '& .MuiTab-root:focus': {
                outline: 'none',
              },
            }}
          >
            <Tab label="Player Data" />
            <Tab label="Fixtures" />
          </Tabs>
        </Box>
      </div>

      {fplData && (
        <div
          style={{
            width: '100%',
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'flex-start',
            justifyContent: 'center',
            gap: 32,
            marginBottom: 16,
            boxSizing: 'border-box',
          }}
        >
          <div
            style={{
              flex: 1,
              maxWidth: '95%',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              boxSizing: 'border-box',
              overflow: 'hidden',
            }}
          >
            <Box style={{ width: '100%', margin: '0 auto' }}>
              <Fade in={tabIndex === 0} timeout={400} unmountOnExit>
                <div>
                  <PlayerData />
                </div>
              </Fade>
              <Fade in={tabIndex === 2} timeout={400} unmountOnExit>
                <div>
                  <PlayerData />
                </div>
              </Fade>
              <Fade in={tabIndex === 1} timeout={400} unmountOnExit>
                <div>
                  <FixtureTable teams={fplData.teams} fixtures={fixtures} />
                </div>
              </Fade>
            </Box>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
