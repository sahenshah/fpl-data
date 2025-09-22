import React, { useState, useEffect } from 'react';
import styles from './TeamFormationContainer.module.css';
import { getCurrentGameweek } from '../App.tsx';
import Dialog from '@mui/material/Dialog';

interface FormationContainerProps {
  teamId: string;
  selectedPlayerId?: number | null;
  onGameweekChange?: (gameweek: number) => void;
  onTeamPlannerModeChange?: (isPlanner: boolean) => void;
  onSelectionHandled?: () => void; // New prop to notify when selection is handled
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
  selectedPlayerId,
  onGameweekChange, 
  onTeamPlannerModeChange,
  onSelectionHandled
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
  const [transferOutHistory, setTransferOutHistory] = useState<{ [gw: number]: any[] }>({});
  const [transferInHistory, setTransferInHistory] = useState<{ [gw: number]: any[] }>({});
  const [transferMappings, setTransferMappings] = useState<{ outId: number, inId: number }[]>([]); 
  const [modalOpen, setModalOpen] = useState(false);
  const [modalPlayer, setModalPlayer] = useState<any>(null);

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

  useEffect(() => {
    const initialLineup = getPlayerLineup();
    setLineup(initialLineup);
  }, [picksData, elements]);

  // useEffect(() => {
  //   if (lineup) {
  //     console.log('StartingXI:', lineup.startingXI);
  //     console.log('Bench:', lineup.bench);
  //   }
  // }, [lineup]);

  // useEffect(() => {
  //   if (gw !== undefined) {
  //     console.log('Transfer Out List:', transferOutHistory[gw] || []);
  //   }
  // }, [transferOutHistory, gw]);
  // useEffect(() => {
  //   if (gw !== undefined) {
  //     console.log('Transfer In List:', transferInHistory[gw] || []);
  //   }
  // }, [transferInHistory, gw]);

  useEffect(() => {
  if (
    selectedPlayerId &&
    gw !== undefined &&
    typeof gw === 'number' && transferOutHistory[gw]?.length > 0 &&
    elements.length > 0
  ) {
    // ...existing logic...

    // After handling the selection, clear it in the parent
    onSelectionHandled?.();
  }
}, [selectedPlayerId, transferOutHistory, elements, gw]);

  useEffect(() => {
    if (
      selectedPlayerId &&
      gw !== undefined &&
      transferOutHistory[gw]?.length > 0 &&
      elements.length > 0
    ) {
      const selectedPlayer = elements.find(el => el.id === selectedPlayerId);
      if (!selectedPlayer) return;

      // Format the selected player data to match transferOut structure
      const fixtures = getPlayerFixtures(selectedPlayer.id, gw);
      const xPoints = getPlayerXPoints(selectedPlayer.id, gw);
      const totalPoints = getPlayerTotalPoints(selectedPlayer.id, gw);
      const isAutoSubbed = isPlayerAutoSubbed(selectedPlayer.id);

      const formattedPlayer = {
        id: selectedPlayer.id,
        element_type: selectedPlayer.element_type,
        name: `${selectedPlayer.first_name} ${selectedPlayer.second_name}`,
        webName: selectedPlayer.web_name,
        team: getTeamName(selectedPlayer.team),
        fixtures: fixtures,
        xPoints: xPoints,
        totalPoints: totalPoints,
        isAutoSubbed: isAutoSubbed,
        position: getPositionName(selectedPlayer.element_type, false),
        positionShort: getPositionName(selectedPlayer.element_type, true),
        positionId: selectedPlayer.element_type,
        isCaptain: false,
        isViceCaptain: false,
        multiplier: 1,
        pickPosition: undefined
      };

      setTransferInHistory(prev => {
        // Check if player is in startingXI, bench, or already in transferIn
        const inStartingXI = lineup?.startingXI?.some(p => p.id === formattedPlayer.id);
        const inBench = lineup?.bench?.some(p => p.id === formattedPlayer.id);
        const inTransferIn = (prev[gw] ?? []).some((p: any) => p.id === formattedPlayer.id);

        if (!inStartingXI && !inBench && !inTransferIn) {
          return {
            ...prev,
            [gw]: [...(prev[gw] ?? []), formattedPlayer]
          };
        }
        return prev;
      });

      // Find the first unmatched transferOut slot with the same element_type
      const unmatchedOutPlayer = transferOutHistory[gw]?.find(
        outPlayer =>
          outPlayer.element_type === selectedPlayer.element_type &&
          !transferMappings.some(m => m.outId === outPlayer.id)
      );
      if (unmatchedOutPlayer) {
        setTransferMappings(prev => {
          // Remove any mapping with this inId (so a transfer-in player is only mapped once)
          const filtered = prev.filter(m => m.inId !== formattedPlayer.id);
          // Add the new mapping
          return [...filtered, { outId: unmatchedOutPlayer.id, inId: formattedPlayer.id }];
        });
      } else {
        // Remove from transferIn if no matching transferOut slot
        setTransferInHistory(prev => ({
          ...prev,
          [gw]: (prev[gw] ?? []).filter((p: any) => p.id !== formattedPlayer.id)
        }));
      }

      onSelectionHandled?.();
    }
  }, [selectedPlayerId, transferOutHistory, elements, gw, transferMappings]);

