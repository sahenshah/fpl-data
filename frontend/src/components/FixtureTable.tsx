import { useEffect, useState } from 'react';
import type { Team, Fixture } from '../types/fpl';
import styles from './FixtureTable.module.css';
import { getCurrentGameweek } from '../App';
import Slider from '@mui/material/Slider';

interface FixtureTableProps {
  teams: Team[];
  fixtures: Fixture[];
}

function getDifficultyColor(difficulty: number) {
  switch (difficulty) {
    case 1: return '#00831fff';
    case 2: return '#54c96fe5';
    case 3: return '#f3be4de3';
    case 4: return '#e75f5fff';
    case 5: return '#a7242fff';
    default: return '#fff';
  }
}

const FixtureTable = ({ teams, fixtures }: FixtureTableProps) => {
  const [currentGW, setCurrentGW] = useState<number>(1);
  const [gwRange, setGwRange] = useState<[number, number]>([1, 5]);
  const [sortByDifficulty, setSortByDifficulty] = useState(false);
  const [sortByAttackDifficulty, setSortByAttackDifficulty] = useState(false);
  const [sortByDefenceDifficulty, setSortByDefenceDifficulty] = useState(false);
  const [sortColumn, setSortColumn] = useState<string>('position');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  useEffect(() => {
    getCurrentGameweek().then(gw => {
      if (gw) {
        setCurrentGW(gw);
        setGwRange([gw, gw + 4 > 38 ? 38 : gw + 4]);
      }
    });
  }, []);

  const gwColumns = Array.from({ length: 38 }, (_, i) => ({
    label: `GW${i + 1}`,
    key: `gw_${i + 1}`,
    gw: i + 1,
  }));

  // Add a new column definition after 'points'
  const columns = [
    { label: '#', key: 'position' },
    { label: '', key: 'badge' },
    { label: 'Name', key: 'name' },
    { label: 'Strength', key: 'strength' },
    { label: 'Played', key: 'played' },
    { label: 'Win', key: 'win' },
    { label: 'Draw', key: 'draw' },
    { label: 'Loss', key: 'loss' },
    { label: 'Points', key: 'points' },
    { label: 'Avg FDR', key: 'avg_fdr' },
    { label: 'Avg FDR (Attack)', key: 'avg_fdr_attack' },   // <-- new column
    { label: 'Avg FDR (Defence)', key: 'avg_fdr_defence' }, // <-- new column
    ...gwColumns.slice(gwRange[0] - 1, gwRange[1]),
  ];

  const teamFixturesMap = buildTeamFixturesMap(teams, fixtures);

  function getTeamDifficulty(team: Team, mode: 'overall' | 'attack' | 'defence' = 'overall') {
    let total = 0;
    for (let gw = gwRange[0]; gw <= gwRange[1]; gw++) {
      const fixture = fixtures.find(fix =>
        (fix.team_h === team.id || fix.team_a === team.id) && fix.event === gw
      );
      if (fixture) {
        if (fixture.team_h === team.id) {
          // Home: use opponent's value
          const opponent = teams.find(t => t.id === fixture.team_a);
          if (mode === 'overall') {
            total += opponent ? Number(opponent.strength_overall_away) || 0 : 0;
          } else if (mode === 'attack') {
            total += opponent ? Number(opponent.strength_defence_away) || 0 : 0;
          } else if (mode === 'defence') {
            total += opponent ? Number(opponent.strength_attack_away) || 0 : 0;
          }
        } else if (fixture.team_a === team.id) {
          // Away: use opponent's value
          const opponent = teams.find(t => t.id === fixture.team_h);
          if (mode === 'overall') {
            total += opponent ? Number(opponent.strength_overall_home) || 0 : 0;
          } else if (mode === 'attack') {
            total += opponent ? Number(opponent.strength_defence_home) || 0 : 0;
          } else if (mode === 'defence') {
            total += opponent ? Number(opponent.strength_attack_home) || 0 : 0;
          }
        }
      }
    }
    return total;
  }

  // Helper to calculate average fixture difficulty for a team over selected GWs
  function getAverageFDR(team: Team) {
    let totalDifficulty = 0;
    let count = 0;
    for (let gw = gwRange[0]; gw <= gwRange[1]; gw++) {
      const fixture = teamFixturesMap[team.id][gw];
      if (fixture && fixture.difficulty) {
        totalDifficulty += fixture.difficulty;
        count++;
      }
    }
    return count > 0 ? (totalDifficulty / count).toFixed(2) : '-';
  }

  function getAverageAttackFDR(team: Team) {
    let totalAttack = 0;
    let count = 0;
    for (let gw = gwRange[0]; gw <= gwRange[1]; gw++) {
      const fixture = fixtures.find(fix =>
        (fix.team_h === team.id || fix.team_a === team.id) && fix.event === gw
      );
      if (fixture) {
        let opponent: Team | undefined;
        let opponentStrength = 0;
        let difficulty = 0;
        if (fixture.team_h === team.id) {
          opponent = teams.find(t => t.id === fixture.team_a);
          opponentStrength = opponent ? Number(opponent.strength_defence_away) || 0 : 0;
          difficulty = fixture.team_h_difficulty;
        } else if (fixture.team_a === team.id) {
          opponent = teams.find(t => t.id === fixture.team_h);
          opponentStrength = opponent ? Number(opponent.strength_defence_home) || 0 : 0;
          difficulty = fixture.team_a_difficulty;
        }
        if (opponentStrength && difficulty) {
          totalAttack += (opponentStrength / 1000) * difficulty;
          count++;
        }
      }
    }
    return count > 0 ? (totalAttack / count).toFixed(2) : '-';
  }

  function getAverageDefenceFDR(team: Team) {
    let totalDefence = 0;
    let count = 0;
    for (let gw = gwRange[0]; gw <= gwRange[1]; gw++) {
      const fixture = fixtures.find(fix =>
        (fix.team_h === team.id || fix.team_a === team.id) && fix.event === gw
      );
      if (fixture) {
        let opponent: Team | undefined;
        let opponentStrength = 0;
        let difficulty = 0;
        if (fixture.team_h === team.id) {
          opponent = teams.find(t => t.id === fixture.team_a);
          opponentStrength = opponent ? Number(opponent.strength_attack_away) || 0 : 0;
          difficulty = fixture.team_h_difficulty;
        } else if (fixture.team_a === team.id) {
          opponent = teams.find(t => t.id === fixture.team_h);
          opponentStrength = opponent ? Number(opponent.strength_attack_home) || 0 : 0;
          difficulty = fixture.team_a_difficulty;
        }
        if (opponentStrength && difficulty) {
          totalDefence += (opponentStrength / 1000) * difficulty;
          count++;
        }
      }
    }
    return count > 0 ? (totalDefence / count).toFixed(2) : '-';
  }

  // Sorting logic
  const sortedTeams = (() => {
    let arr = sortByDifficulty
      ? [...teams]
          .map(team => {
            const avgFDR = Number(getAverageFDR(team));
            return { team, avgFDR: isNaN(avgFDR) ? Infinity : avgFDR };
          })
          .sort((a, b) => a.avgFDR - b.avgFDR) // Ascending order
          .map(obj => obj.team)
      : sortByAttackDifficulty
      ? [...teams]
          .map(team => {
            const difficulty = getTeamDifficulty(team, 'attack');
            return { team, difficulty };
          })
          .sort((a, b) => a.difficulty - b.difficulty) // Ascending order
          .map(obj => obj.team)
      : sortByDefenceDifficulty
      ? [...teams]
          .map(team => {
            const difficulty = getTeamDifficulty(team, 'defence');
            return { team, difficulty };
          })
          .sort((a, b) => a.difficulty - b.difficulty) // Ascending order
          .map(obj => obj.team)
      : [...teams];

    if (sortColumn && !sortByDifficulty && !sortByAttackDifficulty && !sortByDefenceDifficulty) {
      arr = arr.sort((a, b) => {
        let aValue, bValue;

        if (sortColumn === 'avg_fdr') {
          aValue = Number(getAverageFDR(a));
          bValue = Number(getAverageFDR(b));
        } else if (sortColumn === 'avg_fdr_attack') {
          aValue = Number(getAverageAttackFDR(a));
          bValue = Number(getAverageAttackFDR(b));
        } else if (sortColumn === 'avg_fdr_defence') {
          aValue = Number(getAverageDefenceFDR(a));
          bValue = Number(getAverageDefenceFDR(b));
        } else {
          aValue = a[sortColumn as keyof Team];
          bValue = b[sortColumn as keyof Team];
          if (typeof aValue === 'string' && !isNaN(Number(aValue))) aValue = Number(aValue);
          if (typeof bValue === 'string' && !isNaN(Number(bValue))) bValue = Number(bValue);
        }

        if (aValue == null) return 1;
        if (bValue == null) return -1;

        if (typeof aValue === 'number' && typeof bValue === 'number') {
          return sortDirection === 'asc' ? aValue - bValue : bValue - aValue;
        }
        return sortDirection === 'asc'
          ? String(aValue).localeCompare(String(bValue))
          : String(bValue).localeCompare(String(aValue));
      });
    }
    return arr;
  })();

  const handleSort = (colKey: string) => {
    if (sortByDifficulty) setSortByDifficulty(false);
    if (sortByAttackDifficulty) setSortByAttackDifficulty(false);
    if (sortByDefenceDifficulty) setSortByDefenceDifficulty(false);

    if (sortColumn === colKey) {
      setSortDirection(d => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortColumn(colKey);
      setSortDirection('asc');
    }
  };

  return (
    <div className={styles['fixture-table-outer-container']}>
      <div className={styles['fixture-table-container']}>
        <div className={styles['fixture-controls']}>
          <div className={styles['fixture-slider']} 
               style={{ 
                display: 'flex', 
                justifyContent: 'center',
                marginTop: 30,
                alignItems: 'center', 
                gap: 0 }}>
            <span style={{ 
              color: '#fff', 
              minWidth: 35, 
              padding: 0, 
              textAlign: 'right', 
              justifyContent: 'center',
              fontSize: 22, 
              fontWeight: 600 
            }}>
              GW {gwRange[0]}
            </span>
            <Slider
              value={gwRange}
              min={1}
              max={38}
              step={1}
              onChange={(_, value) => setGwRange(value as [number, number])}
              valueLabelDisplay="auto"
              disableSwap
              sx={{
                width: '50%',
                color: '#7768f6',
                mx: 2,
                '& .MuiSlider-rail': {
                  height: 22,
                  borderRadius: 4,
                  color: '#000000ff'
                },
                '& .MuiSlider-track': {
                  height: 22,
                  color: '#7768f6',
                  borderRadius: 0,
                },
                '& .MuiSlider-thumb': {
                  color: '#000000ff',
                  outline: '3px solid #7768f6',
                  height: 20,
                  width: 20,
                  '&:hover, &.Mui-focusVisible': {
                    height: 36,
                    width: 36,
                  },
                  '& .MuiSlider-valueLabel': {
                    background: '#7768f6',
                    borderRadius: '6px',
                    color: '#fff',
                    fontWeight: 400,
                    fontSize: '1.2rem',
                    padding: '4px 20px',
                  },
                }
              }}
            />
            <span style={{ 
              color: '#fff', 
              minWidth: 48, 
              padding: 0, 
              fontSize: 22, 
              textAlign: 'left', 
              justifyContent: 'center',
              fontWeight: 600 
            }}>
              GW {gwRange[1]}
            </span>
          </div>
        </div>
        <div style={{ overflowX: 'auto', maxWidth: '95vw', width: '100%' }}>
          <table className={styles['fixture-table']}>
            <thead>
              <tr>
                {columns.map(col => (
                  <th
                    key={col.key}
                    className={
                      col.key === 'badge' ? styles['sticky-badge-fixture'] :
                      col.key === 'position' ? styles['sticky-position'] :
                      col.key === 'name' ? styles['sticky-name'] :
                      'gw' in col && col.gw === currentGW ? styles['current-gw-col'] : undefined
                    }
                    style={{
                      cursor: col.key !== 'badge' && !col.key.startsWith('gw_') ? 'pointer' : undefined,
                      minWidth: col.key === 'badge' ? 40 : undefined,
                    }}
                    onClick={() => {
                      if (
                        col.key !== 'badge' &&
                        !col.key.startsWith('gw_')
                      ) {
                        handleSort(col.key);
                      }
                    }}
                  >
                    {col.key === 'badge' ? <span>&nbsp;</span> : (
                      <>
                        {col.label}
                        {sortColumn === col.key && (
                          sortDirection === 'asc'
                            ? <span style={{ verticalAlign: 'middle', fontSize: 16, marginLeft: 2 }}>▲</span>
                            : <span style={{ verticalAlign: 'middle', fontSize: 16, marginLeft: 2 }}>▼</span>
                        )}
                      </>
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sortedTeams.map(team => (
                <tr key={team.id}>
                  {columns.map(col => {
                    const stickyClass =
                      col.key === 'position' ? styles['sticky-position'] :
                      col.key === 'name' ? styles['sticky-name'] :
                      undefined;

                    if (col.key === 'badge') {
                      return (
                        <td key={col.key} className={styles['sticky-badge-fixture']}>
                          <img
                            src={`/team-badges/${team.short_name}.svg`}
                            alt={team.short_name}
                            style={{ width: 28, height: 28 }}
                          />
                        </td>
                      );
                    }

                    if (col.key === 'strength') {
                      const strengthValue = team[col.key as keyof Team];
                      const bgColor = getDifficultyColor(Number(strengthValue));
                      return (
                        <td key={col.key}>
                          <span
                            style={{
                              backgroundColor: bgColor,
                              color: '#ffffffff',
                              fontWeight: 'bold',
                              borderRadius: '8px',
                              padding: '4px 12px',
                              display: 'inline-block',
                              minWidth: 32,
                            }}
                          >
                            {strengthValue}
                          </span>
                        </td>
                      );
                    }

                    if (col.key === 'avg_fdr') {
                      return (
                        <td key={col.key}>
                          {getAverageFDR(team)}
                        </td>
                      );
                    }

                    if (col.key === 'avg_fdr_attack') {
                      return (
                        <td key={col.key}>
                          {getAverageAttackFDR(team)}
                        </td>
                      );
                    }

                    if (col.key === 'avg_fdr_defence') {
                      return (
                        <td key={col.key}>
                          {getAverageDefenceFDR(team)}
                        </td>
                      );
                    }

                    if (col.key.startsWith('gw_')) {
                      const gwNum = Number(col.key.replace('gw_', ''));
                      const fixture = teamFixturesMap[team.id][gwNum];
                      const bgColor = fixture ? getDifficultyColor(fixture.difficulty) : '#fff';
                      return (
                        <td
                          key={col.key}
                          className={`${stickyClass ? stickyClass + ' ' : ''}${gwNum === currentGW ? styles['current-gw-cell'] : ''}`}
                          style={{ backgroundColor: bgColor }}
                        >
                          {fixture ? fixture.text : ''}
                        </td>
                      );
                    }

                    return (
                      <td
                        key={col.key}
                        className={`${stickyClass ? stickyClass : ''}${col.key === 'name' ? ' name-cell' : ''}`}
                      >
                        {col.key === 'name'
                          ? (
                            <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'left', fontWeight: 'bold' }}>
                              <span>{team[col.key as keyof Team]}</span>
                              <span style={{ fontWeight: 400, fontSize: '0.85em', color: '#bdbdbd' }}>
                                {team.short_name}
                              </span>
                            </span>
                          )
                          : team[col.key as keyof Team] ?? ''}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

// Create a lookup: teamId -> { gwNumber -> fixtureInfo }
function buildTeamFixturesMap(teams: Team[], fixtures: Fixture[]) {
  const map: Record<number, Record<number, { text: string, difficulty: number }>> = {};
  const teamShortName: Record<number, string> = {};
  teams.forEach(team => {
    map[team.id] = {};
    teamShortName[team.id] = team.short_name;
  });

  fixtures.forEach(fix => {
    // Home team: show opponent in UPPERCASE, use team_h_difficulty
    if (map[fix.team_h]) {
      map[fix.team_h][fix.event] = {
        text: teamShortName[fix.team_a].toUpperCase(),
        difficulty: fix.team_h_difficulty
      };
    }
    // Away team: show opponent in lowercase, use team_a_difficulty
    if (map[fix.team_a]) {
      map[fix.team_a][fix.event] = {
        text: teamShortName[fix.team_h].toLowerCase(),
        difficulty: fix.team_a_difficulty
      };
    }
  });

  return map;
}

export default FixtureTable;