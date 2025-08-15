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
import PlayerDetailPPChart from './PlayerDetailPPChart';
import type { Element, Team, PlayerFixture } from '../types/fpl';
import { getCurrentGameweek } from '../App';

interface PlayerDetailProps {
  player: Element;
  team: Team | undefined;
  onClose: () => void;
  teams?: Team[];
  events?: { id: number; is_next: boolean }[]; // Pass events as a prop
}

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
          {row.predicted_xmins !== undefined && row.predicted_xmins !== null ? row.predicted_xmins : '-'}
        </TableCell>
      </TableRow>
      {open && (
        <TableRow>
          <TableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={10}>
            <Collapse in={open} timeout="auto" unmountOnExit>
              <Box sx={{ margin: 1 }}>
                <div>
                  <strong>Kickoff time:</strong> {row.kickoff_time ? new Date(row.kickoff_time).toLocaleString() : '-'}<br />
                  <strong>Minutes played:</strong> {row.minutes}<br />
                </div>
              </Box>
            </Collapse>
          </TableCell>
        </TableRow>
      )}
    </React.Fragment>
  );
}

const positionMap: Record<number, string> = {
  1: 'GK',
  2: 'DEF',
  3: 'MID',
  4: 'FWD',
};

const PlayerDetail: React.FC<PlayerDetailProps> = ({ player, team, onClose, teams }) => {
  const [fixtures, setFixtures] = React.useState<PlayerFixture[]>([]);
  const [historyPast, setHistoryPast] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [currentGW, setCurrentGW] = React.useState<number>(1);

  // Fetch current gameweek on mount
  React.useEffect(() => {
    getCurrentGameweek().then(gw => {
      if (gw) setCurrentGW(gw);
    });
  }, []);

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
        setHistoryPast(data.history_past || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [player.id]);
  if (!player) return null;

  return (
    <div className="player-detail-modal">
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
            justifyContent: 'flex-start', // align to the left so scrolling starts at first box
            alignItems: 'center',
            padding: '0 8px', // optional: add a little side padding
          }}
        >
          {[
            { label: 'Total Points', value: player.total_points },
            { label: 'xGI/90', value: player.expected_goal_involvements_per_90 },
            { label: 'xG/90', value: player.expected_goals_per_90 },
            { label: 'xA/90', value: player.expected_assists_per_90 },
            { label: 'Elite Selected %', value: player.elite_selected_percent },
            { label: 'xPoints (next 5)', value: player.predicted_points_next5 },
            { label: 'xPoints/£M', value: player.pp_next5_per_m },
            { label: 'xMins (next 5)', value: player.predicted_xmins_next5 },
            { label: 'xMins/£M', value: player.pxm_next5_per_m },
            { label: 'Form', value: player.form },
            { label: 'ICT Index', value: player.ict_index },
            { label: 'CBI', value: player.clearances_blocks_interceptions },
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

      <PlayerDetailPPChart
        predictedPoints={predictedPointsNext5}
        predictedXmins={xMinsNext5}
      />
      <h3>Fixtures</h3>
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
                  sx={{ width: 2, minWidth: 2, maxWidth: 32, padding: '0 2px' }} // Home Score column
                >
                  {/* Home Score */}
                </TableCell>
                <TableCell
                  align="center"
                  sx={{ width: 2, minWidth: 2, maxWidth: 32, padding: '0 2px' }} // Away Score column
                >
                  {/* Away Score */}
                </TableCell>
                <TableCell align="center">Away</TableCell>
                <TableCell align="center">Difficulty</TableCell>
                <TableCell align="center">xPoints</TableCell>
                <TableCell align="center">xMinutes</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {fixtures.slice(0, 38).map(fix => {
                // Get the gameweek number for this fixture
                const gw = fix.event;
                // Lookup xPoints and xMins from the player element table
                const predicted_points = player[`pp_gw_${gw}` as keyof Element];
                const predicted_xmins = player[`xmins_gw_${gw}` as keyof Element];
                return (
                  <FixtureRow
                    key={fix.id}
                    row={{
                      ...fix,
                      predicted_points: typeof predicted_points === 'number' ? predicted_points : Number(predicted_points) || 0,
                      predicted_xmins: typeof predicted_xmins === 'number' ? predicted_xmins : Number(predicted_xmins) || 0,
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
            {historyPast.map((row) => (
              <TableRow key={row.id}>
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