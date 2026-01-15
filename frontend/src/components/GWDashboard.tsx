import React, { useEffect, useState } from 'react';
import { getCurrentGameweek } from '../App';
import styles from './GWDashboard.module.css';
import PlayerDetail from './PlayerDetail';
import Dialog from '@mui/material/Dialog';

const corsProxies = [
  'https://corsproxy.io/?',
  'https://cors-anywhere.herokuapp.com/',
  'https://api.allorigins.win/raw?url=',
  'https://thingproxy.freeboard.io/fetch/',
];

const fetchWithFallback = async (url: string) => {
  for (const proxy of corsProxies) {
    try {
      const proxyUrl = proxy + encodeURIComponent(url);
      const response = await fetch(proxyUrl);
      if (response.ok) {
        return response;
      }
    } catch (error) {
      console.warn(`Failed with proxy ${proxy}:`, error);
    }
  }
  throw new Error('All CORS proxies failed');
};

interface PlayerElement {
  id: number;
  first_name: string;
  second_name: string;
  [key: string]: any;
}

const CACHE_EXPIRY_MS = 5 * 60 * 1000; // 5 minutes

function formatDeadlineTime(isoString: string) {
  const date = new Date(isoString);
  return date.toLocaleString('en-GB', {
    weekday: 'short',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
    timeZone: 'UTC',
  }).replace(',', '').replace(' at', '');
}

const statColumns = [
  { key: 'total_points', label: 'Pts' },
  { key: 'minutes', label: 'Min' },
  { key: 'goals_scored', label: 'Goals' },
  { key: 'assists', label: 'Assists' },
  { key: 'defensive_contribution', label: 'DefCon' },
  { key: 'clean_sheets', label: 'CS' },
  { key: 'goals_conceded', label: 'GC' },
  { key: 'yellow_cards', label: 'YC' },
  { key: 'red_cards', label: 'RC' },
  { key: 'bonus', label: 'Bonus' },
  { key: 'bps', label: 'BPS' },
  { key: 'clearances_blocks_interceptions', label: 'C,B,I' },
  { key: 'recoveries', label: 'Recoveries' },
  { key: 'tackles', label: 'Tackles' },
  { key: 'expected_goals', label: 'xG' },
  { key: 'expected_assists', label: 'xA' },
  { key: 'expected_goal_involvements', label: 'xGI' },
];

const ROWS_PER_PAGE = 10;

const positionMap: Record<number, string> = {
  1: 'GK',
  2: 'DEF',
  3: 'MID',
  4: 'FWD',
};