  useEffect(() => {
    if (gw !== undefined) {
      // If transferOut is empty, clear transferIn
      if ((transferOutHistory[gw]?.length ?? 0) === 0 && (transferInHistory[gw]?.length ?? 0) > 0) {
        setTransferInHistory(prev => ({
          ...prev,
          [gw]: []
        }));
      }
      // If transferIn is longer than transferOut, trim transferIn
      if ((transferInHistory[gw]?.length ?? 0) > (transferOutHistory[gw]?.length ?? 0)) {
        setTransferInHistory(prev => ({
          ...prev,
          [gw]: (prev[gw] ?? []).slice(0, transferOutHistory[gw]?.length ?? 0)
        }));
      }
    }
  }, [transferOutHistory, transferInHistory, gw]);

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

  useEffect(() => {
    if (gw !== undefined && transferInHistory[gw] && transferInHistory[gw].length > 1) {
      const unique = transferInHistory[gw].filter(
        (p, idx, arr) => arr.findIndex(q => q.id === p.id) === idx
      );
      if (unique.length !== transferInHistory[gw].length) {
        setTransferInHistory(prev => ({
          ...prev,
          [gw]: unique
        }));
      }
    }
  }, [transferInHistory]);

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

    // console.log(`No opponent data found for player ${playerId} in gameweek ${gameweek}`);
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

  const getPlayerFixtures = (playerId: number, gameweek: number | undefined): Array<{ name: string, difficultyClass: string }> => {
    if (!gameweek) {
      console.warn('getPlayerFixtures: gameweek is undefined for player', playerId);
      return [{ name: 'Unknown', difficultyClass: '' }];
    }

    const fixtures = [];

    // Show fixtures for [gameweek, gameweek+1, gameweek+2]
    for (let offset = 0; offset < 3; offset++) {
      const gwNum = gameweek + offset;
      if (gwNum > 38) break;
      const fixtureInfo = getOpponentInfo(playerId, gwNum);
      // console.log(`getPlayerFixtures: playerId=${playerId}, gwNum=${gwNum}, fixtureInfo=`, fixtureInfo);
      fixtures.push(fixtureInfo);
    }

    // If we don't have 3 fixtures, fill with empty ones
    while (fixtures.length < 3) {
      fixtures.push({ name: '-', difficultyClass: '' });
    }

    // console.log(`getPlayerFixtures: Final fixtures for playerId=${playerId}, gameweek=${gameweek}:`, fixtures);

    return fixtures;
  };

