import * as React from 'react';
import Box from '@mui/material/Box';
import Collapse from '@mui/material/Collapse';
import IconButton from '@mui/material/IconButton';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Paper from '@mui/material/Paper';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import CloseIcon from '@mui/icons-material/Close';
import './PlayerDetail.css';
import AreaAndLineChart from './AreaAndLineChart';
import type { Element, Team, PlayerFixture } from '../types/fpl';
import { getCurrentGameweek } from '../App';
import MultiAreaRadar from './MultiAreaRadar';
import MultiAreaRadarAttack from './MultiAreaRadarAttack';
import MultiAreaRadarDefence from './MultiAreaRadarDefence';

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

const PlayerDetail: React.FC<PlayerDetailProps> = ({ player, team, onClose, teams }) => {
  const [fixtures, setFixtures] = React.useState<PlayerFixture[]>([]);
  const [history, setHistory] = React.useState<any[]>([]);
  const [historyPast, setHistoryPast] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [currentGW, setCurrentGW] = React.useState<number>(1);

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

  React.useEffect(() => {
    setLoading(true);
    fetch(`/api/fpl_data/element-summary-fixtures/${player.id}`)
      .then(res => res.json())
      .then(data => {
        setFixtures(data.fixtures || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [player.id]);

  React.useEffect(() => {
    setLoading(true);
    fetch(`/api/fpl_data/element-summary-history/${player.id}`)
      .then(res => res.json())
      .then(data => {
        setHistory(data.history || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [player.id]);
  
  React.useEffect(() => {
    setLoading(true);
    fetch(`/api/fpl_data/element-summary-history-past/${player.id}`)
      .then(res => res.json())
      .then(data => {
        setHistoryPast(data.history_past || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [player.id]);
  if (!player) return null;

  // Merge history and fixtures by gameweek/event
  const mergedRows = React.useMemo(() => {
    // Map history by round (gameweek)
    const historyMap = new Map<number, any>();
    history.forEach(h => {
      if (h.round != null) historyMap.set(h.round, h);
    });

    // Map fixtures by event (gameweek)
    const fixturesMap = new Map<number, any>();
    fixtures.forEach(fix => {
      if (fix.event != null) fixturesMap.set(fix.event, fix);
    });

    // Union of all gameweeks present in either history or fixtures
    const allGameweeks = Array.from(
      new Set([
        ...Array.from(historyMap.keys()),
        ...Array.from(fixturesMap.keys()),
      ])
    ).sort((a, b) => a - b);

    // For each gameweek, prefer history if present, else fixture
    return allGameweeks.map(gw => {
      const hist = historyMap.get(gw);
      const fix = fixturesMap.get(gw);
      const predicted_points = player[`pp_gw_${gw}` as keyof Element];
      const predicted_xmins = player[`xmins_gw_${gw}` as keyof Element];

      if (hist) {
        // Map history fields to fixture row structure
        // Find opponent team info
        let opponentTeamId = hist.opponent_team;
        let isHome = hist.was_home;
        let team_h = isHome ? player.team : opponentTeamId;
        let team_a = isHome ? opponentTeamId : player.team;

        return {
          ...fix, // include fixture fields if available
          ...hist,
          event: hist.round,
          team_h,
          team_a,
          team_h_score: hist.team_h_score,
          team_a_score: hist.team_a_score,
          difficulty: fix?.difficulty ?? 3,
          predicted_points,
          predicted_xmins,
          total_points: hist.total_points,
          minutes: hist.minutes,
          isHistory: true,
        };
      } else if (fix) {
        return {
          ...fix,
          predicted_points,
          predicted_xmins,
          isHistory: false,
        };
      }
      // Should not happen, but fallback:
      return { event: gw, predicted_points, predicted_xmins };
    });
  }, [fixtures, history, player]);

  // Fetch current gameweek on mount
  React.useEffect(() => {
    getCurrentGameweek().then(gw => {
      if (gw) setCurrentGW(gw);
    });
  }, []);

  function FixtureRow(props: { row: PlayerFixture & { predicted_points?: number; predicted_xmins?: number }; teams?: Team[] }) {
    const { row, teams } = props;
    const [open, setOpen] = React.useState(false);

    // Helper to get team badge URL by id
    const getTeamBadge = (id: number) => {
      const team = teams?.find(t => t.id === id);
      return team
        ? `/team-badges/${team.short_name}.svg`
        : undefined;
    };

    return (
      <React.Fragment>
        <TableRow>
          <TableCell align="center">
            <IconButton
              className={`fixture-row-arrow${open ? ' open' : ''}`}
              aria-label="expand row"
              size="small"
              onClick={() => setOpen(!open)}
            >
              {open ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
            </IconButton>
          </TableCell>
          <TableCell align="center">{row.event}</TableCell>
          <TableCell align="center">
            {getTeamBadge(row.team_h) ? (
              <img
                src={getTeamBadge(row.team_h)}
                alt={`Home team badge`}
                style={{ width: 28, height: 28, verticalAlign: 'middle' }}
              />
            ) : row.team_h}
          </TableCell>
          <TableCell
            align="center"
            sx={{ width: 24, minWidth: 24, maxWidth: 32, padding: '0 2px' }} // Home Score cell
          >
            {row.team_h_score !== null ? row.team_h_score : '-'}
          </TableCell>
          <TableCell
            align="center"
            sx={{ width: 24, minWidth: 24, maxWidth: 32, padding: '0 2px' }} // Away Score cell
          >
            {row.team_a_score !== null ? row.team_a_score : '-'}
          </TableCell>
          <TableCell align="center">
            {getTeamBadge(row.team_a) ? (
              <img
                src={getTeamBadge(row.team_a)}
                alt={`Away team badge`}
                style={{ width: 28, height: 28, verticalAlign: 'middle' }}
              />
            ) : row.team_a}
          </TableCell>
          <TableCell
            align="center"
            sx={{
              backgroundColor:
                row.difficulty === 1 ? '#00831fff' :
                row.difficulty === 2 ? '#54c96fe5' :
                row.difficulty === 3 ? '#f3be4de3' :
                row.difficulty === 4 ? '#e75f5fff' :
                row.difficulty === 5 ? '#a7242fff' :
                undefined,
              color: row.difficulty === 3 ? '#000' : '#fff',
              fontWeight: 'bold',
              borderRadius: '4px'
            }}
          >
            {row.difficulty}
          </TableCell>
          <TableCell align="center">
            {row.predicted_points !== undefined && row.predicted_points !== null ? row.predicted_points : '-'}
          </TableCell>
          <TableCell align="center">
            {row.total_points !== undefined && row.total_points !== null ? row.total_points : '-'}
          </TableCell>
          <TableCell align="center">
            {row.predicted_xmins !== undefined && row.predicted_xmins !== null ? row.predicted_xmins : '-'}
          </TableCell>
          <TableCell align="center">
            {row.minutes ? row.minutes : '-'}
          </TableCell>
        </TableRow>
        {open && (
          <TableRow>
            {/* Set colSpan to the total number of columns in your table (here it's 11) */}
            <TableCell style={{ paddingBottom: 0, paddingTop: 0, backgroundColor: '#1f1f1fff' }} colSpan={11}>
              <Collapse in={open} timeout="auto" unmountOnExit>
                <Box sx={{ margin: 1, textAlign: 'left', paddingTop: 2, paddingBottom: 2 }}>
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                      gap: 12,
                      alignItems: 'start',
                    }}
                  >
                    {[
                      { label: 'Kickoff time:', value: row.kickoff_time ? new Date(row.kickoff_time).toLocaleString() : null },
                      { label: 'Minutes played:', value: row.minutes },
                      { label: 'Goals:', value: row.goals_scored },
                      { label: 'Assists:', value: row.assists },
                      { label: 'Clean Sheets:', value: row.clean_sheets },
                      { label: 'Own Goals:', value: row.own_goals },
                      { label: 'Penalties Saved:', value: row.penalties_saved },
                      { label: 'Penalties Missed:', value: row.penalties_missed },
                      { label: 'Yellow Cards:', value: row.yellow_cards },
                      { label: 'Red Cards:', value: row.red_cards },
                      { label: 'Saves:', value: row.saves },
                      { label: 'Bonus:', value: row.bonus },
                      { label: 'BPS:', value: row.bps },
                      { label: 'Influence:', value: row.influence },
                      { label: 'Creativity:', value: row.creativity },
                      { label: 'Threat:', value: row.threat },
                      { label: 'ICT Index:', value: row.ict_index },
                      { label: 'CBI:', value: row.clearances_blocks_interceptions },
                      { label: 'Recoveries:', value: row.recoveries },
                      { label: 'Tackles:', value: row.tackles },
                      { label: 'Defensive Contribution:', value: row.defensive_contribution },
                      { label: 'xG:', value: row.expected_goals },
                      { label: 'xA:', value: row.expected_assists },
                      { label: 'xGI:', value: row.expected_goal_involvements },
                      { label: 'xGC:', value: row.expected_goals_conceded },
                    ]
                      .filter(item => item.value !== undefined && item.value !== null && item.value !== '')
                      .map(item => (
                        <div key={item.label} style={{ minWidth: 0, marginBottom: 6 }}>
                          <span style={{ fontWeight: 700, color: '#fff' }}>{item.label}</span>{' '}
                          <span style={{ color: '#fff' }}>{item.value}</span>
                        </div>
                      ))}
                  </div>
                </Box>
              </Collapse>
            </TableCell>
          </TableRow>
        )}
      </React.Fragment>
    );
  }

  return (
    <div 
      className="player-detail-modal"
      style={{
        maxHeight: '100vh',
        overflowY: 'auto',
        scrollbarWidth: 'auto',
        scrollbarColor: '#888 #181820',
      }}
    >
      <button onClick={onClose} className="player-detail-close-btn" aria-label="Close">
        <CloseIcon style={{ color: '#fff', fontSize: 20 }} />
      </button>
      {/* Top section */}
      <div className="player-detail-top-section">
        <div className="player-detail-header-row player-detail-header-row-fullheight">
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
      </div>

      {/* Data boxes row */}
      <div
        style={{
          overflowX: 'auto',
          width: '100%',
          padding: 0,
          margin: 0,
          scrollbarWidth: 'thin',
          scrollbarColor: '#888 #181820',
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
                borderRadius: 6,
                textAlign: 'center',
                fontSize: window.innerWidth < 600 ? '0.85rem' : '1rem',
              }}
            >
              <span
                className="player-detail-data-label"
                style={{
                  display: 'block',
                  fontSize: window.innerWidth < 600 ? '0.72rem' : '0.92rem',
                  color: '#333',
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

      <AreaAndLineChart
        player={player}
      />
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
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', maxWidth: 500 }}>
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
          <MultiAreaRadarAttack player={player} showTitle={false} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', maxWidth: 500 }}>
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
          <MultiAreaRadarDefence player={player} showTitle={false} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', maxWidth: 500 }}>
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
          <MultiAreaRadar player={player} showTitle={false} />
        </div>
      </div>
      <h3>Fixtures & Results</h3>
      {loading ? (
        <p>Loading fixtures...</p>
      ) : (
        <TableContainer component={Paper}>
          <Table className="compact-fixtures-table" aria-label="collapsible fixtures table" size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ width: 2, minWidth: 2, maxWidth: 2, padding: '0'}} />
                <TableCell align="center">GW</TableCell>
                <TableCell align="center">Home</TableCell>
                <TableCell
                  align="center"
                  sx={{ width: 2, minWidth: 2, maxWidth: 32, padding: '0 2px' }}
                />
                <TableCell
                  align="center"
                  sx={{ width: 2, minWidth: 2, maxWidth: 32, padding: '0 2px' }}
                />
                <TableCell align="center">Away</TableCell>
                <TableCell align="center">Difficulty</TableCell>
                <TableCell align="center">xPoints</TableCell>
                <TableCell align="center">Points</TableCell> 
                <TableCell align="center">xMinutes</TableCell>
                <TableCell align="center">Minutes</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {mergedRows.slice(0, 38).map(fix => {
                const gw = fix.event;
                const predicted_points = player[`pp_gw_${gw}` as keyof Element];
                const predicted_xmins = player[`xmins_gw_${gw}` as keyof Element];
                return (
                  <FixtureRow
                    key={fix.id}
                    row={{
                      ...fix,
                      predicted_points: typeof predicted_points === 'number' ? predicted_points : Number(predicted_points) || '-',
                      predicted_xmins: typeof predicted_xmins === 'number' ? predicted_xmins : Number(predicted_xmins) || '-',
                      total_points: fix.total_points ?? '-',
                      minutes: fix.minutes ?? '-'
                    }}
                    teams={teams}
                  />
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Past Seasons Table */}
      <h3>Past Seasons</h3>
      <TableContainer component={Paper}>
        <Table sx={{ minWidth: 650 }} size="small" aria-label="player history table">
          <TableHead>
            <TableRow>
              <TableCell>Season</TableCell>
              <TableCell align="right">Start Cost</TableCell>
              <TableCell align="right">End Cost</TableCell>
              <TableCell align="right">Points</TableCell>
              <TableCell align="right">Minutes</TableCell>
              <TableCell align="right">Goals</TableCell>
              <TableCell align="right">Assists</TableCell>
              <TableCell align="right">Clean Sheets</TableCell>
              <TableCell align="right">Goals Conceded</TableCell>
              <TableCell align="right">Own Goals</TableCell>
              <TableCell align="right">Penalties Saved</TableCell>
              <TableCell align="right">Penalties Missed</TableCell>
              <TableCell align="right">Yellow Cards</TableCell>
              <TableCell align="right">Red Cards</TableCell>
              <TableCell align="right">Saves</TableCell>
              <TableCell align="right">Bonus</TableCell>
              <TableCell align="right">BPS</TableCell>
              <TableCell align="right">Influence</TableCell>
              <TableCell align="right">Creativity</TableCell>
              <TableCell align="right">Threat</TableCell>
              <TableCell align="right">ICT Index</TableCell>
              <TableCell align="right">Defensive Contribution</TableCell>
              <TableCell align="right">Starts</TableCell>
              <TableCell align="right">xG</TableCell>
              <TableCell align="right">xA</TableCell>
              <TableCell align="right">xGI</TableCell>
              <TableCell align="right">xGC</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {historyPast
              .filter((row, idx, arr) =>
                arr.findIndex(
                  r => r.season_name === row.season_name && r.id === row.id
                ) === idx
              )
              .map((row, idx) => (
                <TableRow key={`${row.id}-${row.season_name}-${idx}`}>
                  <TableCell component="th" scope="row">{row.season_name}</TableCell>
                  <TableCell align="right">{(row.start_cost / 10).toFixed(1)}</TableCell>
                  <TableCell align="right">{(row.end_cost / 10).toFixed(1)}</TableCell>
                  <TableCell align="right">{row.total_points}</TableCell>
                  <TableCell align="right">{row.minutes}</TableCell>
                  <TableCell align="right">{row.goals_scored}</TableCell>
                  <TableCell align="right">{row.assists}</TableCell>
                  <TableCell align="right">{row.clean_sheets}</TableCell>
                  <TableCell align="right">{row.goals_conceded}</TableCell>
                  <TableCell align="right">{row.own_goals}</TableCell>
                  <TableCell align="right">{row.penalties_saved}</TableCell>
                  <TableCell align="right">{row.penalties_missed}</TableCell>
                  <TableCell align="right">{row.yellow_cards}</TableCell>
                  <TableCell align="right">{row.red_cards}</TableCell>
                  <TableCell align="right">{row.saves}</TableCell>
                  <TableCell align="right">{row.bonus}</TableCell>
                  <TableCell align="right">{row.bps}</TableCell>
                  <TableCell align="right">{row.influence}</TableCell>
                  <TableCell align="right">{row.creativity}</TableCell>
                  <TableCell align="right">{row.threat}</TableCell>
                  <TableCell align="right">{row.ict_index}</TableCell>
                  <TableCell align="right">{row.defensive_contribution}</TableCell>
                  <TableCell align="right">{row.starts}</TableCell>
                  <TableCell align="right">{row.expected_goals}</TableCell>
                  <TableCell align="right">{row.expected_assists}</TableCell>
                  <TableCell align="right">{row.expected_goal_involvements}</TableCell>
                  <TableCell align="right">{row.expected_goals_conceded}</TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
      </TableContainer>
    </div>
  );
};

export default PlayerDetail;