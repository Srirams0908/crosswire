import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BACKEND_URL } from '../config';

export default function ObserverJoin() {
  const navigate = useNavigate();
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleJoin = async (e) => {
    e.preventDefault();
    if (code.length < 4) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${BACKEND_URL}/api/observe/${code.toUpperCase()}`);
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Session not found');
        return;
      }
      localStorage.setItem('observerCode', code.toUpperCase());
      localStorage.setItem('observerSessionId', data.session.id);
      navigate('/observer/view');
    } catch {
      setError('Could not connect to server.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-6 py-12">
      <div className="w-full max-w-md animate-fade-in">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-gray-100 border border-gray-200 mb-4">
            <span className="text-xl">👁</span>
          </div>
          <div className="font-display text-3xl font-bold text-gray-900 mb-2">Observer Mode</div>
          <p className="text-gray-500 text-sm">
            Read-only live view of all team workspaces.<br />Enter the 6-character session code.
          </p>
        </div>

        <div className="card">
          <form onSubmit={handleJoin} className="space-y-5">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Session Code
              </label>
              <input
                type="text"
                value={code}
                onChange={e => { setCode(e.target.value.toUpperCase().slice(0, 6)); setError(''); }}
                placeholder="e.g. SNYDMR"
                className="input-field text-2xl font-display font-bold tracking-widest text-center uppercase"
                autoComplete="off"
                autoFocus
                maxLength={6}
              />
              <p className="text-xs text-gray-400 mt-1.5 text-center">
                Get this from your session facilitator
              </p>
              {error && <p className="text-sm text-red-500 mt-2 text-center">{error}</p>}
            </div>

            <button
              type="submit"
              disabled={code.length < 4 || loading}
              className="btn-ghost w-full text-base"
            >
              {loading ? 'Connecting...' : 'Enter as Observer →'}
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
