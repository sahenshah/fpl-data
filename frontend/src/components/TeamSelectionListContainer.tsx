import React, { useEffect, useState } from 'react';
import './TeamSelectionListContainer.css';
import { getDashboard } from '../api/fplApi';
interface SelectionListContainerProps {
  teamId: string;
}

interface Pick {
  element: number;
  position: number;
  multiplier: number;
  is_captain: boolean;
  is_vice_captain: boolean;
  element_type: number;
}

interface GameweekPicks {
  gw: number;
  picks: {
    picks: Pick[];
    [key: string]: any;
  };
}

interface Player {
  id: number;
  web_name: string;
  [key: string]: any;
}

const SelectionListContainer: React.FC<SelectionListContainerProps> = ({ teamId }) => {
  const [elements, setElements] = useState<Player[]>([]);
  const [gwPicks, setGwPicks] = useState<GameweekPicks[]>([]);
  const [currentGwIndex, setCurrentGwIndex] = useState<number>(0);

  // Load players from the cached dashboard payload.
  useEffect(() => {
    getDashboard().then(data => setElements(data.bootstrap.elements));
  }, []);

  // Load all gameweek picks from localStorage
  useEffect(() => {
    const data = localStorage.getItem(`team_${teamId}_picks_data`);
    if (data) {
      try {
        const parsed = JSON.parse(data);
        if (Array.isArray(parsed)) {
          setGwPicks(parsed);
          setCurrentGwIndex(parsed.length - 1); // default to latest GW
        } else {
          setGwPicks([]);
        }
      } catch (e) {
        setGwPicks([]);
      }
    } else {
      setGwPicks([]);
    }
  }, [teamId]);

  // Navigation handlers
  const handlePrev = () => setCurrentGwIndex(idx => Math.max(0, idx - 1));
  const handleNext = () => setCurrentGwIndex(idx => Math.min(gwPicks.length - 1, idx + 1));

  // Get picks for current gameweek
  const currentGw = gwPicks[currentGwIndex];
  const picks = currentGw?.picks?.picks || [];

  // Map pick.element to player name
  const getPlayerName = (elementId: number) => {
    const player = elements.find(p => p.id === elementId);
    return player ? player.web_name : `Player ${elementId}`;
  };

  return (
    <div>
      <h3>
        Team {teamId} Players - Gameweek {currentGw ? currentGw.gw : '-'}
      </h3>
      <div>
        <button onClick={handlePrev} disabled={currentGwIndex <= 0}>Previous</button>
        <button onClick={handleNext} disabled={currentGwIndex >= gwPicks.length - 1}>Next</button>
      </div>
      <table>
        <thead>
          <tr>
            <th>Position</th>
            <th>Player</th>
            <th>Captain</th>
            <th>Vice Captain</th>
          </tr>
        </thead>
        <tbody>
          {picks.length > 0 ? (
            picks.map((pick) => (
              <tr key={pick.position}>
                <td>{pick.position}</td>
                <td>{getPlayerName(pick.element)}</td>
                <td>{pick.is_captain ? '✔️' : ''}</td>
                <td>{pick.is_vice_captain ? '✔️' : ''}</td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={4}>No players found for this gameweek.</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

export default SelectionListContainer;