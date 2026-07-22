import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

export function Callback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [error, setError] = useState('');

  useEffect(() => {
    const code = searchParams.get('code');
    if (!code) {
      setError('No authorization code received.');
      return;
    }

    fetch(`/api/auth/discord/callback?code=${code}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.error) {
          setError(data.error);
        } else if (data.sessionId) {
          localStorage.setItem('discord_session', data.sessionId);
          navigate('/', { replace: true });
        }
      })
      .catch((err) => setError(err.message));
  }, [searchParams, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#1a1a2e]">
      {error ? (
        <div className="text-center">
          <div className="text-red-400 text-lg mb-4">{error}</div>
          <button onClick={() => navigate('/')} className="text-blue-400 hover:underline">
            Return Home
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-gray-300">Logging in with Discord...</span>
        </div>
      )}
    </div>
  );
}
