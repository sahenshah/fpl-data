import React, { useState, useEffect } from 'react';
import styles from './TeamSelection.module.css';
import type { Team, Element } from '../types/fpl';
import { getCurrentGameweek } from '../App'; // Import the function
import TeamSelectionFilters from './TeamSelectionFilters';
import TeamSelectionPlayerTable from './TeamSelectionPlayerTable';
import { FaTimes, FaUndo } from 'react-icons/fa'; // Or use your own SVG for the x icon
import { HiOutlineArrowsUpDown } from "react-icons/hi2";


interface TeamSelectionProps {
  teamId: string;
}

const positionMap: { [key: number]: string } = {
  1: 'Goalkeeper',
  2: 'Defender',
  3: 'Midfielder',
  4: 'Forward',
};

const benchPositionMap: { [key: string]: string } = {
  Goalkeeper: 'GK',
  Defender: 'DEF',
  Midfielder: 'MID',
  Forward: 'FWD',
};

const TeamSelection: React.FC<TeamSelectionProps> = ({ teamId }) => {
  const teamDataRaw = localStorage.getItem(`team_${teamId}_picks_data`);
  const picksArray = teamDataRaw ? JSON.parse(teamDataRaw) : [];
  const [gw, setGw] = useState(1);
  const [elements, setElements] = useState<Element[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [fixtures, setFixtures] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);
	const [filteredPlayers, setFilteredPlayers] = useState<Element[]>([]);
	const [costRange, setCostRange] = useState<[number, number]>([38, 150]);
	const [activeFilters, setActiveFilters] = React.useState<string[]>(['General']);
  const [picksVersion, setPicksVersion] = useState(0);
  const [selectable, setSelectable] = React.useState<boolean>(false); // <-- change to boolean
  const [selectedPlayerId, setSelectedPlayerId] = React.useState<number | null>(null);
  const [originalGwPicks, setOriginalGwPicks] = useState<{ [position: number]: any }>({});
  // Add substitute state
  const [substituteMode, setSubstituteMode] = useState<{ active: boolean; starterPosition?: number }>({
    active: false,
    starterPosition: undefined,
  });

  useEffect(() => {
    fetch('/static_json/elements.json')
      .then(res => res.json())
      .then(data => setElements(data))
      .catch(() => setElements([]));
    fetch('/static_json/teams.json')
      .then(res => res.json())
      .then(data => setTeams(data))
      .catch(() => setTeams([]));
    fetch('/static_json/fixtures.json')
      .then(res => res.json())
      .then(data => setFixtures(data))
      .catch(() => setFixtures([]));
    fetch('/static_json/element_summary_history.json')
      .then(res => res.json())
      .then(data => setHistory(data))
      .catch(() => setHistory([]));
  }, []);
	useEffect(() => {
		setFilteredPlayers(elements);
	}, [elements]);


  const getDynamicPicksForGameweek = (gw: number) => {
    // Find the most recent gameweek <= gw with picks
    let sourceGw = gw;
    while (sourceGw > 0) {
      const found = picksArray.find((item: any) => item.gw === sourceGw && item.picks && item.picks.picks);
      if (found) {
        // If this is a future gameweek and has explicit picks, use them
        if (sourceGw === gw && found.picks && found.picks.picks) {
          return found.picks.picks;
        }
        // Otherwise, deep copy the picks from the previous gameweek
        return found.picks.picks.map((pick: any) => ({
          ...pick,
          gw_transfer: false,
          gw_transfer_in: false,
        }));
      }
      sourceGw--;
    }
    return [];
  };

  const currentGwData = picksArray.find((item: any) => item.gw === gw);
  const pickData = currentGwData?.picks || {};
  const picks = getDynamicPicksForGameweek(gw);

  const captainId = picks.find((p: any) => p.is_captain)?.element;
  const viceCaptainId = picks.find((p: any) => p.is_vice_captain)?.element;

  const starters = picks.filter((pick: any) => pick.position <= 11);
  const bench = picks.filter((pick: any) => pick.position >= 12 && pick.position <= 15);

  const automaticSubs = pickData.automatic_subs || [];

  const getAutoSubStatus = (elementId: number) => {
    const inSub = automaticSubs.find((sub: any) => sub.element_in === elementId);
    const outSub = automaticSubs.find((sub: any) => sub.element_out === elementId);
    return {
      isIn: !!inSub,
      isOut: !!outSub,
      showIcon: !!(inSub || outSub),
    };
  };

  // Get opponent team name for a player in the current GW
  const getOpponent = (player: Element) => {
    const fixture = fixtures.find(
      (f: any) =>
        Number(f.event) === Number(gw) &&
        (f.team_h === player.team || f.team_a === player.team)
    );
    if (!fixture) return { short_name: 'No fixture', strength: 0 };
    const opponentTeamId = fixture.team_h === player.team ? fixture.team_a : fixture.team_h;
    const opponentTeam = teams.find(t => t.id === opponentTeamId);
    return opponentTeam
      ? { short_name: opponentTeam.short_name, strength: opponentTeam.strength }
      : { short_name: 'Unknown', strength: 0 };
  };

  const getOpponentBgColor = (strength: number) => {
    if (strength < 3) return '#4caf50'; // green
    if (strength === 3) return '#bdbdbd'; // grey
    if (strength > 3) return '#e74c3c'; // red
    return '#bdbdbd'; // default grey
  };

  const getPlayerInfo = (pick: any) => {
    if (pick.gw_transfer === true) {
      // For bench, use position to determine type
      let positionType = 'Unknown';
      if (pick.position >= 12 && pick.position <= 15) {
        // Use the original bench pick's element_type if available, or fallback
        positionType = benchPositionMap[positionMap[pick.element_type] || 'Unknown'] || 'Unknown';
      } else if (pick.position <= 11) {
        positionType = positionMap[pick.element_type] || 'Unknown';
      }
      return {
        name: '',
        positionType,
        isCaptain: false,
        isViceCaptain: false,
        kitSrc: 'team-kits/NONE.png',
        autoSubStatus: { showIcon: false },
        opponent: '',
        opponentStrength: 0,
        expectedPoints: null,
        actualPoints: null,
      };
    }
    const player = elements.find(e => e.id === pick.element);
    const team = player ? teams.find(t => t.id === player.team) : undefined;
    const kitSrc = team ? `team-kits/${team.short_name}.png` : '';
    const autoSubStatus = getAutoSubStatus(pick.element);
    const opponentObj = player ? getOpponent(player) : { short_name: '', strength: 0 };
    const ppGwKey = `pp_gw_${gw}`;
    const expectedPoints =
      player && typeof (player as any)[ppGwKey] !== 'undefined'
        ? (player as any)[ppGwKey]
        : null;
    // Get actual points from element_summary_history.json
    const historyItem = history.find(
      (h: any) =>
        h.element === pick.element &&
        Number(h.round) === Number(gw)
    );
    const actualPoints = historyItem ? historyItem.total_points : null;
    
    return {
      id: pick.element,
      name: player ? player.web_name : '',
      positionType: player ? positionMap[player.element_type] : 'Unknown',
      isCaptain: pick.element === captainId,
      isViceCaptain: pick.element === viceCaptainId,
      kitSrc,
      autoSubStatus,
      opponent: opponentObj.short_name,
      opponentStrength: opponentObj.strength,
      expectedPoints,
      actualPoints,
    };
  };

  // Calculate xPoints for starting 11
  const startingPlayers = picks.filter((pick: any) => pick.position <= 11).map(getPlayerInfo);
  const totalXPoints = startingPlayers.reduce(
    (sum: number, player: { expectedPoints: number | null; isCaptain: boolean }) =>
      typeof player.expectedPoints === 'number'
        ? sum + (player.isCaptain ? player.expectedPoints * 2 : player.expectedPoints)
        : sum,
    0
  );
  const gk = starters.filter((p: { element_type: number; }) => p.element_type === 1).map(getPlayerInfo);
  const def = starters.filter((p: { element_type: number; }) => p.element_type === 2).map(getPlayerInfo);
  const mid = starters.filter((p: { element_type: number; }) => p.element_type === 3).map(getPlayerInfo);
  const fwd = starters.filter((p: { element_type: number; }) => p.element_type === 4).map(getPlayerInfo);
  const benchPlayers = bench.map(getPlayerInfo);

  const handlePrev = () => setGw(gw > 1 ? gw - 1 : 1);
  const handleNext = () => setGw(gw < 38 ? gw + 1 : 38);

  // Get current gameweek value using the imported function
  const [currentGameweek, setCurrentGameweek] = useState<number | undefined>(undefined);

  useEffect(() => {
    getCurrentGameweek().then(setCurrentGameweek);
  }, []);

  // Helper to calculate free transfers for the current gameweek
  const getFreeTransfers = (gw: number, teamId: string) => {
    const teamHistoryRaw = localStorage.getItem(`team_${teamId}_history_data`);
    const picksDataRaw = localStorage.getItem(`team_${teamId}_picks_data`);
    const picksArray = picksDataRaw ? JSON.parse(picksDataRaw) : [];

    if (!teamHistoryRaw) return Math.min(gw, 5);

    const teamHistory = JSON.parse(teamHistoryRaw);
    const historyArr = teamHistory.current || [];

    let freeTransfers = 0;

    if (gw === 1) return '∞'; // Unlimited transfers for GW1

    // Check if wildcard or freehit played in current GW
    const currentGwHistory = historyArr.find((h: { event: number; }) => h.event === gw);
    if (currentGwHistory && (currentGwHistory.active_chip === 'wildcard' || currentGwHistory.active_chip === 'freehit')) {
      return '∞';
    }

    // Calculate free transfers based on previous gameweeks
    for (let i = 2; i <= gw; i++) {
      // Increase by 1 each week (max 5)
      freeTransfers = Math.min(freeTransfers + 1, 5);

      // Only reduce based on transfers made in PREVIOUS gameweeks
      if (i < gw) {
        // Check history data first (for past gameweeks)
        const prevGwHistory = historyArr.find((h: { event: number; }) => h.event === i);
        if (prevGwHistory) {
          freeTransfers = Math.max(freeTransfers - (prevGwHistory.event_transfers || 0), 0);
        } else {
          // For future gameweeks, check picks data for gw_transfer_in
          const prevGwPicks = picksArray.find((item: any) => item.gw === i);
          if (prevGwPicks && prevGwPicks.picks && prevGwPicks.picks.picks) {
            const transfersIn = prevGwPicks.picks.picks.filter((p: any) => p.gw_transfer_in === true).length;
            freeTransfers = Math.max(freeTransfers - transfersIn, 0);
          }
        }
      }
    }

    return freeTransfers;
  };

  // Find the last gameweek with valid entry_history data before the current gameweek
  const lastPastGwData = typeof currentGameweek === 'number'
    ? picksArray
        .filter((item: any) => item.gw < currentGameweek && item.picks?.entry_history)
        .slice(-1)[0]?.picks?.entry_history
    : undefined;

  const gwTransferCount = typeof currentGameweek === 'number' && gw >= currentGameweek
  ? picks.filter((p: any) => p.gw_transfer_in === true).length
  : 0;

  const freeTransfers = getFreeTransfers(gw, teamId);
  const cost =
    typeof currentGameweek === 'number' && gw >= currentGameweek
      ? Math.max((gwTransferCount - (freeTransfers === '∞' ? gwTransferCount : freeTransfers)) * 4, 0)
      : pickData.entry_history?.event_transfers_cost || 0;

  // Get base values from last valid gameweek
  let lastTeamValue = (lastPastGwData?.value / 10) || 100; 
  let lastBank = (lastPastGwData?.bank / 10) || 0; 

  // Adjust for transfers in the current gameweek
  if (typeof currentGameweek === 'number' && gw >= currentGameweek) {
    picks.forEach((p: any) => {
      if (p.gw_transfer === true || p.gw_transfer_in === true) {
        const player = elements.find(e => e.id === p.element);
        if (player && typeof player.now_cost === 'number') {
          const cost = player.now_cost / 10;
          lastTeamValue -= cost;
          lastBank += cost;
        }
      }
    });
  }

  let calculatedBank: string;
  let calculatedValue: string;
  if (typeof currentGameweek === 'number' && gw >= currentGameweek) {
    calculatedBank = lastBank.toFixed(1);
    calculatedValue = (lastPastGwData?.value / 10 - lastBank).toFixed(1);
  } else {
    calculatedBank = (lastPastGwData?.bank / 10).toFixed(1);
    calculatedValue = (lastPastGwData?.value / 10 - lastPastGwData?.value / 10).toFixed(1);
  }

  useEffect(() => {
    const hasGwTransfer = picks.some((p: any) => p.gw_transfer === true);
    setSelectable(hasGwTransfer);
  }, [picksVersion, gw, picks]);

  const handleSetGwTransfer = (position: number) => {
    const gwIndex = picksArray.findIndex((item: any) => item.gw === gw);
    if (gwIndex === -1) return;

    const currentGwData = picksArray[gwIndex];
    const pickData = currentGwData?.picks || {};
    const picks = pickData.picks || [];

    // Store original pick data for restore if not already stored for this position
    setOriginalGwPicks(prev => {
      if (prev[position]) return prev;
      const originalPick = picks.find((p: any) => p.position === position);
      if (originalPick) {
        return { ...prev, [position]: { ...originalPick } };
      }
      return prev;
    });
    
    // Set gw_transfer to true for the pick with the matching position
    const updatedPicks = picks.map((p: any) =>
      p.position === position
        ? { ...p, gw_transfer: true }
        : p
    );
    picksArray[gwIndex].picks.picks = updatedPicks;

    localStorage.setItem(`team_${teamId}_picks_data`, JSON.stringify(picksArray));
    // Optionally trigger a re-render if needed (e.g. with a state update)
    setPicksVersion(v => v + 1);
  };

  // Add this handler to restore gw_transfer to false for a pick
  const handleRestoreGwTransfer = (position: number) => {
    const gwIndex = picksArray.findIndex((item: any) => item.gw === gw);
    if (gwIndex === -1) return;

    const currentGwData = picksArray[gwIndex];
    const pickData = currentGwData?.picks || {};
    const picks = pickData.picks || [];

    // Always use originalGwPicks[position] for restore
    const originalPick = originalGwPicks[position];
    if (originalPick) {
      const updatedPicks = picks.map((p: any) =>
        p.position === position
          ? { ...originalPick, gw_transfer: false, gw_transfer_in: false }
          : p
      );
      picksArray[gwIndex].picks.picks = updatedPicks;
      localStorage.setItem(`team_${teamId}_picks_data`, JSON.stringify(picksArray));
      setPicksVersion(v => v + 1);
    }
  };

  const replacePlayerInTeam = (selectedPlayer: Element) => {
    if (!selectedPlayer) return;

    const teamDataRaw = localStorage.getItem(`team_${teamId}_picks_data`);
    const picksArray = teamDataRaw ? JSON.parse(teamDataRaw) : [];
    const gwIndex = picksArray.findIndex((item: any) => item.gw === gw);
    if (gwIndex === -1) return;

    const currentGwData = picksArray[gwIndex];
    const pickData = currentGwData?.picks || {};
    const picks = pickData.picks || [];

    // Find a pick with matching element_type and gw_transfer === true
    const replaceIdx = picks.findIndex(
      (p: any) => p.element_type === selectedPlayer.element_type && p.gw_transfer === true
    );

    if (replaceIdx !== -1) {
      const originalElement = picks[replaceIdx].element;
      const isSamePlayer = originalElement === selectedPlayer.id;

      // Now replace the pick with the new player
      picks[replaceIdx] = {
        ...picks[replaceIdx],
        element: selectedPlayer.id,
        gw_transfer: false,
        gw_transfer_in: !isSamePlayer,
      };
      picksArray[gwIndex].picks.picks = picks;
      localStorage.setItem(`team_${teamId}_picks_data`, JSON.stringify(picksArray));
      setPicksVersion(v => v + 1);
    }
  };
  
  // Handler to set selected player id
  const handleSelectPlayer = (id: number | null, player?: Element) => {
    setSelectedPlayerId(id);
    if (player) {
      console.log(player); // Log full player data
      replacePlayerInTeam(player);
    }
  };

  // Load original picks on mount
  useEffect(() => {
    const stored = localStorage.getItem(`team_${teamId}_gw_${gw}_original_picks`);
    if (stored) {
      setOriginalGwPicks(JSON.parse(stored));
    }
  }, [teamId, gw]);

  // Persist original picks on change
  useEffect(() => {
    localStorage.setItem(
      `team_${teamId}_gw_${gw}_original_picks`,
      JSON.stringify(originalGwPicks)
    );
  }, [originalGwPicks, teamId, gw]);

  useEffect(() => {
    return () => {
      // On unmount, restore all removed players for the current gameweek
      const teamDataRaw = localStorage.getItem(`team_${teamId}_picks_data`);
      const picksArray = teamDataRaw ? JSON.parse(teamDataRaw) : [];
      const gwIndex = picksArray.findIndex((item: any) => item.gw === gw);
      if (gwIndex === -1) return;

      const currentGwData = picksArray[gwIndex];
      const pickData = currentGwData?.picks || {};
      const picks = pickData.picks || [];

      // Restore all picks with gw_transfer: true using originalGwPicks
      const updatedPicks = picks.map((p: any) => {
        if (p.gw_transfer === true && originalGwPicks[p.position]) {
          return { ...originalGwPicks[p.position], gw_transfer: false, gw_transfer_in: false };
        }
        return p;
      });

      picksArray[gwIndex].picks.picks = updatedPicks;
      localStorage.setItem(`team_${teamId}_picks_data`, JSON.stringify(picksArray));
    };
  }, [teamId, gw, originalGwPicks]);

  const handleSubstitutePlayer = (starterPosition: number) => {
    setSubstituteMode({
      active: true,
      starterPosition: starterPosition,
    });
  };

    // Add formation rule checker
  const checkFormationRules = (starterPick: any, benchPick: any, allPicks: any[]) => {
    // Create a copy of picks with the substitution applied
    const testPicks = allPicks.map(p => {
      if (p.position === starterPick.position) {
        return { ...p, element_type: benchPick.element_type };
      }
      if (p.position === benchPick.position) {
        return { ...p, element_type: starterPick.element_type };
      }
      return p;
    });
  
    // Count positions in starting XI (positions 1-11)
    const startingXI = testPicks.filter(p => p.position <= 11);
    const gkCount = startingXI.filter(p => p.element_type === 1).length;
    const defCount = startingXI.filter(p => p.element_type === 2).length;
  
    // Check minimum requirements
    return gkCount === 1 && defCount >= 3;
  };
  
  // Update handleBenchSelection to enforce formation rules
  const handleBenchSelection = (benchPosition: number) => {
    if (!substituteMode.active || !substituteMode.starterPosition) return;
  
    const teamDataRaw = localStorage.getItem(`team_${teamId}_picks_data`);
    const picksArray = teamDataRaw ? JSON.parse(teamDataRaw) : [];
    const gwIndex = picksArray.findIndex((item: any) => item.gw === gw);
    if (gwIndex === -1) return;
  
    const currentGwData = picksArray[gwIndex];
    const pickData = currentGwData?.picks || {};
    const picks = pickData.picks || [];
  
    // Find the starter and bench player
    const starterIdx = picks.findIndex((p: any) => p.position === substituteMode.starterPosition);
    const benchIdx = picks.findIndex((p: any) => p.position === benchPosition);
  
    if (starterIdx !== -1 && benchIdx !== -1) {
      const starterPick = picks[starterIdx];
      const benchPick = picks[benchIdx];
  
      // Check formation rules
      const canSubstitute = checkFormationRules(starterPick, benchPick, picks);
      
      if (!canSubstitute) {
        alert('Substitution would violate formation rules. At least 1 GK and 3 DEF must be in the starting XI.');
        setSubstituteMode({ active: false, starterPosition: undefined });
        return;
      }
  
      // Swap their positions
      const tempPosition = picks[starterIdx].position;
      picks[starterIdx].position = picks[benchIdx].position;
      picks[benchIdx].position = tempPosition;
  
      picksArray[gwIndex].picks.picks = picks;
      localStorage.setItem(`team_${teamId}_picks_data`, JSON.stringify(picksArray));
      setPicksVersion(v => v + 1);
    }
  
    // Exit substitute mode
    setSubstituteMode({ active: false, starterPosition: undefined });
  };
  
  // Add function to check if a bench player is a valid substitute
  const isValidBenchSubstitute = (benchPick: any, starterPosition: number) => {
    if (!substituteMode.active || !starterPosition) return false;
    
    const starterPick = picks.find((p: any) => p.position === starterPosition);
    if (!starterPick) return false;
  
    // GK can only substitute with GK
    if (starterPick.element_type === 1) {
      return benchPick.element_type === 1;
    }
  
    // For other positions, check if substitution would violate formation rules
    return checkFormationRules(starterPick, benchPick, picks);
  };

  const handleCancelSubstitute = () => {
    setSubstituteMode({ active: false, starterPosition: undefined });
  };

  //Captaincy and Vice Captaincy handlers
  const [captainModal, setCaptainModal] = useState<{
    open: boolean;
    playerId?: number;
    playerName?: string;
    position?: number;
  }>({
    open: false,
    playerId: undefined,
    playerName: undefined,
    position: undefined,
  });

  // Add captain selection handler
  const handleOpenCaptainModal = (playerId: number, playerName: string, position: number) => {
    if (substituteMode.active) return; // Don't open modal during substitute mode
    
    // Only allow captaincy changes for current and future gameweeks
    if (typeof currentGameweek === 'number' && gw < currentGameweek) return;
  
    setCaptainModal({
      open: true,
      playerId,
      playerName,
      position,
    });
  };

  // Add captain assignment handlers
  const handleSetCaptain = () => {
    if (!captainModal.playerId) return;

    const teamDataRaw = localStorage.getItem(`team_${teamId}_picks_data`);
    const picksArray = teamDataRaw ? JSON.parse(teamDataRaw) : [];
    const gwIndex = picksArray.findIndex((item: any) => item.gw === gw);
    if (gwIndex === -1) return;

    const currentGwData = picksArray[gwIndex];
    const pickData = currentGwData?.picks || {};
    const picks = pickData.picks || [];

    // Remove existing captain and vice captain, set new captain
    const updatedPicks = picks.map((p: any) => ({
      ...p,
      is_captain: p.element === captainModal.playerId,
      is_vice_captain: p.is_captain ? false : p.is_vice_captain, // Remove VC if they were captain
    }));

    picksArray[gwIndex].picks.picks = updatedPicks;
    localStorage.setItem(`team_${teamId}_picks_data`, JSON.stringify(picksArray));
    setPicksVersion(v => v + 1);
    setCaptainModal({ open: false });
  };

  const handleSetViceCaptain = () => {
    if (!captainModal.playerId) return;

    const teamDataRaw = localStorage.getItem(`team_${teamId}_picks_data`);
    const picksArray = teamDataRaw ? JSON.parse(teamDataRaw) : [];
    const gwIndex = picksArray.findIndex((item: any) => item.gw === gw);
    if (gwIndex === -1) return;

    const currentGwData = picksArray[gwIndex];
    const pickData = currentGwData?.picks || {};
    const picks = pickData.picks || [];

    // Remove existing vice captain, set new vice captain
    const updatedPicks = picks.map((p: any) => ({
      ...p,
      is_vice_captain: p.element === captainModal.playerId,
    }));

    picksArray[gwIndex].picks.picks = updatedPicks;
    localStorage.setItem(`team_${teamId}_picks_data`, JSON.stringify(picksArray));
    setPicksVersion(v => v + 1);
    setCaptainModal({ open: false });
  };

  return (
    <div className={styles['team-selection-container']}>
      <div className={styles['team-selection-inner-container']}>
        <div className='team-formation-data-container'>
          <div style={{ display: 'flex', justifyContent: 'center', height: '1.5rem', fontSize: '1.2rem', fontWeight: '600', color: '#fff', marginBottom: '1rem' }}>
            Gameweek {gw} Team Selection
          </div>
          <div
            style={{
              display: 'flex',
              flexDirection: 'row',
              width: '100%',
              gap: '20px',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '20px'
            }}>
            <button
              className={styles['team-selection-button']}
              onClick={handlePrev}
              disabled={gw === 1}
            >
              {'<'}
            </button>
            <button
              className={styles['team-selection-button']}
              onClick={handleNext}
              disabled={gw === 38}
              style={{ marginLeft: '8px' }}
            >
              {'>'}
            </button>
          </div>
          <div className={styles['gw-info']}>
            {typeof currentGameweek === 'number' && gw >= currentGameweek ? (
              // Show alternate info for future/current gameweeks
              <>
                <div className={styles['team-formation-data-card']}>
                  <div className={styles['team-formation-data-title']}>
                    GW Transfers:
                  </div>
                  <div className={styles['team-formation-data-value']}> {gwTransferCount} / {getFreeTransfers(gw, teamId)}</div>
                </div>
                <div className={styles['team-formation-data-card']}>
                  <div className={styles['team-formation-data-title']}>Cost:</div>
                  <div className={styles['team-formation-data-value']}>
                    {cost === 0 ? '0' : -cost}
                    </div>
                </div>
                <div className={styles['team-formation-data-card']}>
                  <div className={styles['team-formation-data-title']}>xPoints:</div>
                  <div className={styles['team-formation-data-value']}>
                    {totalXPoints ? totalXPoints.toFixed(1) : '0.0'}
                  </div>
                </div>
                <div className={styles['team-formation-data-card']}>
                  <div className={styles['team-formation-data-title']}>Value:</div>
                  <div className={styles['team-formation-data-value']}>£{calculatedValue}</div>
                </div>
                <div className={styles['team-formation-data-card']}>
                  <div className={styles['team-formation-data-title']}>Bank:</div>
                  <div className={styles['team-formation-data-value']}>£{calculatedBank}</div>
                </div>
              </>
            ) : (
              // Show normal GW info for past gameweeks
              <>
                <div className={styles['team-formation-data-card']}>
                  <div className={styles['team-formation-data-title']}>
                    GW Transfers:
                  </div>
                  <div className={styles['team-formation-data-value']}>{pickData.entry_history?.event_transfers} / {getFreeTransfers(gw, teamId)}</div>
                </div>
                <div className={styles['team-formation-data-card']}>
                  <div className={styles['team-formation-data-title']}>Cost:</div>
                  <div className={styles['team-formation-data-value']}>{pickData.entry_history?.event_transfers_cost}</div>
                </div>
                <div className={styles['team-formation-data-card']}>
                  <div className={styles['team-formation-data-title']}>xPoints:</div>
                  <div className={styles['team-formation-data-value']}>
                    {totalXPoints ? totalXPoints.toFixed(1) : '0.0'}
                  </div>
                </div>
                <div className={styles['team-formation-data-card']}>
                  <div className={styles['team-formation-data-title']}>GW Points:</div>
                  <div className={styles['team-formation-data-value']}>{pickData.entry_history?.points}</div>
                </div>
                <div className={styles['team-formation-data-card']}>
                  <div className={styles['team-formation-data-title']}>GW Rank:</div>
                  <div className={styles['team-formation-data-value']}>{pickData.entry_history?.rank_sort}</div>
                </div>
              </>
            )}
          </div>
          <div className={styles['formation-container']}>
            {/* GK Players */}
            <div className={styles['formation-row']}>
              {gk.map((player: {
                id?: number | null;
                opponentStrength: number;
                kitSrc: string | undefined;
                autoSubStatus: { showIcon: any; };
                name: string | undefined;
                isCaptain: any;
                isViceCaptain: any;
                opponent: string | undefined;
                gw_transfer?: boolean;
                position?: number;
                expectedPoints?: number | null;
                actualPoints?: number | null;
              }, idx: React.Key | null | undefined) => {
                // Find the original pick for this slot in starters
                const pick = starters.filter((p: any) => p.element_type === 1)[idx as number];
                return (
                  <div
                    key={idx}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      position: 'relative',
                    }}
                  >
                    {player.kitSrc && (
                      <div style={{ position: 'relative', width: 64, height: 72 }}>
                        <img
                          src={player.kitSrc}
                          alt="kit"
                          style={{ 
                            width: 64, 
                            height: 72, 
                            marginBottom: 4, 
                            cursor: !substituteMode.active && player.id ? 'pointer' : 'default',
                          }}
                          onClick={() => {
                            if (!substituteMode.active && player.id && player.name) {
                              handleOpenCaptainModal(player.id, player.name, pick.position);
                            }
                          }}
                        />
                        {/* Substitute button - always show for non-transferred players when not in substitute mode, or when this is the selected player */}
                        {typeof currentGameweek === 'number' && gw >= currentGameweek && pick && !pick.gw_transfer && 
                          (!substituteMode.active || substituteMode.starterPosition === pick.position) && (
                          <button
                            className={styles['substitute-player-button']}
                            onClick={() => handleSubstitutePlayer(pick.position)}
                            type="button"
                            aria-label="Substitute player"
                            style={{
                              background: substituteMode.active && substituteMode.starterPosition === pick.position ? '#229ecfff' : '#f39c12',
                            }}
                          >
                            <HiOutlineArrowsUpDown color="#fff" size={10} />
                          </button>
                        )}
                        
                        {/* Remove button - only show when NOT in substitute mode */}
                        {typeof currentGameweek === 'number' && gw >= currentGameweek && pick && !pick.gw_transfer && !substituteMode.active && (
                          <button
                            className={styles['remove-player-button']}
                            onClick={() => handleSetGwTransfer(pick.position)}
                            type="button"
                            aria-label="Remove player"
                          >
                            <FaTimes color="#fff" size={12} />
                          </button>
                        )}
                        
                        {/* Restore button - only show when NOT in substitute mode */}
                        {typeof currentGameweek === 'number' && gw >= currentGameweek && pick && pick.gw_transfer && !substituteMode.active && (
                          <button
                            className={styles['restore-player-button']}
                            onClick={() => handleRestoreGwTransfer(pick.position)}
                            type="button"
                            aria-label="Restore player"
                          >
                            <FaUndo color="#222" size={12} />
                          </button>
                        )} 
                        {/* autosub icon */}
                        {player.autoSubStatus.showIcon && (
                          <img
                            src="/autosub.png"
                            alt="Auto Sub"
                            style={{
                              position: 'absolute',
                              top: 2,
                              right: 2,
                              width: 18,
                              height: 18,
                              zIndex: 2,
                            }}
                          />
                        )}
                      </div>
                    )}
                    <span className={styles['player-chip']}>
                      {player.name}
                      {player.isCaptain && <span className={styles['captain']}> (C)</span>}
                      {player.isViceCaptain && <span className={styles['vice-captain']}> (VC)</span>}
                    </span>
                    <span
                      className={styles['player-opponent']}
                      style={{
                        background: getOpponentBgColor(player.opponentStrength),
                        color: player.opponentStrength === 3 ? '#222' : '#fff',
                        borderRadius: '8px',
                        padding: '2px 8px',
                        marginTop: '2px',
                        marginBottom: '2px',
                        textAlign: 'center',
                        fontWeight: 500,
                        fontSize: '13px',
                        minWidth: '40px',
                        display: 'inline-block',
                      }}
                    >
                      {player.opponent}
                    </span>
                    <span
                      className={styles['player-expected-points']}
                      style={{
                        fontSize: '12px',
                        marginTop: '2px',
                        fontWeight: 600,
                        textAlign: 'center',
                        display: 'inline-block',
                      }}
                    >
                      {typeof player.expectedPoints === 'number'
                        ? `xP: ${player.expectedPoints.toFixed(1)}`
                        : ''}
                      {typeof player.expectedPoints === 'number' && typeof player.actualPoints === 'number' ? (
                        <span style={{ margin: '0 12px', color: '#888' }}>|</span>
                      ) : ''}
                      {typeof player.actualPoints === 'number'
                        ? (
                          <span
                            className={styles['player-actual-points']}
                            style={{
                              background: '#6f8aa5ff',
                              borderRadius: '6px',
                              padding: '2px 8px',
                              color: '#fff',
                            }}
                          >
                            {player.actualPoints}
                          </span>
                        )
                        : ''}
                    </span>
                  </div>
                );
              })}
            </div>
            {/* DEF Players */}
            <div className={styles['formation-row']}>
              {def.map((player: {
                id?: number | null;
                opponentStrength: number;
                kitSrc: string | undefined;
                autoSubStatus: { showIcon: any; };
                name: string | undefined;
                isCaptain: any;
                isViceCaptain: any;
                opponent: string | undefined;
                expectedPoints?: number | null;
                actualPoints?: number | null;
              }, idx: React.Key | null | undefined) => {
                // Find the original pick for this slot in starters
                const pick = starters.filter((p: any) => p.element_type === 2)[idx as number];
                return (
                  <div
                    key={idx}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      position: 'relative',
                    }}
                  >
                    {player.kitSrc && (
                      <div style={{ position: 'relative', width: 64, height: 72 }}>
                        <img
                          src={player.kitSrc}
                          alt="kit"
                          style={{ 
                            width: 64, 
                            height: 72, 
                            marginBottom: 4, 
                            cursor: !substituteMode.active && player.id ? 'pointer' : 'default',
                          }}
                          onClick={() => {
                            if (!substituteMode.active && player.id && player.name) {
                              handleOpenCaptainModal(player.id, player.name, pick.position);
                            }
                          }}
                        />
                        {/* Substitute button - always show for non-transferred players when not in substitute mode, or when this is the selected player */}
                        {typeof currentGameweek === 'number' && gw >= currentGameweek && pick && !pick.gw_transfer && 
                          (!substituteMode.active || substituteMode.starterPosition === pick.position) && (
                          <button
                            className={styles['substitute-player-button']}
                            onClick={() => handleSubstitutePlayer(pick.position)}
                            type="button"
                            aria-label="Substitute player"
                            style={{
                              background: substituteMode.active && substituteMode.starterPosition === pick.position ? '#229ecfff' : '#f39c12',
                            }}
                          >
                            <HiOutlineArrowsUpDown color="#fff" size={10} />
                          </button>
                        )}
                        
                        {/* Remove button - only show when NOT in substitute mode */}
                        {typeof currentGameweek === 'number' && gw >= currentGameweek && pick && !pick.gw_transfer && !substituteMode.active && (
                          <button
                            className={styles['remove-player-button']}
                            onClick={() => handleSetGwTransfer(pick.position)}
                            type="button"
                            aria-label="Remove player"
                          >
                            <FaTimes color="#fff" size={12} />
                          </button>
                        )}
                        
                        {/* Restore button - only show when NOT in substitute mode */}
                        {typeof currentGameweek === 'number' && gw >= currentGameweek && pick && pick.gw_transfer && !substituteMode.active && (
                          <button
                            className={styles['restore-player-button']}
                            onClick={() => handleRestoreGwTransfer(pick.position)}
                            type="button"
                            aria-label="Restore player"
                          >
                            <FaUndo color="#222" size={12} />
                          </button>
                        )} 
                        {/* Existing autosub icon */}
                        {player.autoSubStatus.showIcon && (
                          <img
                            src="/autosub.png"
                            alt="Auto Sub"
                            style={{
                              position: 'absolute',
                              top: 2,
                              right: 2,
                              width: 18,
                              height: 18,
                              zIndex: 2,
                            }}
                          />
                        )}
                      </div>
                    )}
                    <span className={styles['player-chip']}>
                      {player.name}
                      {player.isCaptain && <span className={styles['captain']}> (C)</span>}
                      {player.isViceCaptain && <span className={styles['vice-captain']}> (VC)</span>}
                    </span>
                    <span
                      className={styles['player-opponent']}
                      style={{
                        background: getOpponentBgColor(player.opponentStrength),
                        color: player.opponentStrength === 3 ? '#222' : '#fff',
                        borderRadius: '8px',
                        padding: '2px 8px',
                        marginTop: '2px',
                        marginBottom: '2px',
                        textAlign: 'center',
                        fontWeight: 500,
                        fontSize: '13px',
                        minWidth: '40px',
                        display: 'inline-block',
                      }}
                    >
                      {player.opponent}
                    </span>
                    <span
                      className={styles['player-expected-points']}
                      style={{
                        fontSize: '12px',
                        marginTop: '2px',
                        fontWeight: 600,
                        textAlign: 'center',
                        display: 'inline-block',
                      }}
                    >
                      {typeof player.expectedPoints === 'number'
                        ? `xP: ${player.expectedPoints.toFixed(1)}`
                        : ''}
                      {typeof player.expectedPoints === 'number' && typeof player.actualPoints === 'number' ? (
                        <span style={{ margin: '0 12px', color: '#888' }}>|</span>
                      ) : ''}
                      {typeof player.actualPoints === 'number'
                        ? (
                          <span
                            className={styles['player-actual-points']}
                            style={{
                              background: '#6f8aa5ff',
                              borderRadius: '6px',
                              padding: '2px 8px',
                              color: '#fff',
                            }}
                          >
                            {player.actualPoints}
                          </span>
                        )
                        : ''}
                    </span>
                  </div>
                );
              })}
            </div>
            {/* MID Players */}
            <div className={styles['formation-row']}>
              {mid.map((player: {
                id?: number | null;
                opponentStrength: number;
                kitSrc: string | undefined;
                autoSubStatus: { showIcon: any; };
                name: string | undefined;
                isCaptain: any;
                isViceCaptain: any;
                opponent: string | undefined;
                expectedPoints?: number | null;
                actualPoints?: number | null;
              }, idx: React.Key | null | undefined) => {
                // Find the original pick for this slot in starters
                const pick = starters.filter((p: any) => p.element_type === 3)[idx as number];
                return (
                  <div
                    key={idx}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      position: 'relative',
                    }}
                  >
                    {player.kitSrc && (
                      <div style={{ position: 'relative', width: 64, height: 72 }}>
                        <img
                          src={player.kitSrc}
                          alt="kit"
                          style={{ 
                            width: 64, 
                            height: 72, 
                            marginBottom: 4, 
                            cursor: !substituteMode.active && player.id ? 'pointer' : 'default',
                          }}
                          onClick={() => {
                            if (!substituteMode.active && player.id && player.name) {
                              handleOpenCaptainModal(player.id, player.name, pick.position);
                            }
                          }}
                        />
                        {/* Substitute button - always show for non-transferred players when not in substitute mode, or when this is the selected player */}
                        {typeof currentGameweek === 'number' && gw >= currentGameweek && pick && !pick.gw_transfer && 
                          (!substituteMode.active || substituteMode.starterPosition === pick.position) && (
                          <button
                            className={styles['substitute-player-button']}
                            onClick={() => handleSubstitutePlayer(pick.position)}
                            type="button"
                            aria-label="Substitute player"
                            style={{
                              background: substituteMode.active && substituteMode.starterPosition === pick.position ? '#229ecfff' : '#f39c12',
                            }}
                          >
                            <HiOutlineArrowsUpDown color="#fff" size={10} />
                          </button>
                        )}
                        
                        {/* Remove button - only show when NOT in substitute mode */}
                        {typeof currentGameweek === 'number' && gw >= currentGameweek && pick && !pick.gw_transfer && !substituteMode.active && (
                          <button
                            className={styles['remove-player-button']}
                            onClick={() => handleSetGwTransfer(pick.position)}
                            type="button"
                            aria-label="Remove player"
                          >
                            <FaTimes color="#fff" size={12} />
                          </button>
                        )}
                        
                        {/* Restore button - only show when NOT in substitute mode */}
                        {typeof currentGameweek === 'number' && gw >= currentGameweek && pick && pick.gw_transfer && !substituteMode.active && (
                          <button
                            className={styles['restore-player-button']}
                            onClick={() => handleRestoreGwTransfer(pick.position)}
                            type="button"
                            aria-label="Restore player"
                          >
                            <FaUndo color="#222" size={12} />
                          </button>
                        )} 
                        {/* Existing autosub icon */}
                        {player.autoSubStatus.showIcon && (
                          <img
                            src="/autosub.png"
                            alt="Auto Sub"
                            style={{
                              position: 'absolute',
                              top: 2,
                              right: 2,
                              width: 18,
                              height: 18,
                              zIndex: 2,
                            }}
                          />
                        )}
                      </div>
                    )}
                    <span className={styles['player-chip']}>
                      {player.name}
                      {player.isCaptain && <span className={styles['captain']}> (C)</span>}
                      {player.isViceCaptain && <span className={styles['vice-captain']}> (VC)</span>}
                    </span>
                    <span
                      className={styles['player-opponent']}
                      style={{
                        background: getOpponentBgColor(player.opponentStrength),
                        color: player.opponentStrength === 3 ? '#222' : '#fff',
                        borderRadius: '8px',
                        padding: '2px 8px',
                        marginTop: '2px',
                        marginBottom: '2px',
                        textAlign: 'center',
                        fontWeight: 500,
                        fontSize: '13px',
                        minWidth: '40px',
                        display: 'inline-block',
                      }}
                    >
                      {player.opponent}
                    </span>
                    <span
                      className={styles['player-expected-points']}
                      style={{
                        fontSize: '12px',
                        marginTop: '2px',
                        fontWeight: 600,
                        textAlign: 'center',
                        display: 'inline-block',
                      }}
                    >
                      {typeof player.expectedPoints === 'number'
                        ? `xP: ${player.expectedPoints.toFixed(1)}`
                        : ''}
                      {typeof player.expectedPoints === 'number' && typeof player.actualPoints === 'number' ? (
                        <span style={{ margin: '0 12px', color: '#888' }}>|</span>
                      ) : ''}
                      {typeof player.actualPoints === 'number'
                        ? (
                          <span
                            className={styles['player-actual-points']}
                            style={{
                              background: '#6f8aa5ff',
                              borderRadius: '6px',
                              padding: '2px 8px',
                              color: '#fff',
                            }}
                          >
                            {player.actualPoints}
                          </span>
                        )
                        : ''}
                    </span>
                  </div>
                );
              })}
            </div>
            {/* FWD Players */}
            <div className={styles['formation-row']}>
              {fwd.map((player: {
                id?: number | null;
                kitSrc: string | undefined;
                autoSubStatus: { showIcon: any; };
                name: string | undefined;
                isCaptain: any;
                isViceCaptain: any;
                opponentStrength: number;
                opponent: string | number | bigint | boolean | React.ReactElement<unknown, string | React.JSXElementConstructor<any>> | Iterable<React.ReactNode> | React.ReactPortal | Promise<string | number | bigint | boolean | React.ReactPortal | React.ReactElement<unknown, string | React.JSXElementConstructor<any>> | Iterable<React.ReactNode> | null | undefined> | null | undefined;
                expectedPoints: number;
                actualPoints: string | number | bigint | boolean | React.ReactElement<unknown, string | React.JSXElementConstructor<any>> | Iterable<React.ReactNode> | React.ReactPortal | Promise<string | number | bigint | boolean | React.ReactPortal | React.ReactElement<unknown, string | React.JSXElementConstructor<any>> | Iterable<React.ReactNode> | null | undefined> | null | undefined;
              }, idx: React.Key | null | undefined) => {
                // Find the original pick for this slot in starters
                const pick = starters.filter((p: any) => p.element_type === 4)[idx as number];
                return (
                  <div key={idx} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative' }}>
                    {/* ...position label if needed... */}
                    {player.kitSrc && (
                      <div style={{ position: 'relative', width: 64, height: 72 }}>
                        <img
                          src={player.kitSrc}
                          alt="kit"
                          style={{ 
                            width: 64, 
                            height: 72, 
                            marginBottom: 4, 
                            cursor: !substituteMode.active && player.id ? 'pointer' : 'default',
                          }}
                          onClick={() => {
                            if (!substituteMode.active && player.id && player.name) {
                              handleOpenCaptainModal(player.id, player.name, pick.position);
                            }
                          }}
                        />
                        {/* Substitute button - always show for non-transferred players when not in substitute mode, or when this is the selected player */}
                        {typeof currentGameweek === 'number' && gw >= currentGameweek && pick && !pick.gw_transfer && 
                          (!substituteMode.active || substituteMode.starterPosition === pick.position) && (
                          <button
                            className={styles['substitute-player-button']}
                            onClick={() => handleSubstitutePlayer(pick.position)}
                            type="button"
                            aria-label="Substitute player"
                            style={{
                              background: substituteMode.active && substituteMode.starterPosition === pick.position ? '#229ecfff' : '#f39c12',
                            }}
                          >
                            <HiOutlineArrowsUpDown color="#fff" size={10} />
                          </button>
                        )}
                        
                        {/* Remove button - only show when NOT in substitute mode */}
                        {typeof currentGameweek === 'number' && gw >= currentGameweek && pick && !pick.gw_transfer && !substituteMode.active && (
                          <button
                            className={styles['remove-player-button']}
                            onClick={() => handleSetGwTransfer(pick.position)}
                            type="button"
                            aria-label="Remove player"
                          >
                            <FaTimes color="#fff" size={12} />
                          </button>
                        )}
                        
                        {/* Restore button - only show when NOT in substitute mode */}
                        {typeof currentGameweek === 'number' && gw >= currentGameweek && pick && pick.gw_transfer && !substituteMode.active && (
                          <button
                            className={styles['restore-player-button']}
                            onClick={() => handleRestoreGwTransfer(pick.position)}
                            type="button"
                            aria-label="Restore player"
                          >
                            <FaUndo color="#222" size={12} />
                          </button>
                        )} 
                        {/* Existing autosub icon */}
                        {player.autoSubStatus.showIcon && (
                          <img
                            src="/autosub.png"
                            alt="Auto Sub"
                            style={{
                              position: 'absolute',
                              top: 2,
                              right: 2,
                              width: 18,
                              height: 18,
                              zIndex: 2,
                            }}
                          />
                        )}
                      </div>
                    )}
                    <span className={styles['player-chip']}>
                      {player.name}
                      {player.isCaptain && <span className={styles['captain']}> (C)</span>}
                      {player.isViceCaptain && <span className={styles['vice-captain']}> (VC)</span>}
                    </span>
                    <span
                      className={styles['player-opponent']}
                      style={{
                        background: getOpponentBgColor(player.opponentStrength),
                        color: player.opponentStrength === 3 ? '#222' : '#fff',
                        borderRadius: '8px',
                        padding: '2px 8px',
                        marginTop: '2px',
                        marginBottom: '2px',
                        textAlign: 'center',
                        fontWeight: 500,
                        fontSize: '12px',
                        minWidth: '40px',
                        display: 'inline-block',
                      }}
                    >
                      {player.opponent}
                    </span>
                    <span
                      className={styles['player-expected-points']}
                      style={{
                        fontSize: '12px',
                        marginTop: '2px',
                        fontWeight: 600,
                        textAlign: 'center',
                      }}
                    >
                      {typeof player.expectedPoints === 'number'
                        ? `xP: ${player.expectedPoints.toFixed(1)}`
                        : ''}
                      {typeof player.expectedPoints === 'number' && typeof player.actualPoints === 'number' ? (
                        <span style={{ margin: '0 12px', color: '#888' }}>|</span>
                      ) : ''}
                      {typeof player.actualPoints === 'number'
                        ? (
                          <span
                            className={styles['player-actual-points']}
                            style={{
                              background: '#777777ff',
                              borderRadius: '6px',
                              padding: '2px 8px',
                              color: '#fff',
                            }}
                          >
                            {player.actualPoints}
                          </span>
                        )
                        : ''}
                    </span>
                  </div>
                );
              })}
            </div>
            {/* Bench Players */}
            <div className={styles['bench-row']} style={{ position: 'relative' }}>
              {/* Add cancel substitute button if in substitute mode */}
              {substituteMode.active && (
                <button
                  onClick={handleCancelSubstitute}
                  style={{
                    position: 'absolute',
                    top: 0,
                    right: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: '#229ecfff',
                    color: 'white',
                    border: '1px solid #007bacff',
                    borderRadius: '4px',
                    padding: '2px 6px',
                    zIndex: 10,
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
              )}
              {benchPlayers.map((player: { positionType: string | number; kitSrc: string | undefined; autoSubStatus: { showIcon: any; }; name: string | number | bigint | boolean | React.ReactElement<unknown, string | React.JSXElementConstructor<any>> | Iterable<React.ReactNode> | React.ReactPortal | Promise<string | number | bigint | boolean | React.ReactPortal | React.ReactElement<unknown, string | React.JSXElementConstructor<any>> | Iterable<React.ReactNode> | null | undefined> | null | undefined; isCaptain: any; isViceCaptain: any; opponentStrength: number; opponent: string | number | bigint | boolean | React.ReactElement<unknown, string | React.JSXElementConstructor<any>> | Iterable<React.ReactNode> | React.ReactPortal | Promise<string | number | bigint | boolean | React.ReactPortal | React.ReactElement<unknown, string | React.JSXElementConstructor<any>> | Iterable<React.ReactNode> | null | undefined> | null | undefined; expectedPoints: number; actualPoints: string | number | bigint | boolean | React.ReactElement<unknown, string | React.JSXElementConstructor<any>> | Iterable<React.ReactNode> | React.ReactPortal | Promise<string | number | bigint | boolean | React.ReactPortal | React.ReactElement<unknown, string | React.JSXElementConstructor<any>> | Iterable<React.ReactNode> | null | undefined> | null | undefined; }, idx: React.Key | null | undefined) => {
                const pick = bench[idx as number];
                const isSelectableBench = substituteMode.active && !pick.gw_transfer &&
                  typeof substituteMode.starterPosition === 'number' &&
                  isValidBenchSubstitute(pick, substituteMode.starterPosition);

                return (
                  <div
                    key={idx}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      position: 'relative',
                      opacity: substituteMode.active ? (isSelectableBench ? 1 : 0.3) : 1,
                      cursor: isSelectableBench ? 'pointer' : 'default',
                      border: isSelectableBench ? '2px solid #f39c12' : 'none',
                      borderRadius: '8px',
                      padding: '4px',
                    }}
                    onClick={() => isSelectableBench && handleBenchSelection(pick.position)}
                  >
                    {/* Show position above kit */}
                    <span
                      style={{
                        fontSize: '14px',
                        marginBottom: '2px',
                        color: '#222',
                      }}
                    >
                      <strong>{benchPositionMap[player.positionType] || player.positionType}</strong>
                    </span>
                    {player.kitSrc && (
                      <div style={{ position: 'relative', width: 64, height: 72 }}>
                        <img
                          src={player.kitSrc}
                          alt="kit"
                          style={{ width: 64, height: 72, marginBottom: 4 }}
                        />
                        {/* Only show remove/restore buttons if NOT in substitute mode */}
                        {!substituteMode.active && typeof currentGameweek === 'number' && gw >= currentGameweek && !pick.gw_transfer && (
                          <button
                            className={styles['remove-player-button']}
                            onClick={() => handleSetGwTransfer(pick.position)}
                            type="button"
                            aria-label="Remove player"
                          >
                            <FaTimes color="#fff" size={12} />
                          </button>
                        )}
                        {!substituteMode.active && typeof currentGameweek === 'number' && gw >= currentGameweek && pick.gw_transfer && (
                          <button
                            className={styles['restore-player-button']}
                            onClick={() => handleRestoreGwTransfer(pick.position)}
                            type="button"
                            aria-label="Restore player"
                          >
                            <FaUndo color="#222" size={12} />
                          </button>
                        )}
                        {/* Existing autosub icon */}
                        {player.autoSubStatus.showIcon && (
                          <img
                            src="/autosub.png"
                            alt="Auto Sub"
                            style={{
                              position: 'absolute',
                              top: 2,
                              right: 2,
                              width: 18,
                              height: 18,
                              zIndex: 2,
                            }}
                          />
                        )}
                      </div>
                    )}
                    <span className={styles['player-chip']}>
                      {player.name}
                      {player.isCaptain && <span className={styles['captain']}> (C)</span>}
                      {player.isViceCaptain && <span className={styles['vice-captain']}> (VC)</span>}
                    </span>
                    <span
                      className={styles['player-opponent']}
                      style={{
                        background: getOpponentBgColor(player.opponentStrength),
                        color: player.opponentStrength === 3 ? '#222' : '#fff',
                        borderRadius: '8px',
                        padding: '2px 8px',
                        marginTop: '2px',
                        marginBottom: '2px',
                        textAlign: 'center',
                        fontWeight: 500,
                        fontSize: '12px',
                        minWidth: '40px',
                        display: 'inline-block',
                      }}
                    >
                      {player.opponent}
                    </span>
                    <span
                      className={styles['player-expected-points']}
                      style={{
                        fontSize: '12px',
                        marginTop: '2px',
                        fontWeight: 600,
                        textAlign: 'center',
                      }}
                    >
                      {typeof player.expectedPoints === 'number'
                        ? `xP: ${player.expectedPoints.toFixed(1)}`
                        : ''}
                      {typeof player.expectedPoints === 'number' && typeof player.actualPoints === 'number' ? (
                        <span style={{ margin: '0 12px', color: '#888' }}>|</span>
                      ) : ''}
                      {typeof player.actualPoints === 'number'
                        ? (
                          <span
                            className={styles['player-actual-points']}
                            style={{
                              background: '#777777ff',
                              borderRadius: '6px',
                              padding: '2px 8px',
                              color: '#fff',
                            }}
                          >
                            {player.actualPoints}
                          </span>
                        )
                        : ''}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
        <div className={styles['transfer-section-outer-container']}>
          <div className={styles['transfer-section']}>
            <div className={styles['team-formation-data-card-total-points']}>
              <span className={styles['team-formation-data-title']}>Overall Rank:</span>
              <span className={styles['team-formation-data-value']}>
                {typeof currentGameweek === 'number' && gw >= currentGameweek ? (
                  lastPastGwData && typeof lastPastGwData.overall_rank === 'number' ? lastPastGwData.overall_rank : 'N/A'
                ) : (
                  pickData.entry_history?.overall_rank
                )}
              </span>
            </div>
            <div className={styles['transfer-card']}>
              <span className={styles['transfer-label']}>Total Points</span>
              <span className={styles['transfer-value']}>
                {typeof currentGameweek === 'number' && gw >= currentGameweek ? (
                  lastPastGwData && typeof lastPastGwData.total_points === 'number' ? lastPastGwData.total_points : 'N/A'
                ) : (
                  pickData.entry_history?.total_points
                )}
              </span>
            </div>
          </div>
          {/* New containers below the data cards */}
          <div
            style={{
              background: '#14161a',
              borderRadius: '16px',
              padding: '18px',
              marginTop: '18px',
              marginBottom: '12px',
              width: '100%',
              maxHeight: '320px',
              color: '#fff',
            }}
          >
            <TeamSelectionFilters
              players={elements}
              teams={teams}
					    onFilteredPlayers={setFilteredPlayers}
              costRange={costRange}
              setCostRange={setCostRange}
              activeFilters={activeFilters}
              setActiveFilters={setActiveFilters}
            />
          </div>
          <div
            style={{
              background: '#14161a',
              borderRadius: '16px',
              padding: '18px',
              marginBottom: '12px',
              width: '100%',
              boxSizing: 'border-box',
              color: '#fff',
            }}
          >
            <TeamSelectionPlayerTable
              players={filteredPlayers}
              teams={teams}
              activeFilters={activeFilters}
              selectable={selectable}
              selectedPlayerId={selectedPlayerId}
              setSelectedPlayerId={handleSelectPlayer}
            />
          </div>
        </div>
      </div>
      {/* Captain Selection Modal */}
      {captainModal.open && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
          onClick={() => setCaptainModal({ open: false })}
        >
          <div
            style={{
              backgroundColor: '#2c3e50',
              borderRadius: '12px',
              padding: '24px',
              minWidth: '300px',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ color: '#fff', margin: '0 0 20px 0', textAlign: 'center' }}>
              {captainModal.playerName}
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <button
                onClick={handleSetCaptain}
                style={{
                  padding: '12px 20px',
                  backgroundColor: '#f39c12',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '16px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'background-color 0.2s',
                }}
                onMouseOver={(e) => ((e.target as HTMLButtonElement).style.backgroundColor = '#e67e22')}
                onMouseOut={(e) => ((e.target as HTMLButtonElement).style.backgroundColor = '#f39c12')}
              >
                Set Captain
              </button>
              <button
                onClick={handleSetViceCaptain}
                style={{
                  padding: '12px 20px',
                  backgroundColor: '#3498db',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '16px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'background-color 0.2s',
                }}
                onMouseOver={(e) => ((e.target as HTMLButtonElement).style.backgroundColor = '#2980b9')}
                onMouseOut={(e) => ((e.target as HTMLButtonElement).style.backgroundColor = '#3498db')}
              >
                Set Vice Captain
              </button>
              <button
                onClick={() => setCaptainModal({ open: false })}
                style={{
                  padding: '8px 16px',
                  backgroundColor: 'transparent',
                  color: '#bdc3c7',
                  border: '1px solid #7f8c8d',
                  borderRadius: '6px',
                  fontSize: '14px',
                  cursor: 'pointer',
                  marginTop: '8px',
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TeamSelection;
