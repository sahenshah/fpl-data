import React, { useEffect, useState } from 'react';
import { getDashboard, getPlayerHistory } from '../api/fplApi';
import { getCurrentGameweek } from '../App';
import styles from './TeamPitchDashboard.module.css';

interface TeamPitchDashboardProps {
  teamId: string;
}

interface Pick {
  element: number;
  position: number;
  is_captain: boolean;
  is_vice_captain: boolean;
  multiplier: number;
}

interface PitchPlayer {
  id: number;
  webName: string;
  elementType: number;
  teamShortName: string;
  xPoints: number;
  actualPoints: number;
  isCaptain: boolean;
  isViceCaptain: boolean;
}

const positionLabels: Record<number, string> = { 1: 'GK', 2: 'DEF', 3: 'MID', 4: 'FWD' };

function PlayerMarker({ player }: { player: PitchPlayer }) {
  return (
    <div className={styles.playerMarker}>
      <div className={styles.jersey}>
        <img
          src={`/team-kits/${player.teamShortName}.png`}
          alt={`${player.teamShortName} kit`}
          className={styles.kitImage}
          onError={(e) => {
            e.currentTarget.style.display = 'none';
          }}
        />
        {player.isCaptain && <span className={styles.captainBadge}>C</span>}
        {player.isViceCaptain && <span className={styles.captainBadge}>V</span>}
      </div>
      <div className={styles.playerName}>{player.webName}</div>
      <div className={styles.playerPoints}>
        <span>{player.actualPoints} pts</span>
        <span className={styles.xPointsLabel}>xP: {player.xPoints.toFixed(1)}</span>
      </div>
    </div>
  );
}

const TeamPitchDashboard: React.FC<TeamPitchDashboardProps> = ({ teamId }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentGw, setCurrentGw] = useState<number | null>(null);
  const [selectedGw, setSelectedGw] = useState<number | null>(null);
  const [startingXI, setStartingXI] = useState<PitchPlayer[]>([]);
  const [bench, setBench] = useState<PitchPlayer[]>([]);

  // Resolve the current gameweek once, and default the view to it.
  useEffect(() => {
    let cancelled = false;
    getCurrentGameweek().then((gw) => {
      if (!cancelled && gw) {
        setCurrentGw(gw);
        setSelectedGw((prev) => prev ?? gw);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (selectedGw === null) return;
    let cancelled = false;

    (async () => {
      setLoading(true);
      setError(null);
      try {
        const dashboard = await getDashboard();

        const picksRaw = localStorage.getItem(`team_${teamId}_picks_data`);
        if (!picksRaw) throw new Error('No saved picks for this team — load a team first');
        const picksArray: Array<{ gw: number; picks: { picks: Pick[] } }> = JSON.parse(picksRaw);
        const gwEntry = picksArray.find((entry) => entry.gw === selectedGw);
        if (!gwEntry?.picks?.picks) throw new Error(`No picks found for gameweek ${selectedGw}`);

        const elementsById = new Map(dashboard.bootstrap.elements.map((el: any) => [el.id, el]));
        const teamsById = new Map(dashboard.bootstrap.teams.map((team: any) => [team.id, team]));

        // The live endpoint only ever covers the current gameweek — for a
        // past gameweek, fall back to each player's own history record.
        const isCurrentGw = selectedGw === currentGw;
        const actualPointsById = new Map<number, number>();
        if (isCurrentGw) {
          for (const live of dashboard.live?.elements ?? []) {
            actualPointsById.set(live.id, Number(live.stats?.total_points ?? 0));
          }
        } else {
          const results = await Promise.all(
            gwEntry.picks.picks.map(async (pick) => {
              try {
                const { history } = await getPlayerHistory(pick.element);
                const row = history.find((entry) => entry.round === selectedGw);
                return [pick.element, Number(row?.total_points ?? 0)] as const;
              } catch {
                return [pick.element, 0] as const;
              }
            })
          );
          for (const [playerId, points] of results) actualPointsById.set(playerId, points);
        }

        if (cancelled) return;

        const toPitchPlayer = (pick: Pick): PitchPlayer | null => {
          const element = elementsById.get(pick.element);
          if (!element) return null;
          const team = teamsById.get(element.team);
          const multiplier = pick.multiplier || 1;
          const rawXPoints = Number(element[`pp_gw_${selectedGw}`] ?? 0);
          const rawActualPoints = actualPointsById.get(pick.element) ?? 0;
          return {
            id: element.id,
            webName: element.web_name,
            elementType: element.element_type,
            teamShortName: team ? team.short_name : '???',
            xPoints: rawXPoints * multiplier,
            actualPoints: rawActualPoints * multiplier,
            isCaptain: pick.is_captain,
            isViceCaptain: pick.is_vice_captain,
          };
        };

        const sortedPicks = [...gwEntry.picks.picks].sort((a, b) => a.position - b.position);
        const starters = sortedPicks.filter((pick) => pick.position <= 11).map(toPitchPlayer).filter((p): p is PitchPlayer => p !== null);
        const benchPlayers = sortedPicks.filter((pick) => pick.position > 11).map(toPitchPlayer).filter((p): p is PitchPlayer => p !== null);

        if (!cancelled) {
          setStartingXI(starters);
          setBench(benchPlayers);
        }
      } catch (err: any) {
        if (!cancelled) setError(err.message ?? 'Failed to load team');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [teamId, selectedGw, currentGw]);

  const canGoPrev = selectedGw !== null && selectedGw > 1;
  const canGoNext = selectedGw !== null && currentGw !== null && selectedGw < currentGw;

  const rows = [1, 2, 3, 4].map((elementType) => startingXI.filter((p) => p.elementType === elementType));
  const totalXPoints = startingXI.reduce((sum, p) => sum + p.xPoints, 0);
  const totalActualPoints = startingXI.reduce((sum, p) => sum + p.actualPoints, 0);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.gwNav}>
          <button
            type="button"
            className={styles.navButton}
            onClick={() => setSelectedGw((gw) => (gw && gw > 1 ? gw - 1 : gw))}
            disabled={!canGoPrev}
            aria-label="Previous gameweek"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M15 5l-7 7 7 7" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <span className={styles.gwLabel}>Gameweek {selectedGw ?? '-'}</span>
          <button
            type="button"
            className={styles.navButton}
            onClick={() => setSelectedGw((gw) => (gw && currentGw && gw < currentGw ? gw + 1 : gw))}
            disabled={!canGoNext}
            aria-label="Next gameweek"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M9 5l7 7-7 7" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
        <span className={styles.totalPoints}>
          {totalActualPoints} pts (xPts: {totalXPoints.toFixed(1)})
        </span>
      </div>
      {loading && <div className={styles.status}>Loading team…</div>}
      {error && <div className={styles.status}>{error}</div>}
      {!loading && !error && (
        <>
          <div className={styles.pitch}>
            {rows.map((row, idx) =>
              row.length > 0 ? (
                <div key={positionLabels[idx + 1]} className={styles.pitchRow}>
                  {row.map((player) => (
                    <PlayerMarker key={player.id} player={player} />
                  ))}
                </div>
              ) : null
            )}
          </div>
          <div className={styles.benchSection}>
            <div className={styles.benchLabel}>Bench</div>
            <div className={styles.benchRow}>
              {bench.map((player) => (
                <PlayerMarker key={player.id} player={player} />
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default TeamPitchDashboard;
