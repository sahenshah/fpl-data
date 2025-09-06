import React, { useState } from 'react';
import './TeamPlanner.css';

const TeamPlanner: React.FC = () => {
  const [teamId, setTeamId] = useState('');
  const [submittedTeamId, setSubmittedTeamId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [teamData, setTeamData] = useState<any>(null);

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setSubmittedTeamId(teamId);
    setLoading(true);
    setError('');
    setTeamData(null);

    try {
      const cachedData = localStorage.getItem(`team_${teamId}_data`);
      if (cachedData) {
        const teamData = JSON.parse(cachedData);
        setTeamData(teamData);
      } else {
        const response = await fetch(`https://corsproxy.io/?https://fantasy.premierleague.com/api/entry/${teamId}/`); 
        if (!response.ok) throw new Error('Team not found');
        const data = await response.json();
        setTeamData(data);

        // Store JSON in browser as a temporary file (download)
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `team_${teamId}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        // Store data in localStorage
        localStorage.setItem(`team_${teamId}_data`, JSON.stringify(data));
      }
    } catch (err: any) {
      setError(err.message || 'Error fetching team data');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="team-planner-container">
      <form onSubmit={handleSubmit} className="team-planner-form">
        <label htmlFor="team-id-input" className="team-planner-label">
          Enter team ID
        </label>
        <input
          id="team-id-input"
          type="text"
          value={teamId}
          onChange={e => setTeamId(e.target.value)}
          placeholder="Team ID"
          className="team-planner-input"
        />
        <button
          type="submit"
          className="team-planner-button"
          disabled={loading}
        >
          {loading ? 'Loading...' : 'Set Team ID'}
        </button>
      </form>
      {error && <div className="team-planner-result" style={{ color: 'red' }}>{error}</div>}
      {teamData && (
        <div className="team-planner-result">
          Team ID set to: <strong>{submittedTeamId}</strong>
          <br />
          (Team data downloaded as JSON)
        </div>
      )}
    </div>
  );
};

export default TeamPlanner;