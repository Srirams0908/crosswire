import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { BACKEND_URL } from '../config';

export default function ParticipantJoin() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [joinCode, setJoinCode] = useState(searchParams.get('code') || '');
  const [name, setName] = useState('');
  const [teamInfo, setTeamInfo] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    if (joinCode.length === 4) {
      checkCode(joinCode);
    } else {
      setTeamInfo(null);
    }
  }, [joinCode]);

  const checkCode = async (code) => {
    setChecking(true);
    setError('');
    try {
      const res = await fetch(`${BACKEND_URL}/api/join/${code.toUpperCase()}`);
      const data = await res.json();
      if (!res.ok) {
        setError(data.error);
        setTeamInfo(null);
      } else if (data.isFull) {
        setError('This team is full. Please check your join code with your facilitator.');
        setTeamInfo(null);
      } else {
        setTeamInfo(data);
      }
    } catch {
      setError('Could not connect to server.');
    } finally {
      setChecking(false);
    }
  };

  const handleJoin = async (e) => {
    e.preventDefault();
    if (!name.trim() || !teamInfo) return;
    setLoading(true);

    localStorage.setItem('participantName', name.trim());
    localStorage.setItem('joinCode', joinCode.toUpperCase());
    localStorage.setItem('teamId', teamInfo.team.id);
    localStorage.setItem('sessionId', teamInfo.team.session_id);

    navigate('/game');
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-6 py-12">
      <div className="w-full max-w-md animate-fade-in">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-amber-500 mb-4">
            <span className="text-white font-bold text-xl">✕</span>
          </div>
          <div className="font-display text-3xl font-bold text-gray-900 mb-2">CrossWire</div>
          <p className="text-gray-500">Enter your team join code to get started.</p>
        </div>

        <div className="card">
          <form onSubmit={handleJoin} className="space-y-5">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Team Join Code
              </label>
              <input
                type="text"
                value={joinCode}
                onChange={e => setJoinCode(e.target.value.toUpperCase().slice(0, 4))}
                placeholder="e.g. BRA1"
                className="input-field text-2xl font-display font-bold tracking-widest text-center uppercase"
                autoComplete="off"
                autoFocus
              />
              {checking && (
                <p className="text-xs text-gray-400 mt-1.5 text-center">Checking code...</p>
              )}
              {error && (
                <p className="text-sm text-red-500 mt-1.5 text-center">{error}</p>
              )}
            </div>

            {teamInfo && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 animate-fade-in">
                <div className="flex items-center gap-3">
                  <span className="text-3xl">{teamInfo.countryData?.flag || '🏳'}</span>
                  <div>
                    <div className="font-semibold text-gray-900">{teamInfo.team.country} Team</div>
                    <div className="text-xs text-gray-500">
                      {teamInfo.members.length}/6 members joined
                      {teamInfo.spotsLeft > 0 && (
                        <span className="ml-1 text-emerald-600 font-medium">· {teamInfo.spotsLeft} spot{teamInfo.spotsLeft !== 1 ? 's' : ''} left</span>
                      )}
                      {teamInfo.members.length > 0 && (
                        <span className="ml-2">· {teamInfo.members.map(m => m.name).join(', ')}</span>
                      )}
                    </div>
                  </div>
                </div>
                <p className="text-xs text-gray-600 mt-2 italic">{teamInfo.countryData?.style}</p>
              </div>
            )}

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Your First Name
              </label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Enter your name"
                className="input-field"
                maxLength={40}
              />
            </div>

            <button
              type="submit"
              disabled={!teamInfo || !name.trim() || loading}
              className="btn-primary w-full text-base"
            >
              {loading ? 'Joining...' : 'Join Team →'}
            </button>
          </form>
        </div>

        <p className="text-center text-gray-400 text-sm mt-6">
          <button onClick={() => navigate('/')} className="hover:text-gray-600 transition-colors">
            ← Back to home
          </button>
        </p>
      </div>
    </div>
  );
}
