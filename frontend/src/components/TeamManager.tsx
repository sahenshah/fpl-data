import React, { useState, useEffect } from 'react';
import styles from './TeamManager.module.css';
import TeamSummary from './TeamSummary';
import TeamHistory from './TeamHistory';
// import TeamSelection from './TeamSelection';
import TeamManagerHistory from './TeamManagerHistory';
import GWDashboard from './GWDashboard';
import { getCurrentGameweek } from '../App';

function validTeamCached(teamId: string) {
  if (!teamId) return false;
  const teamData = localStorage.getItem(`team_${teamId}_data`);
  const teamHistory = localStorage.getItem(`team_${teamId}_history_data`);
  const teamPicks = localStorage.getItem(`team_${teamId}_picks_data`);
  try {
    const parsedData = teamData && JSON.parse(teamData);
    const parsedHistory = teamHistory && JSON.parse(teamHistory);
    const parsedPicks = teamPicks && JSON.parse(teamPicks);
    return !!(parsedData && parsedHistory && parsedPicks);
  } catch {
    return false;
  }
}

const corsProxies = [
  'https://corsproxy.io/?',
  'https://cors-anywhere.herokuapp.com/',
  'https://api.allorigins.win/raw?url=',
  'https://thingproxy.freeboard.io/fetch/',
];

const fetchWithFallback = async (url: string) => {
  for (const proxy of corsProxies) {
    try {
      const proxyUrl = proxy + encodeURIComponent(url);
      const response = await fetch(proxyUrl);
      if (response.ok) {
        return response;
      }
    } catch (error) {
      console.warn(`Failed with proxy ${proxy}:`, error);
    }
  }
  throw new Error('All CORS proxies failed');
};

const fetchAllPicksWithFallback = async (teamId: string) => {
  const picksArray = [];
  const currGw = await getCurrentGameweek();
  let lastFetchedPicks = null;

  if (typeof currGw === 'number' && currGw > 0) {
    for (let gw = 1; gw < currGw; gw++) {
      try {
        const response = await fetchWithFallback(
          `https://fantasy.premierleague.com/api/entry/${teamId}/event/${gw}/picks/`
        );
        const data = await response.json();
        picksArray.push({ gw, picks: data });
        lastFetchedPicks = data;
      } catch {
        picksArray.push({ gw, picks: null });
      }
    }
    // For current gameweeks, only copy the picks array (not the full object) from the last GW
    if (lastFetchedPicks && lastFetchedPicks.picks) {
      picksArray.push({ gw: currGw, picks: { picks: lastFetchedPicks.picks } });
    } else {
      picksArray.push({ gw: currGw, picks: null });
    }
  }
  return picksArray;
};

const TeamManager: React.FC = () => {
  // On mount, check for any valid cached team
  const [teamId, setTeamId] = useState('');
  const [submittedTeamId, setSubmittedTeamId] = useState('');
  const [isValidTeam, setIsValidTeam] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Check all keys in localStorage for valid team cache
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      const match = key?.match(/^team_(\d+)_data$/);
      if (match) {
        const cachedTeamId = match[1];
        if (validTeamCached(cachedTeamId)) {
          setSubmittedTeamId(cachedTeamId);
          setIsValidTeam(true);
          return;
        }
      }
    }
    setIsValidTeam(false);
  }, []);

  useEffect(() => {
    if (submittedTeamId && validTeamCached(submittedTeamId)) {
      setIsValidTeam(true);
    } else {
      setIsValidTeam(false);
    }
  }, [submittedTeamId]);

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setSubmittedTeamId(teamId);
    setLoading(true);

    try {
      // Fetch summary
      const response = await fetchWithFallback(`https://fantasy.premierleague.com/api/entry/${teamId}/`);
      const data = await response.json();
      localStorage.setItem(`team_${teamId}_data`, JSON.stringify(data));

      // Fetch history
      const historyResponse = await fetchWithFallback(`https://fantasy.premierleague.com/api/entry/${teamId}/history/`);
      const historyData = await historyResponse.json();
      localStorage.setItem(`team_${teamId}_history_data`, JSON.stringify(historyData));

      // Fetch picks for GW 1-38
      const picksArray = await fetchAllPicksWithFallback(teamId);
      localStorage.setItem(`team_${teamId}_picks_data`, JSON.stringify(picksArray));

      setIsValidTeam(true);
    } catch (err) {
      console.error('Failed to fetch team data:', err);
      setSubmittedTeamId('');
      setIsValidTeam(false);
    } finally {
      setLoading(false);
    }
  };

  const handleChangeTeam = () => {
    localStorage.removeItem(`team_${submittedTeamId}_data`);
    localStorage.removeItem(`team_${submittedTeamId}_history_data`);
    localStorage.removeItem(`team_${submittedTeamId}_picks_data`);
    setTeamId('');
    setSubmittedTeamId('');
    setIsValidTeam(false);
  };

  return (
    <div className={styles['team-planner-container']}>
      <div className={styles['gw-dashboard-container']}>
        <GWDashboard />
      </div>
      {!isValidTeam ? (
        <form onSubmit={handleSubmit} className={styles['team-planner-form']}>
          <label htmlFor="team-id-input" className={styles['team-planner-label']}>
            Enter team ID
          </label>
          <input
            id="team-id-input"
            type="text"
            value={teamId}
            onChange={e => setTeamId(e.target.value)}
            placeholder="Team ID"
            className={styles['team-planner-input']}
          />
          <button
            type="submit"
            className={styles['team-planner-button']}
            disabled={loading}
          >
            {loading ? 'Loading...' : 'Set Team ID'}
          </button>
        </form>
      ) : (
        <>
          <button
            className={styles['team-planner-button']}
            style={{ marginBottom: 16 }}
            onClick={handleChangeTeam}
          >
            Change Team
          </button>
          <div className={styles['team-summary-container']}>
            <TeamSummary teamId={submittedTeamId} />
          </div>
          
          {/* <h2>Team GW History Component</h2> */}
          {/* <div className={styles['team-selection-container']}>
            <TeamSelection teamId={submittedTeamId} />
          </div> */}
          <div className={styles['team-manager-header']}>Season History</div>
          <div className={styles['team-history-container']}>
            <TeamHistory teamId={submittedTeamId} />
          </div>
          <div className={styles['team-manager-header']}>Manager Past Seasons History</div>
          <div className={styles['team-manager-container']}>
            <TeamManagerHistory teamId={submittedTeamId} />
          </div>
        </>
      )}
    </div>
  );
};

export default TeamManager;