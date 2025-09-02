import * as React from 'react';
import type { Element, Team } from '../types/fpl';
import styles from './PlayerFixturesResults.module.css';

interface PlayerFixturesResultsProps {
  player: Element;
  teams?: Team[];
}

const PlayerFixturesResults: React.FC<PlayerFixturesResultsProps> = ({ player, teams }) => {
  const [history, setHistory] = React.useState<any[]>([]);
  const [allFixtures, setAllFixtures] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [openRow, setOpenRow] = React.useState<number | null>(null);

  React.useEffect(() => {
    setLoading(true);
    Promise.all([
      fetch('/static_json/fixtures.json').then(res => res.json()),
      fetch('/static_json/element_summary_history.json').then(res => res.json())
    ])
      .then(([fixturesData, historyData]) => {
        setAllFixtures(Array.isArray(fixturesData) ? fixturesData : []);
        setHistory(
          Array.isArray(historyData)
            ? historyData.filter((h: any) => h.element === player.id || h.player_id === player.id)
            : []
        );
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [player.id]);

  // Map history by gameweek
  const historyMap = React.useMemo(() => {
    const map = new Map<number, any>();
    history.forEach(h => {
      if (h.round != null) map.set(h.round, h);
    });
    return map;
  }, [history]);

  // Find all fixtures for the player's team
  const playerTeamFixtures = React.useMemo(() => {
    return allFixtures.filter(
      (fix: any) => fix.team_h === player.team || fix.team_a === player.team
    );
  }, [allFixtures, player.team]);

  // Merge history and fixtures
  const mergedRows = React.useMemo(() => {
    const rows: any[] = [];
    playerTeamFixtures.forEach(fix => {
      const gw = fix.event;
      const hist = historyMap.get(gw);
      const predicted_points = player[`pp_gw_${gw}` as keyof Element];
      const predicted_xmins = player[`xmins_gw_${gw}` as keyof Element];
      let team_h = fix.team_h;
      let team_a = fix.team_a;

      if (hist) {
        rows.push({
          ...fix,
          ...hist,
          event: gw,
          team_h,
          team_a,
          team_h_score: hist.team_h_score,
          team_a_score: hist.team_a_score,
          difficulty: fix.difficulty ?? 3,
          predicted_points,
          predicted_xmins,
          total_points: hist.total_points,
          minutes: hist.minutes,
          isHistory: true,
        });
      } else {
        rows.push({
          ...fix,
          event: gw,
          team_h,
          team_a,
          team_h_score: fix.team_h_score,
          team_a_score: fix.team_a_score,
          difficulty: fix.difficulty ?? 3,
          predicted_points,
          predicted_xmins,
          isHistory: false,
        });
      }
    });
    // Sort by gameweek
    return rows.sort((a, b) => a.event - b.event);
  }, [playerTeamFixtures, historyMap, player]);

  const getTeamBadge = (id: number) => {
    const team = teams?.find(t => t.id === id);
    return team
      ? `/team-badges/${team.short_name}.svg`
      : undefined;
  };

  const getDifficultyClass = (difficulty: number) => {
    if (difficulty === 1) return styles['fixtures-difficulty-1'];
    if (difficulty === 2) return styles['fixtures-difficulty-2'];
    if (difficulty === 3) return styles['fixtures-difficulty-3'];
    if (difficulty === 4) return styles['fixtures-difficulty-4'];
    if (difficulty === 5) return styles['fixtures-difficulty-5'];
    return '';
  };

  const Chevron = ({ open }: { open: boolean }) => (
    <svg
      width="16"
      height="16"
      style={{
        display: 'inline-block',
        transition: 'transform 0.2s',
        transform: open ? 'rotate(90deg)' : 'rotate(0deg)',
        verticalAlign: 'middle',
      }}
      viewBox="0 0 16 16"
      fill="none"
      stroke="#fff"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-label={open ? 'Collapse row' : 'Expand row'}
    >
      <polyline points="5 3 11 8 5 13" />
    </svg>
  );

  return (
    <div>
      <h3 style={{ color: '#fff', marginBottom: 16 }}></h3>
      {loading ? (
        <p style={{ color: '#fff' }}>Loading fixtures...</p>
      ) : (
        <div className={styles['fixtures-results-container']}>
          <table className={styles['fixtures-results-table']}>
            <colgroup>
              <col style={{ width: '5%' }} />
              <col style={{ width: '8%' }} />
              <col style={{ width: '3%' }} />
              <col style={{ width: '2%' }} />
              <col style={{ width: '3%' }} />
              <col style={{ width: '8%' }} />
              <col style={{ width: '8%' }} />
              <col style={{ width: '8%' }} />
              <col style={{ width: '8%' }} />
              <col style={{ width: '8%' }} />
              <col style={{ width: '8%' }} />
              <col style={{ width: '6%' }} />
            </colgroup>
            <thead>
              <tr>
                <th className={styles['fixtures-results-cell']}>GW</th>
                <th className={styles['fixtures-results-cell']}>Home</th>
                <th className={`${styles['fixtures-results-cell']} ${styles['h-col']}`}></th>
                <th className={styles['fixtures-results-cell']}></th>
                <th className={`${styles['fixtures-results-cell']} ${styles['a-col']}`}></th>
                <th className={styles['fixtures-results-cell']}>Away</th>
                <th className={styles['fixtures-results-cell']}>Difficulty</th>
                <th className={styles['fixtures-results-cell']}>xPoints</th>
                <th className={styles['fixtures-results-cell']}>Points</th>
                <th className={styles['fixtures-results-cell']}>xMinutes</th>
                <th className={styles['fixtures-results-cell']}>Minutes</th>
                <th className={styles['fixtures-results-cell']}></th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td colSpan={12} style={{ height: 4, background: 'transparent', border: 'none', padding: 0 }} />
              </tr>
              {mergedRows.map((fix, idx) => {
                const gw = fix.event;
                const isHome = fix.team_h === player.team;
                const playerScore = isHome ? fix.team_h_score : fix.team_a_score;
                const opponentScore = isHome ? fix.team_a_score : fix.team_h_score;

                let resultClass = '';
                if (playerScore != null && opponentScore != null) {
                  if (playerScore > opponentScore) resultClass = 'result-win';
                  else if (playerScore < opponentScore) resultClass = 'result-loss';
                  else resultClass = 'result-draw';
                }

                const predicted_points = fix.predicted_points;
                const predicted_xmins = fix.predicted_xmins;
                const isOpen = openRow === idx;
                return (
                  <React.Fragment key={fix.id || `${gw}-${idx}`}>
                    <tr>
                      <td colSpan={12} style={{ padding: 0, border: 'none', background: 'transparent' }}>
                        <div
                          className={styles['fixtures-row-group-container']}
                          style={
                            isOpen
                              ? { background: '#8373f7', borderRadius: 28 }
                              : { background: 'transparent', borderRadius: 28 }
                          }
                          tabIndex={0}
                          role="button"
                          aria-pressed={isOpen}
                          onClick={() => setOpenRow(isOpen ? null : idx)}
                          onKeyDown={e => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              setOpenRow(isOpen ? null : idx);
                            }
                          }}
                        >
                          <table style={{
                            width: '100%',
                            borderCollapse: 'separate',
                            borderSpacing: 0
                          }}>
                            <colgroup>
                              <col style={{ width: '5%' }} />
                              <col style={{ width: '8%' }} />
                              <col style={{ width: '3%' }} />
                              <col style={{ width: '2%' }} />
                              <col style={{ width: '3%' }} />
                              <col style={{ width: '8%' }} />
                              <col style={{ width: '8%' }} />
                              <col style={{ width: '8%' }} />
                              <col style={{ width: '8%' }} />
                              <col style={{ width: '8%' }} />
                              <col style={{ width: '8%' }} />
                              <col style={{ width: '6%' }} />
                            </colgroup>
                            <tbody>
                              <tr className={`${styles['fixtures-results-row']} ${isOpen ? styles['open'] : ''}`}>
                                <td className={`${styles['fixtures-results-cell']} ${styles['first']}`}>{fix.event}</td>
                                <td className={styles['fixtures-results-cell']}>
                                  {getTeamBadge(fix.team_h) ? (
                                    <img
                                      src={getTeamBadge(fix.team_h)}
                                      alt="Home team badge"
                                      style={{ width: 28, height: 28, verticalAlign: 'middle' }}
                                    />
                                  ) : fix.team_h}
                                </td>
                                <td className={`${styles['fixtures-results-cell']} ${styles['h-col']} ${styles[resultClass]}`}>
                                  {fix.team_h_score !== null && fix.team_h_score !== undefined ? fix.team_h_score : '-'}
                                </td>
                                <td className={`${styles['fixtures-results-cell']} ${styles[resultClass]}`}>
                                  {(
                                    (fix.team_h_score !== null && fix.team_h_score !== undefined && fix.team_a_score !== null && fix.team_a_score !== undefined)
                                      ? '-' : 'vs'
                                  )}
                                </td>
                                <td className={`${styles['fixtures-results-cell']} ${styles['a-col']} ${styles[resultClass]}`}>
                                  {fix.team_a_score !== null && fix.team_a_score !== undefined ? fix.team_a_score : '-'}
                                </td>
                                <td className={styles['fixtures-results-cell']}>
                                  {getTeamBadge(fix.team_a) ? (
                                    <img
                                      src={getTeamBadge(fix.team_a)}
                                      alt="Away team badge"
                                      style={{ width: 28, height: 28, verticalAlign: 'middle' }}
                                    />
                                  ) : fix.team_a}
                                </td>
                                <td className={styles['fixtures-results-cell']}>
                                  <span className={`${styles['fixtures-difficulty']} ${getDifficultyClass(fix.difficulty)}`}>{fix.difficulty}</span>
                                </td>
                                <td className={styles['fixtures-results-cell']}>
                                  {predicted_points !== undefined && predicted_points !== null ? predicted_points : '-'}
                                </td>
                                <td className={styles['fixtures-results-cell']}>
                                  {fix.total_points !== undefined && fix.total_points !== null ? fix.total_points : '-'}
                                </td>
                                <td className={styles['fixtures-results-cell']}>
                                  {predicted_xmins !== undefined && predicted_xmins !== null ? predicted_xmins : '-'}
                                </td>
                                <td className={styles['fixtures-results-cell']}>
                                  {fix.minutes ? fix.minutes : '-'}
                                </td>
                                <td className={`${styles['fixtures-results-cell']} ${styles['last']}`}>
                                  <button
                                    style={{
                                      background: 'none',
                                      border: 'none',
                                      padding: 0,
                                      margin: 0,
                                      cursor: 'pointer',
                                      outline: 'none',
                                    }}
                                    tabIndex={-1}
                                    onClick={e => {
                                      e.stopPropagation();
                                      setOpenRow(isOpen ? null : idx);
                                    }}
                                    aria-label={isOpen ? 'Collapse row' : 'Expand row'}
                                  >
                                    <Chevron open={isOpen} />
                                  </button>
                                </td>
                              </tr>
                              {isOpen && (
                                <tr className={styles['fixtures-details-row']}>
                                  <td colSpan={13} style={{
                                    padding: 0,
                                    background: 'transparent',
                                    borderRadius: '28px',
                                  }}>
                                    <div className={styles['fixtures-details-content']}>
                                      <div style={{
                                        display: 'flex',
                                        flexWrap: 'wrap',
                                        gap: 16,
                                        marginTop: 8
                                      }}>
                                        {[
                                          { label: 'Date', value: fix.kickoff_time ? new Date(fix.kickoff_time).toLocaleDateString() : null },
                                          { label: 'Minutes played', value: fix.minutes },
                                          { label: 'Goals', value: fix.goals_scored },
                                          { label: 'Assists', value: fix.assists },
                                          { label: 'Clean Sheets', value: fix.clean_sheets },
                                          { label: 'Own Goals', value: fix.own_goals },
                                          { label: 'Penalties Saved', value: fix.penalties_saved },
                                          { label: 'Penalties Missed', value: fix.penalties_missed },
                                          { label: <img src="/YC.svg" alt="Yellow Cards" title="Yellow Cards" style={{ width: 18, height: 18, verticalAlign: 'middle' }} />, value: fix.yellow_cards },
                                          { label: <img src="/RC.svg" alt="Red Cards" title="Red Cards" style={{ width: 18, height: 18, verticalAlign: 'middle' }} />, value: fix.red_cards },
                                          { label: 'Saves', value: fix.saves },
                                          { label: 'Bonus', value: fix.bonus },
                                          { label: 'BPS', value: fix.bps },
                                          { label: 'Influence', value: fix.influence },
                                          { label: 'Creativity', value: fix.creativity },
                                          { label: 'Threat', value: fix.threat },
                                          { label: 'ICT Index', value: fix.ict_index },
                                          { label: 'CBI', value: fix.clearances_blocks_interceptions },
                                          { label: 'Recoveries', value: fix.recoveries },
                                          { label: 'Tackles', value: fix.tackles },
                                          { label: 'Def Con', value: fix.defensive_contribution },
                                          { label: 'xG', value: fix.expected_goals },
                                          { label: 'xA', value: fix.expected_assists },
                                          { label: 'xGI', value: fix.expected_goal_involvements },
                                          { label: 'xGC', value: fix.expected_goals_conceded },
                                        ]
                                          .filter(item => {
                                            if (
                                              item.value === undefined ||
                                              item.value === null ||
                                              item.value === ''
                                            ) return false;
                                            if (!isNaN(Number(item.value)) && Number(item.value) === 0) return false;
                                            return true;
                                          })
                                          .map(item => (
                                            <div key={String(item.label)} style={{
                                              minWidth: 0,
                                              background: '#6e61cc',
                                              borderRadius: 12,
                                              padding: '5px 8px',
                                              display: 'flex',
                                              flexDirection: 'column',
                                              alignItems: 'center',
                                              boxShadow: '0 0.5px 2px rgba(0,0,0,0.07)',
                                            }}>
                                              <span style={{
                                                fontWeight: 400,
                                                color: '#c5c5c5ff',
                                                fontSize: '0.72rem',
                                                marginBottom: 1,
                                                letterSpacing: 0.05,
                                              }}>
                                                {item.label}
                                              </span>
                                              <span style={{
                                                color: '#fff',
                                                fontWeight: 500,
                                                fontSize: '0.93rem',
                                                paddingTop: 10,
                                                letterSpacing: 0.05,
                                              }}>
                                                {item.value}
                                              </span>
                                            </div>
                                          ))}
                                      </div>
                                    </div>
                                  </td>
                                </tr>
                              )}
                            </tbody>
                          </table>
                        </div>
                      </td>
                    </tr>
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default PlayerFixturesResults;