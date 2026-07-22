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

export interface MemberJoinConfig {
  channelId: string;
  message: string;
}

export interface KeywordRule {
  pattern: string;
  reply: string;
}

export interface MessageCreateConfig {
  keywords: KeywordRule[];
}

export interface EventConfig {
  type: 'memberJoin' | 'messageCreate' | 'memberLeave';
  enabled: boolean;
  config: MemberJoinConfig | MessageCreateConfig | Record<string, never>;
}

export type BotStatus = 'offline' | 'online' | 'starting' | 'error';

export interface Bot {
  id: string;
  name: string;
  avatar?: string;
  token: string;
  status: BotStatus;
  clientId?: string;
  guildId?: string;
  commands: Command[];
  events: EventConfig[];
  createdAt: string;
  updatedAt: string;
}

export interface BotRow {
  id: string;
  name: string;
  avatar: string | null;
  token: string;
  status: BotStatus;
  client_id: string | null;
  guild_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface CommandRow {
  id: string;
  bot_id: string;
  name: string;
  description: string;
  options_json: string;
  reply_json: string;
}

export interface EventRow {
  id: string;
  bot_id: string;
  type: string;
  enabled: number;
  config_json: string;
}

export interface ScheduleRow {
  id: string;
  bot_id: string;
  command_name: string;
  cron_expression: string;
  channel_id: string;
  enabled: number;
  last_run: string | null;
  created_at: string;
  updated_at: string;
}
