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

interface PlayerDetailProps {
  player: Element;
  team: Team | undefined;
  onClose: () => void;
  teams?: Team[]; // Add teams prop
}
function FixtureRow(props: { row: PlayerFixture & { predicted_points?: number; predicted_xmins?: number }; teams?: Team[] }) {
  const { row, teams } = props;
  const [open, setOpen] = React.useState(false);

  // Helper to get team badge URL by id
  const getTeamBadge = (id: number) => {
    const team = teams?.find(t => t.id === id);
    return team
      ? `http://localhost:5000/backend/team-badges/${team.short_name}.svg`
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
        <TableCell align="center">
          {getTeamBadge(row.team_a) ? (
            <img
              src={getTeamBadge(row.team_a)}
              alt={`Away team badge`}
              style={{ width: 28, height: 28, verticalAlign: 'middle' }}
            />
          ) : row.team_a}
        </TableCell>
        <TableCell align="center">{row.team_h_score !== null ? row.team_h_score : '-'}</TableCell>
        <TableCell align="center">{row.team_a_score !== null ? row.team_a_score : '-'}</TableCell>
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
    </React.Fragment>
  );
}

const PlayerDetail: React.FC<PlayerDetailProps> = ({ player, team, onClose, teams }) => {
  const [fixtures, setFixtures] = React.useState<PlayerFixture[]>([]);
  const [historyPast, setHistoryPast] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [csvPredictedPoints, setCsvPredictedPoints] = React.useState<{ [gw: string]: number }>({});
  const [csvPredictedMinutes, setCsvPredictedMinutes] = React.useState<{ [gw: string]: number }>({});

  const positionMap: Record<number, string> = {
    1: 'GK',
    2: 'DEF',
    3: 'MID',
    4: 'FWD',
  };
  
  React.useEffect(() => {
    setLoading(true);
    fetch(`/api/element-summary/${player.id}`)
      .then(res => res.json())
      .then(data => {
        setFixtures(data.fixtures || []);
        setHistoryPast(data.history_past || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [player.id]);

  React.useEffect(() => {
    async function fetchCsvPoints() {
      const points: { [gw: string]: number } = {};
      const position = positionMap[player.element_type];
      const price = (player.now_cost / 10).toFixed(1);
      for (const fix of fixtures) {
        const gwKey = `GW${fix.event}`;
        const res = await fetch(`/api/csv-predicted-points?name=${encodeURIComponent(player.web_name)}&gw=${gwKey}&position=${encodeURIComponent(position)}&price=${encodeURIComponent(price)}`);
        const data = await res.json();
        points[gwKey] = data.predicted_points;
      }
      setCsvPredictedPoints(points);
    }
    if (fixtures.length > 0) fetchCsvPoints();
  }, [player.web_name, fixtures]);

  React.useEffect(() => {
    async function fetchCsvMinutes() {
      const minutes: { [gw: string]: number } = {};
      const position = positionMap[player.element_type];
      const price = (player.now_cost / 10).toFixed(1);
      for (const fix of fixtures) {
        const gwKey = `GW${fix.event}`;
        const res = await fetch(`/api/csv-predicted-xmins?name=${encodeURIComponent(player.web_name)}&gw=${gwKey}&position=${encodeURIComponent(position)}&price=${encodeURIComponent(price)}`);
        const data = await res.json();
        minutes[gwKey] = data.predicted_xmins;
      }
      setCsvPredictedMinutes(minutes);
    }
    if (fixtures.length > 0) fetchCsvMinutes();
  }, [player.web_name, fixtures]);


  // Prepare predicted points array for next 5 gameweeks from csvPredictedPoints
  const next5Fixtures = fixtures.slice(0, 5);
  const predictedPointsArray = next5Fixtures.map(fix =>
    csvPredictedPoints[`GW${fix.event}`] !== undefined && csvPredictedPoints[`GW${fix.event}`] !== null
      ? csvPredictedPoints[`GW${fix.event}`]
      : 0
  );
  // Always use "GW{number}" for labels
  const gwLabels = next5Fixtures.map(fix => `GW${fix.event}`);

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
              src={`http://localhost:5000/backend/team-badges/${team.short_name}.svg`}
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

      {/* Six data boxes row */}
      <div className="player-detail-data-row">
        <div className="player-detail-data-box">
          <span className="player-detail-data-label">Total Points</span>
          <span className="player-detail-data-value">{player.total_points}</span>
        </div>
        <div className="player-detail-data-box">
          <span className="player-detail-data-label">Elite Selected %</span>
          <span className="player-detail-data-value">{player.elite_selected_percent}</span>
        </div>
        <div className="player-detail-data-box">
          <span className="player-detail-data-label">xPoints (next 5)</span>
          <span className="player-detail-data-value">{player.predicted_points_next5}</span>
        </div>
        <div className="player-detail-data-box">
          <span className="player-detail-data-label">xPoints/£M</span>
          <span className="player-detail-data-value">{player.pp_next5_per_m}</span>
        </div>
        <div className="player-detail-data-box">
          <span className="player-detail-data-label">xMins (next 5)</span>
          <span className="player-detail-data-value">{player.predicted_xmins_next5}</span>
        </div>
        <div className="player-detail-data-box">
          <span className="player-detail-data-label">xMins/£M</span>
          <span className="player-detail-data-value">{player.pxm_next5_per_m}</span>
        </div>
      </div>

      <PlayerDetailPPChart
        predictedPoints={predictedPointsArray}
        predictedXmins={next5Fixtures.map(fix =>
          csvPredictedMinutes[`GW${fix.event}`] !== undefined && csvPredictedMinutes[`GW${fix.event}`] !== null
            ? csvPredictedMinutes[`GW${fix.event}`]
            : 0
        )}
        gwLabels={gwLabels}
      />
      <h3>Fixtures</h3>
      {loading ? (
        <p>Loading fixtures...</p>
      ) : (
        <TableContainer component={Paper}>
          <Table aria-label="collapsible fixtures table" size="small">
            <TableHead>
              <TableRow>
                <TableCell />
                <TableCell align="center" sx={{ minWidth: 5, maxWidth: 10, width: 10 }}>GW</TableCell>
                <TableCell align="center">Home</TableCell>
                <TableCell align="center">Away</TableCell>
                <TableCell align="center">Home Score</TableCell>
                <TableCell align="center">Away Score</TableCell>
                <TableCell align="center">Difficulty</TableCell>
                <TableCell align="center">xPoints</TableCell>
                <TableCell align="center">xMinutes</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {fixtures.slice(0, 38).map(fix => (
                <FixtureRow
                  key={fix.id}
                  row={{
                    ...fix,
                    predicted_points: csvPredictedPoints[`GW${fix.event}`] !== undefined
                      ? csvPredictedPoints[`GW${fix.event}`]
                      : 0,
                    predicted_xmins: csvPredictedMinutes[`GW${fix.event}`] !== undefined
                      ? csvPredictedMinutes[`GW${fix.event}`]
                      : undefined
                  }}
                  teams={teams}
                />
              ))}
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
              <TableRow key={row.season_name}>
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