const GWDashboard: React.FC = () => {
  const [gwData, setGwData] = useState<any>(null);
  const [elements, setElements] = useState<PlayerElement[]>([]);
  const [nextDeadline, setNextDeadline] = useState<string | null>(null);
  const [nextGwNumber, setNextGwNumber] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [sortBy, setSortBy] = useState('total_points');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [teams, setTeams] = useState<any[]>([]);
  const [selectedPlayer, setSelectedPlayer] = useState<any>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Always fetch events.json first
        const eventsResponse = await fetch('/static_json/events.json');
        if (!eventsResponse.ok) throw new Error('Failed to fetch events.json');
        const eventsJson = await eventsResponse.json();

        let gw = await getCurrentGameweek();

        if (!gw) {
          const lastFinished = [...eventsJson].reverse().find((event: any) => event.finished);
          if (lastFinished) {
            gw = lastFinished.id;
            console.error('No current gameweek found. Falling back to previous finished gameweek:', gw);
          } else {
            console.error('No current gameweek and no finished gameweek found.');
            throw new Error('Failed to get current or previous finished gameweek');
          }
        }
        
        const cacheKey = `gw_live_${gw}`;
        const cached = localStorage.getItem(cacheKey);
        let gwJson = null;

        if (cached) {
          const { data, timestamp } = JSON.parse(cached);
          if (Date.now() - timestamp < CACHE_EXPIRY_MS) {
            gwJson = data;
          }
        }

        if (!gwJson) {
          const gwResponse = await fetchWithFallback(`https://fantasy.premierleague.com/api/event/${gw}/live/`);
          if (!gwResponse.ok) throw new Error('Failed to fetch GW data');
          gwJson = await gwResponse.json();
          localStorage.setItem(cacheKey, JSON.stringify({ data: gwJson, timestamp: Date.now() }));
        }

        // Fetch elements.json (no CORS needed, it's local)
        const elementsResponse = await fetch('/static_json/elements.json');
        if (!elementsResponse.ok) throw new Error('Failed to fetch elements.json');
        const elementsJson = await elementsResponse.json();

        // Fetch teams.json (no CORS needed, it's local)
        const teamsResponse = await fetch('/static_json/teams.json');
        if (!teamsResponse.ok) throw new Error('Failed to fetch teams.json');
        const teamsJson = await teamsResponse.json();

        // Find next gameweek event
        if( gw ) {
          const nextEvent = eventsJson.find((event: any) => event.id === gw + 1);
        
          setNextDeadline(nextEvent ? nextEvent.deadline_time : null);
          setNextGwNumber(nextEvent ? nextEvent.id : null);
        }
        setGwData(gwJson);
        setElements(elementsJson);
        setTeams(teamsJson);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Helper to get player name by id
  const getPlayerName = (id: number) => {
    const player = elements.find(e => e.id === id);
    return player ? player.web_name : `ID ${id}`;
  };

  // Helper to get team name by team id
  const getTeamName = (teamId: number) => {
    const team = teams.find(t => t.id === teamId);
    return team ? team.short_name : `Team ${teamId}`;
  };

  let filteredSorted: any[] = [];
  if (gwData && gwData.elements) {
    filteredSorted = gwData.elements
      .filter((el: any) => el.stats.minutes > 0)
      .sort((a: any, b: any) => {
        const aVal = a.stats[sortBy];
        const bVal = b.stats[sortBy];
        if (aVal === undefined || bVal === undefined) return 0;
        if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
        return 0;
      });
  }
  const pageCount = Math.ceil(filteredSorted.length / ROWS_PER_PAGE);
  const paginated = filteredSorted.slice(page * ROWS_PER_PAGE, (page + 1) * ROWS_PER_PAGE);

  const handlePrev = () => setPage(p => Math.max(0, p - 1));
  const handleNext = () => setPage(p => Math.min(pageCount - 1, p + 1));
  const handleFirst = () => setPage(0);
  const handleLast = () => setPage(pageCount - 1);

  // Reset to first page if data changes
  useEffect(() => {
    setPage(0);
  }, [gwData, sortBy, sortDirection]);

  // Handle sorting when header is clicked
  const handleSort = (colKey: string) => {
    if (sortBy === colKey) {
      setSortDirection(dir => (dir === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(colKey);
      setSortDirection('desc');
    }
  };

  const handleCloseModal = () => {
    setDialogOpen(false);
    setSelectedPlayer(null);
  };

  return (
    <div>
      {/* Next GW Deadline Section */}
      <h2 className={styles.header}>
        {nextGwNumber
          ? `Gameweek ${nextGwNumber} Deadline: `
          : 'Next GW Deadline:'}
        <span className={styles.deadlineDate}>
          {nextDeadline
            ? formatDeadlineTime(nextDeadline)
            : 'Not found'}
        </span>
      </h2>
      {/* Current GW Player Results */}
      <h2 className={styles.header}>
        {gwData && gwData.elements && nextGwNumber
          ? `Gameweek ${nextGwNumber - 1} Player Results:`
          : 'Current Gameweek Player Results'}
      </h2>
      {loading && <div className={styles.loading}>Loading...</div>}
      {error && <div className={styles.error}>{error}</div>}
      {!loading && !error && gwData && gwData.elements && (
        <div className={styles.tableContainer}>
          <div className={styles.tableWrapper}>
            <table className={styles.playerTable}>
              <thead>
                <tr>
                  <th className={styles.teamIconCol}></th>
                  <th className={styles.playerNameCol}>Player</th>
                  <th className={styles.statCol}>Pos</th>
                  {statColumns.map(col => (
                    <th
                      key={col.key}
                      className={styles.statCol}
                      style={{ cursor: 'pointer', userSelect: 'none' }}
                      onClick={() => handleSort(col.key)}
                    >
                      {col.label}
                      {sortBy === col.key && (
                        <span style={{ marginLeft: 4 }}>
                          {sortDirection === 'asc' ? '▲' : '▼'}
                        </span>
                      )}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {paginated.map((el: any, idx: number) => {
                  const player = elements.find(e => e.id === el.id);
                  const pos = player ? positionMap[player.element_type] : '';
                  const teamShortName = player ? getTeamName(player.team) : '';
                  return (
                    <tr key={el.id}
                      className={idx % 2 === 0 ? styles.evenRow : styles.oddRow}
                      onClick={() => {
                        setSelectedPlayer(player);
                        setDialogOpen(true);
                      }}
                      style={{ cursor: 'pointer' }}
                    >
                      <td className={styles.teamIconCol}>
                        {teamShortName && (
                          <img
                            src={`/team-kits/${teamShortName}.png`}
                            alt={teamShortName}
                            className={styles.teamKitIcon}
                            style={{ width: 32, height: 32, objectFit: 'contain' }}
                          />
                        )}
                      </td>
                      <td className={styles.playerNameCol}>{getPlayerName(el.id)}</td>
                      <td className={styles.statCol}>{pos}</td>
                      {statColumns.map(col => (
                        <td key={col.key} className={styles.statCol}>
                          {el.stats[col.key]}
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className={styles.pagination}>
            <button onClick={handleFirst} disabled={page === 0} style={{ marginRight: 8 }}>
              <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
                <path d="M15 17L10 11L15 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M11 17L6 11L11 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            <button onClick={handlePrev} disabled={page === 0} style={{ marginRight: 8 }}>
              <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
                <path d="M15 17L10 11L15 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            <span className={styles.paginationInfo}>
              {page + 1} of {pageCount}
            </span>
            <button onClick={handleNext} disabled={page >= pageCount - 1} style={{ marginLeft: 8 }}>
              <svg width="22" height="22" viewBox="0 0 22 22" fill="none" style={{ transform: 'scaleX(-1)' }}>
                <path d="M15 17L10 11L15 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            <button onClick={handleLast} disabled={page >= pageCount - 1} style={{ marginLeft: 8 }}>
              <svg width="22" height="22" viewBox="0 0 22 22" fill="none" style={{ transform: 'scaleX(-1)' }}>
                <path d="M15 17L10 11L15 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M11 17L6 11L11 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>
        </div>
      )}
      {/* Player Detail Modal */}
      <Dialog
        open={dialogOpen}
        onClose={handleCloseModal}
        maxWidth="lg"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: '36px',
          }
        }}
      >
        {selectedPlayer && (
          <PlayerDetail
            player={selectedPlayer}
            team={teams.find(t => t.id === selectedPlayer.team)}
            teams={teams}
            onClose={handleCloseModal}
          />
        )}
      </Dialog>
    </div>
  );
};

export default GWDashboard;