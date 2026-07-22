import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface DiscordUser {
  id: string;
  username: string;
  avatar: string | null;
}

interface DiscordGuild {
  id: string;
  name: string;
  icon: string | null;
  owner: boolean;
}

interface AuthState {
  user: DiscordUser | null;
  guilds: DiscordGuild[];
  sessionId: string | null;
  loading: boolean;
  login: () => Promise<{ error?: string }>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
  oauthConfigured: boolean;
}

const AuthContext = createContext<AuthState>({
  user: null,
  guilds: [],
  sessionId: null,
  loading: true,
  login: async () => ({}),
  logout: async () => {},
  isAuthenticated: false,
  oauthConfigured: false,
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<DiscordUser | null>(null);
  const [guilds, setGuilds] = useState<DiscordGuild[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [oauthConfigured, setOauthConfigured] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem('discord_session');
    if (stored) {
      setSessionId(stored);
      fetchUser(stored);
    } else {
      setLoading(false);
    }
  }, []);

  const fetchUser = async (sid: string) => {
    try {
      const res = await fetch('/api/auth/me', {
        headers: { Authorization: `Bearer ${sid}` },
      });
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
        setGuilds(data.guilds || []);
      } else {
        localStorage.removeItem('discord_session');
        setSessionId(null);
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  };

  const login = async (): Promise<{ error?: string }> => {
    try {
      const res = await fetch('/api/auth/discord');
      const data = await res.json();
      if (data.error === 'NOT_CONFIGURED') {
        setOauthConfigured(false);
        return { error: data.message };
      }
      if (data.url) {
        setOauthConfigured(true);
        window.location.href = data.url;
        return {};
      }
      return { error: '无法获取登录链接' };
    } catch {
      return { error: '网络错误，请重试' };
    }
  };

  const logout = async () => {
    if (sessionId) {
      await fetch('/api/auth/logout', {
        method: 'POST',
        headers: { Authorization: `Bearer ${sessionId}` },
      });
    }
    localStorage.removeItem('discord_session');
    setUser(null);
    setGuilds([]);
    setSessionId(null);
  };

  return (
    <AuthContext.Provider
      value={{ user, guilds, sessionId, loading, login, logout, isAuthenticated: !!user, oauthConfigured }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
