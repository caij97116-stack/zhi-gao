import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';
const api = axios.create({ baseURL: BASE_URL });

export interface Bot {
  id: string;
  name: string;
  avatar: string | null;
  status: 'offline' | 'online' | 'starting' | 'error';
  clientId: string | null;
  guildId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CommandOption {
  name: string;
  description: string;
  type: 'STRING' | 'INTEGER' | 'BOOLEAN' | 'USER' | 'CHANNEL' | 'ROLE';
  required: boolean;
}

export interface EmbedField {
  name: string;
  value: string;
  inline: boolean;
}

export interface EmbedConfig {
  title?: string;
  description?: string;
  color?: string;
  thumbnail?: string;
  image?: string;
  footer?: string;
  fields?: EmbedField[];
}

export interface ReplyConfig {
  type: 'text' | 'embed';
  content?: string;
  embeds?: EmbedConfig[];
}

export interface Command {
  id: string;
  name: string;
  description: string;
  options: CommandOption[];
  reply: ReplyConfig;
}

export interface EventConfig {
  type: 'memberJoin' | 'messageCreate' | 'memberLeave';
  enabled: boolean;
  config: Record<string, unknown>;
}

export interface BotDetail extends Bot {
  commands: Command[];
  events: EventConfig[];
}

export interface SearchResult {
  source: 'github' | 'npm' | 'mcp';
  name: string;
  description: string;
  url: string;
  stars?: number;
  language?: string;
  license?: string;
  installCommand?: string;
}

export interface GuildInfo {
  id: string;
  name: string;
  icon: string | null;
  description: string | null;
  ownerId: string;
  memberCount: number;
  approximatePresenceCount: number;
  boostCount: number;
  boostTier: number;
  boostTierName: string;
  verificationLevelName: string;
  nsfwLevelName: string;
  preferredLocale: string;
  vanityUrlCode: string | null;
  features: string[];
  emojiCount: number;
  stickerCount: number;
  createdAt: string;
  members: GuildMember[];
  channels: GuildChannel[];
  roles: GuildRole[];
}

export interface GuildRole {
  id: string;
  name: string;
  color: string;
  position: number;
  memberCount: number;
  hoist: boolean;
  managed: boolean;
  permissions: string;
}

export interface GuildMember {
  id: string;
  username: string;
  displayName: string;
  avatar: string | null;
  joinedAt: string | null;
  roles: { id: string; name: string; color: string }[];
}

export interface GuildChannel {
  id: string;
  name: string;
  type: number;
}

export interface GuildRole {
  id: string;
  name: string;
  color: string;
  position: number;
  memberCount: number;
  hoist: boolean;
  managed: boolean;
}

export const botsApi = {
  list: () => api.get<Bot[]>('/bots').then((r) => r.data),
  create: (data: { name: string; token: string; avatar?: string; templateId?: string }) =>
    api.post<Bot>(`/bots`, data).then((r) => r.data),
  get: (id: string) => api.get<BotDetail>(`/bots/${id}`).then((r) => r.data),
  update: (id: string, data: { name?: string; avatar?: string }) =>
    api.put<Bot>(`/bots/${id}`, data).then((r) => r.data),
  delete: (id: string) => api.delete(`/bots/${id}`).then((r) => r.data),
  start: (id: string) => api.post(`/bots/${id}/start`).then((r) => r.data),
  stop: (id: string) => api.post(`/bots/${id}/stop`).then((r) => r.data),
  restart: (id: string) => api.post(`/bots/${id}/restart`).then((r) => r.data),
};

export const commandsApi = {
  list: (botId: string) => api.get<Command[]>(`/bots/${botId}/commands`).then((r) => r.data),
  create: (botId: string, data: Partial<Command>) =>
    api.post<Command>(`/bots/${botId}/commands`, data).then((r) => r.data),
  update: (botId: string, cmdId: string, data: Partial<Command>) =>
    api.put<Command>(`/bots/${botId}/commands/${cmdId}`, data).then((r) => r.data),
  delete: (botId: string, cmdId: string) =>
    api.delete(`/bots/${botId}/commands/${cmdId}`).then((r) => r.data),
};

export const eventsApi = {
  list: (botId: string) => api.get<EventConfig[]>(`/bots/${botId}/events`).then((r) => r.data),
  save: (botId: string, events: EventConfig[]) =>
    api.put(`/bots/${botId}/events`, { events }).then((r) => r.data),
};

export const searchApi = {
  search: (q: string, source?: string, lang?: string) =>
    api.get<{ results: SearchResult[] }>('/search', { params: { q, source, lang } }).then((r) => r.data),
};

export const serverApi = {
  info: (botId: string) =>
    api.get<{ guilds: GuildInfo[] }>(`/server/${botId}/info`).then((r) => r.data),
};

export interface AppInfo {
  clientId: string;
  name: string;
  description: string;
  icon: string | null;
  botPublic: boolean;
  botRequireCodeGrant: boolean;
  flags: number;
  intents: {
    presence: boolean;
    serverMembers: boolean;
    messageContent: boolean;
    guildMessages: boolean;
    guildMessageReactions: boolean;
  };
  owner: string;
  approximateGuildCount: number;
}

export const botControlApi = {
  info: (botId: string) => api.get<AppInfo>(`/bots/${botId}/info`).then((r) => r.data),
  updateProfile: (botId: string, data: { username?: string; avatar?: string }) =>
    api.put(`/bots/${botId}/profile`, data).then((r) => r.data),
  updatePresence: (botId: string, data: { status?: string; type?: string; name?: string; url?: string }) =>
    api.put(`/bots/${botId}/presence`, data).then((r) => r.data),
  getPermissions: (botId: string) => api.get<{ permissions: string }>(`/bots/${botId}/permissions`).then((r) => r.data),
  savePermissions: (botId: string, permissions: string) =>
    api.put(`/bots/${botId}/permissions`, { permissions }).then((r) => r.data),
};

export interface Template {
  id: string;
  name: string;
  description: string;
  icon: string;
  commandCount: number;
  eventCount: number;
}

export const templatesApi = {
  list: () => api.get<Template[]>('/templates').then((r) => r.data),
  get: (id: string) => api.get('/templates/' + id).then((r) => r.data),
};

export interface Schedule {
  id: string;
  botId: string;
  commandName: string;
  cronExpression: string;
  channelId: string;
  enabled: boolean;
  lastRun: string | null;
  createdAt: string;
  updatedAt: string;
}

export const schedulesApi = {
  list: (botId: string) => api.get<Schedule[]>(`/bots/${botId}/schedules`).then((r) => r.data),
  create: (botId: string, data: { commandName: string; cronExpression: string; channelId: string }) =>
    api.post<Schedule>(`/bots/${botId}/schedules`, data).then((r) => r.data),
  update: (botId: string, id: string, data: { enabled?: boolean; cronExpression?: string }) =>
    api.put<Schedule>(`/bots/${botId}/schedules/${id}`, data).then((r) => r.data),
  delete: (botId: string, id: string) =>
    api.delete(`/bots/${botId}/schedules/${id}`).then((r) => r.data),
};