  // Process picks data to get player information
  const getPlayerLineup = () => {
    let picksSource = picksData;
    // If no picksData for this gw, fallback to previous valid gw
    if ((!picksData || !picksData.picks || !picksData.picks.picks) && gw && currentGameweek && gw > currentGameweek) {
      // Get previous valid picks data and lineup
      const prevGw = gw - 1;
      const prevPicksData = getPreviousValidPicksData(gw);
      if (!prevPicksData?.picks?.picks || elements.length === 0) return null;

      // Build previous lineup
      const prevPicks = prevPicksData.picks.picks;
      const elementsLookup = elements.reduce((acc, element) => {
        acc[element.id] = element;
        return acc;
      }, {} as { [key: number]: Element });

      let prevLineup = {
        startingXI: [] as any[],
        bench: [] as any[]
      };

      prevPicks.forEach((pick: any) => {
        const player = elementsLookup[pick.element];
        if (player) {
          const fixtures = getPlayerFixtures(pick.element, gw); // Get 3 fixtures
          const xPoints = getPlayerXPoints(pick.element, prevGw);
          const totalPoints = getPlayerTotalPoints(pick.element, prevGw);
          const isAutoSubbed = isPlayerAutoSubbed(pick.element);

          const playerInfo = {
            id: player.id,
            element_type: player.element_type, 
            name: `${player.first_name} ${player.second_name}`,
            webName: player.web_name,
            team: getTeamName(player.team),
            fixtures: fixtures,
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
            prevLineup.startingXI.push(playerInfo);
          } else {
            prevLineup.bench.push(playerInfo);
          }
        }
      });

      // Sort starting XI and bench
      prevLineup.startingXI.sort((a, b) => a.pickPosition - b.pickPosition);
      prevLineup.bench.sort((a, b) => a.pickPosition - b.pickPosition);

      // Apply transfers from previous gameweek
      const prevTransfersOut = transferOutHistory[prevGw] || [];
      const prevTransfersIn = transferInHistory[prevGw] || [];

      // Remove transferred out players from startingXI and bench
      prevLineup.startingXI = prevLineup.startingXI.filter(
        p => !prevTransfersOut.some(out => out.id === p.id)
      );
      prevLineup.bench = prevLineup.bench.filter(
        p => !prevTransfersOut.some(out => out.id === p.id)
      );

      // Add transferred in players to startingXI (or bench if you track that)
      // You may want to decide where to add them (e.g., fill startingXI first)
      prevTransfersIn.forEach(inPlayer => {
        // Only add if not already present
        if (
          !prevLineup.startingXI.some(p => p.id === inPlayer.id) &&
          !prevLineup.bench.some(p => p.id === inPlayer.id)
        ) {
          // Add to startingXI if less than 11, else to bench
          if (prevLineup.startingXI.length < 11) {
            prevLineup.startingXI.push(inPlayer);
          } else {
            prevLineup.bench.push(inPlayer);
          }
        }
      });

      // Re-sort startingXI and bench by pickPosition if needed
      prevLineup.startingXI.sort((a, b) => a.pickPosition - b.pickPosition);
      prevLineup.bench.sort((a, b) => a.pickPosition - b.pickPosition);

      return prevLineup;
    }

    if (!picksSource?.picks?.picks || elements.length === 0) return null;

    const picks = picksSource.picks.picks;
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
          fixtures: fixtures,
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

    lineup.startingXI.sort((a, b) => a.pickPosition - b.pickPosition);
    lineup.bench.sort((a, b) => a.pickPosition - b.pickPosition);

    return lineup;
  };


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

  const handleRemoveClick = (e: React.MouseEvent, playerId: number) => {
    e.stopPropagation();
    // Find the player in startingXI or bench
    const playerData = lineup?.startingXI.find(p => p.id === playerId) || lineup?.bench.find(p => p.id === playerId);
    if (playerData) {
      setTransferOutHistory(prev => {
        // Only add if not already present
        if (gw !== undefined && !prev[gw]?.some((p: any) => p.id === playerId)) {
          return {
            ...prev,
            [gw]: [...(prev[gw] ?? []), playerData]
          };
        }
        return prev;
      });
      // console.log('Remove clicked for player', playerId, playerData);
      // console.log('Current transferOut list:', [...transferOut, playerData]);
    }
  };

  function getPreviousValidPicksData(currentGw: number): any {
    if (!currentGw || !teamId) return null;
    const teamDataRaw = localStorage.getItem(`team_${teamId}_picks_data`);
    if (!teamDataRaw) return null;
    const picksArray = JSON.parse(teamDataRaw);
    // Find the latest gameweek before currentGw with valid picks
    for (let gw = currentGw - 1; gw >= 1; gw--) {
      const gwData = picksArray.find((item: any) => item.gw === gw);
      if (gwData && gwData.picks && gwData.picks.picks) {
        return gwData;
      }
    }
    return null;
  }

