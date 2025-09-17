import React, { useState, useEffect } from 'react';
import styles from './TeamFormationContainer.module.css';
import { getCurrentGameweek } from '../App.tsx';

interface FormationContainerProps {
  teamId: string;
  onGameweekChange?: (gameweek: number) => void;
  onTeamPlannerModeChange?: (isPlanner: boolean) => void;
}

interface Element {
  id: number;
  first_name: string;
  second_name: string;
  element_type: number;
  team: number;
  web_name: string;
  status: string;
  now_cost: number; // in tenths, e.g. 99 = £9.9
}

interface Team {
  id: number;
  name: string;
  short_name: string;
  strength: number;
}

interface ElementSummaryHistory {
  id: number;
  element: number;
  fixture: number;
  opponent_team: number;
  total_points: number;
  was_home: number;
  kickoff_time: string;
  round: number;
  // ... other properties
}

interface ElementSummaryFixtures {
  id: number;
  element_id: number;
  code: number;
  team_h: number;
  team_a: number;
  team_h_score: number | null;
  team_a_score: number | null;
  event: number;
  finished: boolean;
  minutes: number;
  provisional_start_time: boolean;
  kickoff_time: string;
  event_name: string;
  is_home: boolean;
  difficulty: number;
}

const FormationContainer: React.FC<FormationContainerProps> = ({ 
  teamId, 
  onGameweekChange, 
  onTeamPlannerModeChange 
}) => {
  const [gw, setGw] = useState<number | undefined>(undefined);
  const [currentGameweek, setCurrentGameweek] = useState<number | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [picksData, setPicksData] = useState<any>(null);
  const [elements, setElements] = useState<Element[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [elementSummaryHistory, setElementSummaryHistory] = useState<ElementSummaryHistory[]>([]);
  const [elementSummaryFixtures, setElementSummaryFixtures] = useState<ElementSummaryFixtures[]>([]);
  const [teamPlannerMode, setTeamPlannerMode] = useState<boolean>(false); 
  const [historyData, setHistoryData] = useState<any>(null);
  const [selectedSubPlayerId, setSelectedSubPlayerId] = useState<number | null>(null);
  const [subModeActive, setSubModeActive] = useState<boolean>(false);
  const [lineup, setLineup] = useState<{ startingXI: any[], bench: any[] } | null>(null);

  useEffect(() => {
    // Load static data
    Promise.all([
      fetch('/static_json/elements.json').then(res => res.json()),
      fetch('/static_json/teams.json').then(res => res.json()),
      fetch('/static_json/element_summary_history.json').then(res => res.json()),
      fetch('/static_json/element_summary_fixtures.json').then(res => res.json()),
      getCurrentGameweek()
    ]).then(([elementsData, teamsData, historyData, fixturesData, currentGw]) => {
      
      setElements(elementsData);
      setTeams(teamsData);
      setElementSummaryHistory(historyData);
      setElementSummaryFixtures(fixturesData);
      setCurrentGameweek(currentGw);
      
      // Set the current gameweek as default if gw hasn't been set yet
      if (gw === undefined && currentGw) {
        setGw(currentGw);
      }
      setLoading(false);
    }).catch(error => {
      console.error('Error loading data:', error);
      setLoading(false);
    });
  }, [gw]);

  // Update team planner mode when gameweek or current gameweek changes
  useEffect(() => {
    if (currentGameweek !== undefined && gw !== undefined) {
      const isPlannerMode = gw >= currentGameweek;
      setTeamPlannerMode(isPlannerMode);
      
      // Notify parent component of the mode change
      onTeamPlannerModeChange?.(isPlannerMode);
    }
  }, [gw, currentGameweek, onTeamPlannerModeChange]);

  // Fetch picks data whenever gameweek changes
  useEffect(() => {
    if (gw && teamId) {
      fetchPicksData();
    }
  }, [gw, teamId]);

  const fetchPicksData = () => {
    try {
      // Fetch from localStorage (browser cache)
      const teamDataRaw = localStorage.getItem(`team_${teamId}_picks_data`);
      const historyDataRaw = localStorage.getItem(`team_${teamId}_history_data`);
      
      if (teamDataRaw) {
        const picksArray = JSON.parse(teamDataRaw);
        
        // Find the data for the current gameweek
        const gwData = picksArray.find((item: any) => item.gw === gw);
        
        setPicksData(gwData);
      } else {
        setPicksData(null);
      }

      if (historyDataRaw) {
        const historyArray = JSON.parse(historyDataRaw);
        setHistoryData(historyArray);
      } else {
        setHistoryData(null);
      }
    } catch (error) {
      console.error('Error fetching picks data:', error);
      setPicksData(null);
      setHistoryData(null);
    }
  };

  // Navigation handlers
  const handlePrevGW = () => {
    if (gw && gw > 1) {
      const newGw = gw - 1;
      setGw(newGw);
      onGameweekChange?.(newGw); // Notify parent of gameweek change
    }
  };

  const handleNextGW = () => {
    if (gw && gw < 38) {
      const newGw = gw + 1;
      setGw(newGw);
      onGameweekChange?.(newGw); // Notify parent of gameweek change
    }
  };

  // Notify parent when gameweek is initially set
  useEffect(() => {
    if (gw && onGameweekChange) {
      onGameweekChange(gw);
    }
  }, [gw, onGameweekChange]);

  const formatValue = (value: number | undefined): string => {
    if (value === undefined || value === null) return 'N/A';
    return (value / 10).toFixed(1);
  };

  const getPositionName = (positionId: number, short: boolean = false): string => {
    const positions: { [key: number]: { full: string, short: string } } = {
      1: { full: 'Goalkeeper', short: 'GK' },
      2: { full: 'Defender', short: 'DEF' },
      3: { full: 'Midfielder', short: 'MID' },
      4: { full: 'Forward', short: 'FWD' }
    };
    const position = positions[positionId];
    return position ? (short ? position.short : position.full) : 'Unknown';
  };

  const getTeamName = (teamId: number): string => {
    const team = teams.find(t => t.id === teamId);
    return team ? team.short_name : `Team ${teamId}`;
  };

  // Get opponent team name for a player in a specific gameweek
  const getOpponentInfo = (playerId: number, gameweek: number | undefined): { name: string, difficultyClass: string } => {
    if (!gameweek) {
      return { name: 'Unknown', difficultyClass: '' };
    }

    // First try to get data from elementSummaryFixtures
    if (elementSummaryFixtures.length > 0) {
      const fixtureData = elementSummaryFixtures.find(
        record => record.element_id === playerId && record.event === gameweek
      );

      if (fixtureData) {
        // Determine opponent team based on whether player is home or away
        let opponentTeamId: number;
        if (fixtureData.is_home) {
          // Player is at home, opponent is the away team
          opponentTeamId = fixtureData.team_a;
        } else {
          // Player is away, opponent is the home team
          opponentTeamId = fixtureData.team_h;
        }

        // Get opponent team name and strength
        const opponentTeam = teams.find(t => t.id === opponentTeamId);
        const opponentName = opponentTeam ? opponentTeam.short_name : 'Unknown';

        // Use uppercase for home games, lowercase for away games
        const displayName = fixtureData.is_home ? opponentName.toUpperCase() : opponentName.toLowerCase();

        // Get difficulty class from the opponent team's strength
        const difficultyClass = opponentTeam ? getDifficultyClass(opponentTeam.strength) : '';

        return { name: displayName, difficultyClass };
      }
    }

    // Fallback to elementSummaryHistory if no fixture data found
    if (elementSummaryHistory.length > 0) {
      const gameweekData = elementSummaryHistory.find(
        record => record.element === playerId && record.round === gameweek
      );

      if (gameweekData) {
        // Get opponent team name and strength
        const opponentTeam = teams.find(t => t.id === gameweekData.opponent_team);
        const opponentName = opponentTeam ? opponentTeam.short_name : 'Unknown';

        // Use uppercase for home games, lowercase for away games
        const displayName = gameweekData.was_home === 1 ? opponentName.toUpperCase() : opponentName.toLowerCase();

        // Get difficulty class from the opponent team's strength
        const difficultyClass = opponentTeam ? getDifficultyClass(opponentTeam.strength) : '';

        return { name: displayName, difficultyClass };
      }
    }

    console.log(`No opponent data found for player ${playerId} in gameweek ${gameweek}`);
    return { name: 'Unknown', difficultyClass: '' };
  };

  const getDifficultyClass = (strength: number): string => {
    if (strength < 3) {
      return styles['difficulty-easy'];
    } else if (strength === 3) {
      return styles['difficulty-medium'];
    } else {
      return styles['difficulty-hard'];
    }
  };

  // Add this helper function to get xPoints for a player in a specific gameweek
  const getPlayerXPoints = (playerId: number, gameweek: number | undefined): string => {
    if (!gameweek || elements.length === 0) {
      return '0.0';
    }

    // Find the player in elements data
    const player = elements.find(element => element.id === playerId);
    if (!player) {
      return '0.0';
    }

    // Get the xPoints field for the specific gameweek (pp_gw_##)
    const xPointsField = `pp_gw_${gameweek}`;
    const xPoints = (player as any)[xPointsField];

    // Return formatted xPoints or default to 0.0
    return xPoints ? parseFloat(xPoints).toFixed(1) : '0.0';
  };

  // Add this helper function to get total points for a player in a specific gameweek
  const getPlayerTotalPoints = (playerId: number, gameweek: number | undefined): string => {
    if (!gameweek || elementSummaryHistory.length === 0) {
      return '0';
    }

    // Find the record where element matches playerId and round matches gameweek
    const gameweekData = elementSummaryHistory.find(
      record => record.element === playerId && record.round === gameweek
    );

    if (!gameweekData) {
      return '0';
    }

    return gameweekData.total_points.toString();
  };

  // Add this helper function to check if a player was auto-subbed
  const isPlayerAutoSubbed = (playerId: number): boolean => {
    if (!picksData?.picks?.automatic_subs) {
      return false;
    }

    // Check if the player is in the automatic_subs array for this gameweek
    return picksData.picks.automatic_subs.some((sub: any) => 
      sub.element_in === playerId || sub.element_out === playerId
    );
  };

  // Add this helper function to get fixtures for a player (current + next 2)
  const getPlayerFixtures = (playerId: number, gameweek: number | undefined): Array<{ name: string, difficultyClass: string }> => {
    if (!gameweek) {
      return [{ name: 'Unknown', difficultyClass: '' }];
    }

    const fixtures = [];
    
    // Get current fixture and next 2 fixtures (gameweeks)
    for (let gw = gameweek; gw <= gameweek + 2 && gw <= 38; gw++) {
      const fixtureInfo = getOpponentInfo(playerId, gw);
      fixtures.push(fixtureInfo);
    }

    // If we don't have 3 fixtures, fill with empty ones
    while (fixtures.length < 3) {
      fixtures.push({ name: '-', difficultyClass: '' });
    }

    return fixtures;
  };

  // Process picks data to get player information
  const getPlayerLineup = () => {
    if (!picksData?.picks?.picks || elements.length === 0) return null;

    const picks = picksData.picks.picks;
    const elementsLookup = elements.reduce((acc, element) => {
      acc[element.id] = element;
      return acc;
    }, {} as { [key: number]: Element });

    const lineup = {
      startingXI: [] as any[],
      bench: [] as any[]
    };

    picks.forEach((pick: any) => {
      const player = elementsLookup[pick.element];
      if (player) {
        const fixtures = getPlayerFixtures(pick.element, gw); // Get 3 fixtures
        const xPoints = getPlayerXPoints(pick.element, gw);
        const totalPoints = getPlayerTotalPoints(pick.element, gw);
        const isAutoSubbed = isPlayerAutoSubbed(pick.element);
        
        const playerInfo = {
          id: player.id,
          element_type: player.element_type, 
          name: `${player.first_name} ${player.second_name}`,
          webName: player.web_name,
          team: getTeamName(player.team),
          fixtures: fixtures, // Array of 3 fixtures
          xPoints: xPoints,
          totalPoints: totalPoints,
          isAutoSubbed: isAutoSubbed,
          position: getPositionName(player.element_type, false),
          positionShort: getPositionName(player.element_type, true), 
          positionId: player.element_type,
          isCaptain: pick.is_captain || false,
          isViceCaptain: pick.is_vice_captain || false,
          multiplier: pick.multiplier || 1,
          pickPosition: pick.position
        };

        if (pick.position <= 11) {
          lineup.startingXI.push(playerInfo);
        } else {
          lineup.bench.push(playerInfo);
        }
      }
    });

    // Sort starting XI by pick position
    lineup.startingXI.sort((a, b) => a.pickPosition - b.pickPosition);
    lineup.bench.sort((a, b) => a.pickPosition - b.pickPosition);

    return lineup;
  };

  useEffect(() => {
    const initialLineup = getPlayerLineup();
    setLineup(initialLineup);
  }, [picksData, elements]);

  // Organize players by position for formation display
  const getFormationPlayers = () => {
    // Use the mutable lineup state in planner mode so swaps are reflected
    if (teamPlannerMode && lineup) {
      const formation = {
        goalkeepers: lineup.startingXI.filter(player => player.element_type === 1),
        defenders: lineup.startingXI.filter(player => player.element_type === 2),
        midfielders: lineup.startingXI.filter(player => player.element_type === 3),
        forwards: lineup.startingXI.filter(player => player.element_type === 4)
      };
      return { formation, bench: lineup.bench };
    }

    // Otherwise, use the original picks data (read-only)
    const staticLineup = getPlayerLineup();
    if (!staticLineup) return null;

    const formation = {
      goalkeepers: staticLineup.startingXI.filter(player => player.element_type === 1),
      defenders: staticLineup.startingXI.filter(player => player.element_type === 2),
      midfielders: staticLineup.startingXI.filter(player => player.element_type === 3),
      forwards: staticLineup.startingXI.filter(player => player.element_type === 4)
    };
    return { formation, bench: staticLineup.bench };
  };

  // Handler for substitute button
  const handleSubstituteClick = (e: React.MouseEvent, playerId: number, isBench: boolean) => {
    e.stopPropagation();
    console.log(`Substitute button clicked for player ${playerId}, isBench: ${isBench}`);
    if (!isBench) {
      if (selectedSubPlayerId === playerId) {
        setSelectedSubPlayerId(null);
        setSubModeActive(false);
      } else {
        setSelectedSubPlayerId(playerId);
        setSubModeActive(true);

        // Log selectable bench players (unchanged)
        if (lineup) {
          const selectedPlayer = lineup.startingXI.find(p => p.id === playerId);
          const benchDefenders = lineup.bench.filter(p => p.element_type === 2);
          const benchGoalkeepers = lineup.bench.filter(p => p.element_type === 1);

          const selectableBenchPlayers = lineup.bench.filter(benchPlayer => {
            if (!selectedPlayer) return false;
            if (selectedPlayer.element_type === 1) {
              return benchPlayer.element_type === 1 && benchGoalkeepers.length === 1;
            }
            if (selectedPlayer.element_type === 2) {
              return (benchPlayer.element_type === 2) ||
                     (benchPlayer.element_type === 3 ||
                      benchPlayer.element_type === 4) &&
                     benchDefenders.length < 2;
            }
            if (selectedPlayer.element_type === 3 || selectedPlayer.element_type === 4) {
              return benchPlayer.element_type === 2 ||
                benchPlayer.element_type === 3 ||
                benchPlayer.element_type === 4;
            }
          });

          console.log('Selectable bench players:', selectableBenchPlayers);
        }
      }
    } else if (subModeActive && selectedSubPlayerId !== null) {
      // Swap the selected starting XI player with the selected bench player
      if (lineup) {
        const startingIdx = lineup.startingXI.findIndex(p => p.id === selectedSubPlayerId);
        const benchIdx = lineup.bench.findIndex(p => p.id === playerId);

        if (startingIdx !== -1 && benchIdx !== -1) {
          const newStartingXI = [...lineup.startingXI];
          const newBench = [...lineup.bench];

          // Swap the players
          [newStartingXI[startingIdx], newBench[benchIdx]] = [newBench[benchIdx], newStartingXI[startingIdx]];

          // Swap their pickPosition values so they appear in the correct place
          const tempPickPosition = newStartingXI[startingIdx].pickPosition;
          newStartingXI[startingIdx].pickPosition = newBench[benchIdx].pickPosition;
          newBench[benchIdx].pickPosition = tempPickPosition;

          setLineup({
            startingXI: newStartingXI,
            bench: newBench
          });
        }
      }
      // Deselect after swap
      setSelectedSubPlayerId(null);
      setSubModeActive(false);
      console.log(`Bench player ${playerId} selected, swapped with starting XI player ${selectedSubPlayerId}.`);
    }
  };

  // Component to render a player card with shirt
  const PlayerCard = ({
    player,
    elements,
    isBench = false,
    isSelected = false,
    isSelectable = false,
    showSubButton = false,
    subButtonDisabled = false,
    onSubstituteClick
  }: {
    player: any,
    elements: Element[],
    isBench?: boolean,
    isSelected?: boolean,
    isSelectable?: boolean,
    showSubButton?: boolean,
    subButtonDisabled?: boolean,
    onSubstituteClick?: (e: React.MouseEvent) => void
  }) => {
    const kitImageSrc = `/team-kits/${player.team}.png`;

    // Find the status from elements.json
    const elementData = elements.find(el => el.id === player.id);
    const playerStatus = elementData?.status ?? '';

    return (
      <div className={
        (isBench ? styles['bench-player-card'] : styles['player-card']) +
        (isSelected ? ` ${styles['selected-sub-card']}` : '') +
        (isSelectable ? ` ${styles['selectable-bench-card']}` : '')
      }>
        {/* Substitute button at top left */}
        {showSubButton && (
          <button
            className={styles['substitute-icon']}
            onClick={onSubstituteClick} 
            aria-label="Substitute"
            type="button"
            disabled={subButtonDisabled}
          >
            <img src="/sub.png" alt="Substitute" style={{ width: 18, height: 18 }} />
          </button>
        )}
        {isBench && (
          <div className={styles['bench-position-label']}>
            {player.positionShort}
          </div>
        )}

        <div className={styles['kit-container']}>
          <img
            src={kitImageSrc}
            alt={`${player.team} kit`}
            className={styles['kit-image']}
            onError={(e) => {
              e.currentTarget.style.display = 'none';
            }}
          />
          {player.isAutoSubbed && (
            <img
              src="/autosub.png"
              alt="Auto-substituted"
              className={styles['autosub-icon']}
            />
          )}
          {player.isCaptain && (
            <div className={styles['captain-badge']}>C</div>
          )}
          {player.isViceCaptain && (
            <div className={styles['vice-captain-badge']}>V</div>
          )}
        </div>

        <div
          className={
            styles['player-name'] +
            (['u', 's', 'i'].includes(playerStatus) ? ' ' + styles['player-name-unavailable'] :
              playerStatus === 'd' ? ' ' + styles['player-name-doubtful'] : '')
          }
        >
          {player.webName}
        </div>

        <div className={isBench ? styles['player-fixtures-bench'] : styles['player-fixtures']}>
          {player.fixtures.map((fixture: any, index: number) => (
            <div 
              key={index}
              className={`${styles['fixture-item']} ${fixture.difficultyClass}`}
            >
              {fixture.name}
            </div>
          ))}
        </div>

        <div className={isBench ? styles['player-points-bench'] : styles['player-points']}>
          {teamPlannerMode ? (
            `xP: ${player.xPoints}`
          ) : (
            <>
              <span>xP:{player.xPoints}</span>
              <span className={styles['points-separator']}>|</span>
              <span>{player.totalPoints}pts</span>
            </>
          )}
        </div>
      </div>
    );
  };

  if (loading || gw === undefined) {
    return (
      <div className={styles['formation-container']}>
        <div className={styles['loading-state']}>
          Loading team formation...
        </div>
      </div>
    );
  }

  const entryHistory = picksData?.picks?.entry_history;
  const formationData = getFormationPlayers();


  const getLastValidTeamValue = (): string => {
    if (!historyData || !historyData.current || !Array.isArray(historyData.current)) {
      return 'N/A';
    }

    // Find the latest gameweek with a valid value
    const validEntries = historyData.current
      .filter((item: any) => typeof item.value === 'number' && typeof item.bank === 'number')
      .sort((a: any, b: any) => b.event - a.event); // Sort descending by event (gameweek)

    if (validEntries.length === 0) return 'N/A';

    // Use the most recent entry
    const lastEntry = validEntries[0];
    return `£${formatValue(lastEntry.value)}`;
  };

  const getSquadTotalCost = (): number => {
    if (!lineup || elements.length === 0) return 0;
    // Combine startingXI and bench
    const squad = [...lineup.startingXI, ...lineup.bench];
    return squad.reduce((sum, player) => {
      const element = elements.find(el => el.id === player.id);
      // now_cost is in tenths (e.g. 99 = £9.9)
      return sum + (element?.now_cost ?? 0);
    }, 0);
  };

  const getBankValue = (): string => {
    // getLastValidTeamValue returns a string like "£100.0"
    const teamValueStr = getLastValidTeamValue();
    const teamValue = parseFloat(teamValueStr.replace(/[£,]/g, ''));
    const squadCost = getSquadTotalCost() / 10; // convert to £

    if (isNaN(teamValue)) return 'N/A';
    return `${(teamValue - squadCost).toFixed(1)}`;
  };

  const calcTeamValue = (): string => {
    const teamValue = parseFloat(getLastValidTeamValue().replace(/[£,]/g, ''));
    const bankValue = parseFloat(getBankValue().replace(/[£,]/g, ''));
    if (isNaN(teamValue) || isNaN(bankValue)) return 'N/A';
    return (teamValue - bankValue).toFixed(1);
  }
  const calculateTotalXPoints = (): string => {
    if (!lineup || !Array.isArray(lineup.startingXI) || elements.length === 0) {
      return '0.0';
    }
  
    let totalXPoints = 0;
  
    lineup.startingXI.forEach((player: any) => {
      // Find the element data for this player
      const element = elements.find(el => el.id === player.id);
      if (element) {
        const xPointsField = `pp_gw_${gw}`;
        const playerXPoints = (element as any)[xPointsField];
        const multiplier = player.multiplier || 1;
        if (playerXPoints) {
          totalXPoints += parseFloat(playerXPoints) * multiplier;
        }
      }
    });
  
    return totalXPoints.toFixed(1);
  };

  // Update the getTransferCost function to only use the current array
  const getTransferCost = (): string => {
    if (!historyData || !gw) {
      return 'N/A';
    }

    // Handle nested structure: only use the current array for this season's data
    if (!historyData.current || !Array.isArray(historyData.current)) {
      console.warn('History data current array not found:', historyData);
      return 'N/A';
    }

    // Find the history entry for the current gameweek in the current array
    const gwHistoryData = historyData.current.find((item: any) => item.event === gw);
    
    if (!gwHistoryData || gwHistoryData.event_transfers_cost === undefined) {
      return '0';
    }

    return gwHistoryData.event_transfers_cost.toString();
  };
  // Update the getTransfers function to only use the current array
  const getTransfers = (): string => {
    if (!historyData || !gw) {
      return 'N/A';
    }

    // Handle nested structure: only use the current array for this season's data
    if (!historyData.current || !Array.isArray(historyData.current)) {
      console.warn('History data current array not found:', historyData);
      return 'N/A';
    }

    // Find the history entry for the current gameweek in the current array
    const gwHistoryData = historyData.current.find((item: any) => item.event === gw);
    
    if (!gwHistoryData || gwHistoryData.event_transfers_cost === undefined) {
      return '0';
    }

    return gwHistoryData.event_transfers.toString();
  };

  const calcFreeTransfers = (): number => {
    if (!gw || !historyData?.current || !Array.isArray(historyData.current)) {
      return 0;
    }

    // Start with 1 free transfer for gameweek 1 (you get 1 free transfer each week)
    let freeTransfers = 0;
    
    // For each week from 2 to current gameweek, add 1 and subtract transfers used
    for (let week = 2; week <= gw; week++) {
      // Add 1 free transfer for this week (max accumulation is 5)
      freeTransfers = Math.min(freeTransfers + 1, 5);
      
      // Find transfers used in the PREVIOUS week (week - 1)
      const prevWeekHistoryData = historyData.current.find((item: any) => item.event === week - 1);
      
      if (prevWeekHistoryData && prevWeekHistoryData.event_transfers !== undefined) {
        // Subtract the transfers that were used in the previous week
        freeTransfers -= prevWeekHistoryData.event_transfers;
      }
    }

    return Math.max(freeTransfers, 0); // Ensure we never return negative
  };

  // Update the return statement to use the calculated xPoints
  return (
    <div className={styles['team-formation-container']}>
      <div className={styles['gw-nav-container']}>
        <button 
          className={styles['nav-button']}
          onClick={handlePrevGW}
          disabled={gw === 1}
          aria-label="Previous Gameweek"
        >
          ‹
        </button>
        
        <div className={styles['gw-display']}>
          <span className={styles['gw-label']}>Gameweek </span>
          <span className={styles['gw-number']}>{gw}</span>
          {/* Optional: Display planner mode indicator */}
          {teamPlannerMode && (
            <span className={styles['planner-indicator']}> (Planner)</span>
          )}
        </div>
        
        <button 
          className={styles['nav-button']}
          onClick={handleNextGW}
          disabled={gw === 38}
          aria-label="Next Gameweek"
        >
          ›
        </button>
      </div>
      
      <div className={styles['gw-info-container']}>
        <div className={styles['team-stats']}>
          {entryHistory ? (
            <>
              <div className={styles['stat-card']}>
                <div className={styles['stat-label']}>Transfers</div>
                <div className={styles['stat-value']}>{getTransfers()} / {calcFreeTransfers()}</div>
              </div>

              <div className={styles['stat-card']}>
                <div className={styles['stat-label']}>Cost</div>
                <div className={styles['stat-value']}>{getTransferCost()}</div>
              </div>

              <div className={styles['stat-card']}>
                <div className={styles['stat-label']}>Value / Bank</div>
                <div className={styles['stat-value']}>£{formatValue(entryHistory.value - entryHistory.bank)} / £{formatValue(entryHistory.bank)}</div>
              </div>

              <div className={styles['stat-card']}>
                <div className={styles['stat-label']}>GW Points</div>
                <div className={styles['stat-value']}>{entryHistory.points || 'N/A'}</div>
              </div>

              <div className={styles['stat-card']}>
                <div className={styles['stat-label']}>xPoints</div>
                <div className={styles['stat-value']}>{calculateTotalXPoints()}</div>
              </div>
            </>
          ) : (
            <>
              <div className={styles['stat-card']}>
                <div className={styles['stat-label']}>Transfers</div>
                <div className={styles['stat-value']}>{getTransfers()} / {calcFreeTransfers()}</div>
              </div>

              <div className={styles['stat-card']}>
                <div className={styles['stat-label']}>Cost</div>
                <div className={styles['stat-value']}>{getTransferCost()}</div>
              </div>

              <div className={styles['stat-card']}>
                <div className={styles['stat-label']}>Value</div>
                <div className={styles['stat-value']}>£{calcTeamValue()}</div>
              </div>

              <div className={styles['stat-card']}>
                <div className={styles['stat-label']}>Bank</div>
                <div className={styles['stat-value']}>£{getBankValue()}</div>
              </div>

              <div className={styles['stat-card']}>
                <div className={styles['stat-label']}>xPoints</div>
                <div className={styles['stat-value']}>{calculateTotalXPoints()}</div>
              </div>
            </>
          )}
        </div>
      </div>
      
      <div className={styles['pitch-container']}>
        {formationData ? (
          <>
            {/* Goalkeepers */}
            {formationData.formation.goalkeepers.length > 0 && (
              <div className={styles['position-row']}>
                <div className={styles['players-row']}>
                  {formationData.formation.goalkeepers.map((player, idx) => (
                    <PlayerCard
                      key={idx}
                      player={player}
                      elements={elements}
                      isSelected={selectedSubPlayerId === player.id}
                      isBench={false}
                      showSubButton={teamPlannerMode}
                      subButtonDisabled={
                        subModeActive && selectedSubPlayerId !== player.id
                      }
                      onSubstituteClick={(e) => handleSubstituteClick(e, player.id, false)}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Defenders */}
            {formationData.formation.defenders.length > 0 && (
              <div className={styles['position-row']}>
                <div className={styles['players-row']}>
                  {formationData.formation.defenders.map((player, idx) => (
                    <PlayerCard
                      key={idx}
                      player={player}
                      elements={elements}
                      isSelected={selectedSubPlayerId === player.id}
                      isBench={false}
                      showSubButton={teamPlannerMode}
                      subButtonDisabled={
                        subModeActive && selectedSubPlayerId !== player.id
                      }
                      onSubstituteClick={(e) => handleSubstituteClick(e, player.id, false)}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Midfielders */}
            {formationData.formation.midfielders.length > 0 && (
              <div className={styles['position-row']}>
                <div className={styles['players-row']}>
                  {formationData.formation.midfielders.map((player, idx) => (
                    <PlayerCard
                      key={idx}
                      player={player}
                      elements={elements}
                      isSelected={selectedSubPlayerId === player.id}
                      isBench={false}
                      showSubButton={teamPlannerMode}
                      subButtonDisabled={
                        subModeActive && selectedSubPlayerId !== player.id
                      }
                      onSubstituteClick={(e) => handleSubstituteClick(e, player.id, false)}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Forwards */}
            {formationData.formation.forwards.length > 0 && (
              <div className={styles['position-row']}>
                <div className={styles['players-row']}>
                  {formationData.formation.forwards.map((player, idx) => (
                    <PlayerCard
                      key={idx}
                      player={player}
                      elements={elements}
                      isSelected={selectedSubPlayerId === player.id}
                      isBench={false}
                      showSubButton={teamPlannerMode}
                      subButtonDisabled={
                        subModeActive && selectedSubPlayerId !== player.id
                      }
                      onSubstituteClick={(e) => handleSubstituteClick(e, player.id, false)}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Bench */}
            {lineup && Array.isArray(lineup.bench) && lineup.bench.length > 0 && (
              <div className={styles['bench-section']}>
                <div className={styles['bench-players']}>
                  {lineup.bench.map((player, idx) => {
                    // Determine if this bench player is selectable
                    let isSelectable = false;
                    if (subModeActive && selectedSubPlayerId !== null) {
                      const selectedPlayer = lineup.startingXI.find(p => p.id === selectedSubPlayerId);
                      if (selectedPlayer) {
                        if (selectedPlayer.element_type === 1) {
                          const benchGoalkeepers = lineup.bench.filter(p => p.element_type === 1);
                          isSelectable = player.element_type === 1 && benchGoalkeepers.length === 1;
                        } else if (selectedPlayer.element_type === 2) {
                          const benchDefenders = lineup.bench.filter(p => p.element_type === 2);
                          isSelectable = (player.element_type === 2) ||
                                         (player.element_type === 3 ||
                                          player.element_type === 4) &&
                                         benchDefenders.length < 2;
                        } else if (selectedPlayer.element_type === 3 || selectedPlayer.element_type === 4) {
                          isSelectable = player.element_type === 2 ||
                                         player.element_type === 3 ||
                                         player.element_type === 4;
                        }
                      }
                    }
                  
                    return (
                      <PlayerCard
                        key={idx}
                        player={player}
                        elements={elements}
                        isSelected={selectedSubPlayerId === player.id}
                        isBench={true}
                        isSelectable={isSelectable}
                        showSubButton={teamPlannerMode}
                        subButtonDisabled={
                          !isSelectable
                        }
                        onSubstituteClick={(e) => handleSubstituteClick(e, player.id, true)}
                      />
                    );
                  })}
                </div>
              </div>
            )}
          </>
        ) : (
          <p>No valid picks data available for this gameweek</p>
        )}
      </div>
    </div>
  );
};

export default FormationContainer;