  // Handler for substitute button
  const handleSubstituteClick = (e: React.MouseEvent, playerId: number, isBench: boolean) => {
    e.stopPropagation();
    // console.log(`Substitute button clicked for player ${playerId}, isBench: ${isBench}`);
    if (!isBench) {
      if (selectedSubPlayerId === playerId) {
        setSelectedSubPlayerId(null);
        setSubModeActive(false);
      } else {
        setSelectedSubPlayerId(playerId);
        setSubModeActive(true);

        // Log selectable bench players (unchanged)
        // if (lineup) {
        //   const selectedPlayer = lineup.startingXI.find(p => p.id === playerId);
        //   const benchDefenders = lineup.bench.filter(p => p.element_type === 2);
        //   const benchGoalkeepers = lineup.bench.filter(p => p.element_type === 1);

          // const selectableBenchPlayers = lineup.bench.filter(benchPlayer => {
          //   if (!selectedPlayer) return false;
          //   if (selectedPlayer.element_type === 1) {
          //     return benchPlayer.element_type === 1 && benchGoalkeepers.length === 1;
          //   }
          //   if (selectedPlayer.element_type === 2) {
          //     return (benchPlayer.element_type === 2) ||
          //            (benchPlayer.element_type === 3 ||
          //             benchPlayer.element_type === 4) &&
          //            benchDefenders.length < 2;
          //   }
          //   if (selectedPlayer.element_type === 3 || selectedPlayer.element_type === 4) {
          //     return benchPlayer.element_type === 2 ||
          //       benchPlayer.element_type === 3 ||
          //       benchPlayer.element_type === 4;
          //   }
          // });

          // console.log('Selectable bench players:', selectableBenchPlayers);
        // }
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
      // console.log(`Bench player ${playerId} selected, swapped with starting XI player ${selectedSubPlayerId}.`);
    }
  };

  const handleRemoveTransferInClick = (e: React.MouseEvent, transferInId: number) => {
    e.stopPropagation();
    setTransferInHistory(prev => ({
      ...prev,
      [gw!]: (prev[gw!] ?? []).filter((p: any) => p.id !== transferInId)
    }));
    setTransferMappings(prev => prev.filter(m => m.inId !== transferInId));
    // console.log(`Restore/refresh button pressed for player ${transferInId} and removed from transferIn and transferMappings`);
  };
  const handleRestoreClick = (e: React.MouseEvent, playerId: number ) => {
    e.stopPropagation();
    setTransferOutHistory(prev => ({
      ...prev,
      [gw!]: (prev[gw!] ?? []).filter((p: any) => p.id !== playerId)
    }));
    // console.log(`Restore/refresh button pressed for player ${playerId} and removed from transferOut list`);
  };
  
  // Component to render a player card with shirt
  const PlayerCard = ({
    player,
    elements,
    transferInMatch,
    isBench = false,
    isSelected = false,
    isSelectable = false,
    showSubButton = false,
    subButtonDisabled = false,
    onSubstituteClick,
    showRemoveButton = false,
    onRemoveClick
  }: {
    player: any,
    elements: Element[],
    transferInMatch: any | null,
    isBench?: boolean,
    isSelected?: boolean,
    isSelectable?: boolean,
    showSubButton?: boolean,
    subButtonDisabled?: boolean,
    onSubstituteClick?: (e: React.MouseEvent) => void,
    showRemoveButton?: boolean,
    onRemoveClick?: (e: React.MouseEvent) => void
  }) => {
    const kitImageSrc = `/team-kits/${player.team}.png`;

    // Find the status from elements.json
    const elementData = elements.find(el => el.id === player.id);
    const playerStatus = elementData?.status ?? '';

    const isRemoved = transferOutHistory[gw!]?.some((p: any) => p.id === player.id) ?? false;
    
      return (
      <div className={
        (isBench ? styles['bench-player-card'] : styles['player-card']) +
        (isSelected ? ` ${styles['selected-sub-card']}` : '') +
        (isSelectable ? ` ${styles['selectable-bench-card']}` : '')
      }>
        {/* Remove button at top right */}
        {showRemoveButton && (
          isRemoved ? (
            transferInMatch ? (
              // Show X icon with blue background for transferred-in player
              <button
                className={styles['transfer-in-remove-icon']}
                onClick={(e) => handleRemoveTransferInClick(e, transferInMatch.id)}
                aria-label="Remove Transfer In"
                type="button"
              >
                &#10005;
              </button>
            ) : (
              // Show restore button for normal removed player
              <button
                className={styles['restore-icon']}
                onClick={(e) => handleRestoreClick(e, player.id)}
                aria-label="Restore"
                type="button"
              >
                &#8635;
              </button>
            )
          ) : (
            // Show normal remove button
            <button
              className={styles['remove-icon']}
              onClick={onRemoveClick}
              aria-label="Remove"
              type="button"
            >
              &#10005;
            </button>
          )
        )}

        {/* If removed, show only name and NONE kit */}
        {isRemoved ? (
          transferInMatch ? (
              <>
                {/* Substitute button at top left */}
                {showSubButton && (
                  <button
                    className={styles['substitute-icon']}
                    onClick={onSubstituteClick}
                    aria-label="Substitute"
                    type="button"
                    disabled={subButtonDisabled}
                  >
                    <img src="/sub.png" alt="Substitute" className={styles['substitute-icon']} />
                  </button>
                )}
                {isBench && (
                  <div className={styles['bench-position-label']}>
                    {transferInMatch.positionShort}
                  </div>
                )}
                <div className={styles['kit-container']}>
                <img
                  src={`/team-kits/${transferInMatch.team}.png`}
                  alt={`${transferInMatch.team} kit`}
                  className={styles['kit-image']}
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                  style={{ cursor: 'pointer' }}
                  onClick={() => {
                    setModalPlayer(transferInMatch ? transferInMatch : player);
                    setModalOpen(true);
                  }}
                />
                  {transferInMatch.isCaptain && (
                    <div className={styles['captain-badge']}>C</div>
                  )}
                  {transferInMatch.isViceCaptain && (
                    <div className={styles['vice-captain-badge']}>V</div>
                  )}
                </div>
                <div className={styles['player-name']}>
                  {transferInMatch.webName}
                </div>
              {/* You can show more data from transferInMatch if desired */}
              <div className={isBench ? styles['player-fixtures-bench'] : styles['player-fixtures']}>
                {transferInMatch.fixtures.map((fixture: any, index: number) => (
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
                  `xP: ${transferInMatch.xPoints}`
                ) : (
                  <>
                    <span>xP:{transferInMatch.xPoints}</span>
                    <span className={styles['points-separator']}>|</span>
                    <span>{transferInMatch.totalPoints}pts</span>
                  </>
                )}
              </div>
            </>
          ) : (
            // Default removed state: show only name and NONE kit
            <>
              <div className={styles['kit-container']}>
                <img
                  src="/team-kits/NONE.png"
                  alt="No kit"
                  className={styles['kit-image']}
                />
              </div>
              <div className={styles['player-name']}>
                {player.webName}
              </div>
            </>
          )
        ) : (
          <>
            {/* Substitute button at top left */}
            {showSubButton && (
              <button
                className={styles['substitute-icon']}
                onClick={onSubstituteClick}
                aria-label="Substitute"
                type="button"
                disabled={subButtonDisabled}
              >
                <img src="/sub.png" alt="Substitute" className={styles['substitute-icon']} />
              </button>
            )}
            {isBench && (
              <div className={styles['bench-position-label']}>
                {player.positionShort}
              </div>
            )}

            <div className={styles['kit-container']}>
              <img
                src={transferInMatch ? `/team-kits/${transferInMatch.team}.png` : kitImageSrc}
                alt={`${player.team} kit`}
                className={styles['kit-image']}
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
                style={{ cursor: (gw ?? 0) < (currentGameweek ?? 0) ? '' : 'pointer' }}
                onClick={() => {
                  if (gw !== undefined && currentGameweek !== undefined && gw >= currentGameweek) {
                    setModalPlayer(transferInMatch ? transferInMatch : player);
                    setModalOpen(true);
                  }
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
          </>
        )}
      </div>
    );
  }

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
    if (!lineup || elements.length === 0) {
      console.warn('getSquadTotalCost: lineup or elements missing', { lineup, elements });
      return 0;
    }

    // Get all 15 players in the team
    const squad = [...lineup.startingXI, ...lineup.bench];
    // console.log('getSquadTotalCost: squad', squad);

    // Sum the now_cost of all squad players
    let totalCost = squad.reduce((sum, player) => {
      const element = elements.find(el => el.id === player.id);
      const cost = element?.now_cost ?? player.now_cost ?? 0;
      if (!element) {
        console.warn('getSquadTotalCost: element not found for player', player);
      }
      if (typeof cost !== 'number') {
        console.warn('getSquadTotalCost: cost is not a number for player', player, 'cost:', cost);
      }
      return sum + cost;
    }, 0);

    // console.log('getSquadTotalCost: totalCost after squad sum', totalCost);

    // Subtract the now_cost of all players in transferOut
    const transferOutCost = transferOutHistory[gw!]?.reduce((sum, player) => {
      const element = elements.find(el => el.id === player.id);
      const cost = element?.now_cost ?? 0;
      if (!element) {
        console.warn('getSquadTotalCost: transferOut element not found for player', player);
      }
      return sum + cost;
    }, 0) ?? 0;

    // console.log('getSquadTotalCost: transferOutCost', transferOutCost);

    totalCost -= transferOutCost;

    // Add the now_cost of all players in transferIn
    const transferInCost = transferInHistory[gw!]?.reduce((sum, player) => {
      const element = elements.find(el => el.id === player.id);
      const cost = element?.now_cost ?? 0;
      if (!element) {
        console.warn('getSquadTotalCost: transferIn element not found for player', player);
      }
      return sum + cost;
    }, 0) ?? 0;

    // console.log('getSquadTotalCost: transferInCost', transferInCost);

    totalCost += transferInCost;

    // console.log('getSquadTotalCost: final totalCost', totalCost);

    return totalCost;
  };


    const getBankValue = (): string => {
    if (!historyData || !historyData.current || !Array.isArray(historyData.current)) {
      console.warn('getBankValue: historyData missing or malformed', historyData);
      return 'N/A';
    }
  
    // Find the team value for the current gameweek (from history)
    let teamValueEntry = historyData.current.find((item: any) => item.event === gw);
    let teamValue: number;
  
    if (teamValueEntry && typeof teamValueEntry.value === 'number') {
      teamValue = teamValueEntry.value / 10; // convert to £
      // console.log('getBankValue: teamValueEntry found for gw', gw, 'teamValue:', teamValue);
    } else {
      // For future gameweeks, use the last valid team value
      const validEntries = historyData.current
        .filter((item: any) => typeof item.value === 'number')
        .sort((a: any, b: any) => b.event - a.event);
      if (validEntries.length === 0) {
        console.warn('getBankValue: No validEntries found in historyData.current');
        return 'N/A';
      }
      teamValue = validEntries[0].value / 10;
      // console.log('getBankValue: using last valid teamValue from history', validEntries[0], 'teamValue:', teamValue);
    }
  
    // Calculate squad cost (starting XI + bench, including transfers)
    const squadCost = getSquadTotalCost() / 10; // convert to £
  
    // Calculate bank value
    const bankValue = teamValue - squadCost;
  
    // If result is negative or NaN, return '0.0'
    if (isNaN(bankValue)) {
      console.warn('getBankValue: bankValue is NaN', bankValue);
      return 'NaN';
    }
  
    return bankValue.toFixed(1);
  };

  const calculateTotalXPoints = (): string => {
    if (!lineup || !Array.isArray(lineup.startingXI) || elements.length === 0) {
      return '0.0';
    }

    let totalXPoints = 0;

    lineup.startingXI.forEach((player: any) => {
      // Check if player is transferred out and has a mapped transfer in
      const mapping = transferMappings.find(m => m.outId === player.id);
      const transferInPlayer = mapping
        ? transferInHistory[gw!]?.find(p => p.id === mapping.inId)
        : null;

      let xPoints = '0.0';
      let multiplier = player.multiplier || 1;

      if (transferInPlayer) {
        xPoints = (parseFloat(transferInPlayer.xPoints) * transferInPlayer.multiplier).toFixed(1);
        // If you want to use the original player's multiplier, keep as is.
        // If you want to use the transferIn player's multiplier, use transferInPlayer.multiplier.
      } else {
        xPoints = player.xPoints;
      }

      totalXPoints += parseFloat(xPoints) * multiplier;
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
      return 1;
    }

    // GW1: unlimited free transfers
    if (gw === 1) return 99;

    // GW2: always 1 free transfer
    if (gw === 2) return 1;

    let freeTransfers = 1; // GW2 starts with 1

    // Calculate free transfers for each week up to the current gw
    for (let week = 3; week <= gw; week++) {
      const prevWeek = week - 1;

      // Find previous week's history data
      const prevWeekHistoryData = historyData.current.find((item: any) => item.event === prevWeek);

      let freeTransfersPrevWeek = freeTransfers;

      // Transfers used in previous week
      let transfersUsedPrevWeek = 0;
      if (prevWeekHistoryData && typeof prevWeekHistoryData.event_transfers === 'number') {
        transfersUsedPrevWeek = prevWeekHistoryData.event_transfers;
      } else if (transferOutHistory[prevWeek]) {
        transfersUsedPrevWeek = transferOutHistory[prevWeek].length;
      }

      // Apply the rule
      if (transfersUsedPrevWeek >= freeTransfersPrevWeek) {
        freeTransfers = 1;
      } else {
        freeTransfers = Math.min(freeTransfersPrevWeek - transfersUsedPrevWeek + 1, 5);
      }
    }

    return freeTransfers;
  };
  
  // Place this just before your return (
  function getTransferInMatch(player: any) {
    // Find the mapping for this transfer-out slot
    const mapping = transferMappings.find(m => m.outId === player.id);
    if (!mapping) return null;
    return transferInHistory[gw!]?.find(p => p.id === mapping.inId) || null;
  }

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
          {'<'}
        </button>
        
        <div className={styles['gw-display']}>
          <span className={styles['gw-label']}>Gameweek </span>
          <span className={styles['gw-number']}>{gw}</span>
        </div>
        
        <button 
          className={styles['nav-button']}
          onClick={handleNextGW}
          disabled={gw === 38}
          aria-label="Next Gameweek"
        >
          {'>'}
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
                  <div className={styles['stat-value']}>
                    {(transferOutHistory[gw!] && transferOutHistory[gw!].length > 0 ? transferOutHistory[gw!].length : 0)} / {calcFreeTransfers()}
                  </div>
                </div>

              <div className={styles['stat-card']}>
                <div className={styles['stat-label']}>Cost</div>
                  <div className={styles['stat-value']}>
                    {(transferOutHistory[gw!]?.length - calcFreeTransfers()) > 0
                      ? (transferOutHistory[gw!]?.length - calcFreeTransfers()) * -4
                      : 0}
                  </div>
              </div>

              <div className={styles['stat-card']}>
                <div className={styles['stat-label']}>Value</div>
                <div className={styles['stat-value']}>{getLastValidTeamValue()}</div>
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
                      transferInMatch={getTransferInMatch(player)}
                      isSelected={selectedSubPlayerId === player.id}
                      isBench={false}
                      showSubButton={teamPlannerMode}
                      subButtonDisabled={
                        subModeActive && selectedSubPlayerId !== player.id
                      }
                      onSubstituteClick={(e) => handleSubstituteClick(e, player.id, false)}
                      showRemoveButton={gw !== undefined && currentGameweek !== undefined && gw >= currentGameweek}
                      onRemoveClick={(e) => handleRemoveClick(e, player.id)}
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
                      transferInMatch={getTransferInMatch(player)}
                      isSelected={selectedSubPlayerId === player.id}
                      isBench={false}
                      showSubButton={teamPlannerMode}
                      subButtonDisabled={
                        subModeActive && selectedSubPlayerId !== player.id
                      }
                      onSubstituteClick={(e) => handleSubstituteClick(e, player.id, false)}
                      showRemoveButton={gw !== undefined && currentGameweek !== undefined && gw >= currentGameweek}
                      onRemoveClick={(e) => handleRemoveClick(e, player.id)}
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
                      transferInMatch={getTransferInMatch(player)}
                      isSelected={selectedSubPlayerId === player.id}
                      isBench={false}
                      showSubButton={teamPlannerMode}
                      subButtonDisabled={
                        subModeActive && selectedSubPlayerId !== player.id
                      }
                      onSubstituteClick={(e) => handleSubstituteClick(e, player.id, false)}
                      showRemoveButton={gw !== undefined && currentGameweek !== undefined && gw >= currentGameweek}
                      onRemoveClick={(e) => handleRemoveClick(e, player.id)}
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
                      transferInMatch={getTransferInMatch(player)}
                      isSelected={selectedSubPlayerId === player.id}
                      isBench={false}
                      showSubButton={teamPlannerMode}
                      subButtonDisabled={
                        subModeActive && selectedSubPlayerId !== player.id
                      }
                      onSubstituteClick={(e) => handleSubstituteClick(e, player.id, false)}
                      showRemoveButton={gw !== undefined && currentGameweek !== undefined && gw >= currentGameweek}
                      onRemoveClick={(e) => handleRemoveClick(e, player.id)}
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
                        transferInMatch={getTransferInMatch(player)}
                        isSelected={selectedSubPlayerId === player.id}
                        isBench={true}
                        isSelectable={isSelectable}
                        showSubButton={teamPlannerMode}
                        subButtonDisabled={
                          !isSelectable
                        }
                        onSubstituteClick={(e) => handleSubstituteClick(e, player.id, true)}
                        showRemoveButton={gw !== undefined && currentGameweek !== undefined && gw >= currentGameweek}
                        onRemoveClick={(e) => handleRemoveClick(e, player.id)}
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

      <Dialog open={modalOpen} onClose={() => setModalOpen(false)}>
        <div className={styles['modal-content']}>
          {/* Close X icon at top right */}
          <button
            onClick={() => setModalOpen(false)}
            className={styles['modal-close-btn']}
            aria-label="Close"
          >
            &#10005;
          </button>
          <h2>{modalPlayer?.webName}</h2>
          {/* Captain and Vice Captain options */}
          <div className={styles['modal-actions']}>
            <button
              className={styles['modal-captain-btn']}
              disabled={gw !== undefined && currentGameweek !== undefined && gw < currentGameweek}
              onClick={() => {
                setLineup(prevLineup => {
                  if (!prevLineup) return prevLineup;
              
                  // Remove captain from current captain in startingXI
                  const updatedStartingXI = prevLineup.startingXI.map(p =>
                    p.isCaptain || p.multiplier === 2
                      ? { ...p, isCaptain: false, multiplier: 1 }
                      : p
                  );
              
                  // Set captain for selected player (including transferred-in)
                  const newStartingXI = updatedStartingXI.map(p =>
                    p.id === modalPlayer.id
                      ? { ...p, isCaptain: true, multiplier: 2 }
                      : p
                  );
              
                  // Remove captain from any transferred-in player
                  setTransferInHistory(prev => ({
                    ...prev,
                    [gw!]: prev[gw!]?.map(p =>
                      (p.isCaptain || p.multiplier === 2)
                        ? { ...p, isCaptain: false, multiplier: 1 }
                        : p
                    ).map(p =>
                      p.id === modalPlayer.id
                        ? { ...p, isCaptain: true, multiplier: 2 }
                        : p
                    ) ?? []
                  }));
              
                  return { ...prevLineup, startingXI: newStartingXI, bench: prevLineup.bench };
                });
                setModalOpen(false);
              }}
            >
              Captain
            </button>
            <button
              className={styles['modal-vice-btn']}
              disabled={gw !== undefined && currentGameweek !== undefined && gw < currentGameweek}
              onClick={() => {
                setLineup(prevLineup => {
                  if (!prevLineup) return prevLineup;
                  // Remove captain from current captain
                  const updatedStartingXI = prevLineup.startingXI.map(p =>
                    p.isViceCaptain 
                      ? { ...p, isViceCaptain: false }
                      : p
                  );
                  // Set captain for selected player
                  const newStartingXI = updatedStartingXI.map(p =>
                    p.id === modalPlayer.id
                      ? { ...p, isViceCaptain: true }
                      : p
                  );
                  return { ...prevLineup, startingXI: newStartingXI, bench: prevLineup.bench };
                });
                setModalOpen(false);
              }}
            >
              Vice Captain
            </button>
          </div>
        </div>
      </Dialog>
    </div>
  );
};

export default FormationContainer;