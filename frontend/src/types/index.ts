export interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string | null;
  createdAt?: string;
}

export type EmailStatus = 'scheduled' | 'processing' | 'sent' | 'failed';

export interface Email {
  id: string;
  campaignId: string;
  userId: string;
  senderId?: string | null;
  recipient: string;
  subject: string;
  body: string;
  scheduledAt: string;
  sentAt?: string | null;
  status: EmailStatus;
  attempts: number;
  bullJobId?: string | null;
  messageId?: string | null;
  previewUrl?: string | null;
  errorMessage?: string | null;
  createdAt: string;
  updatedAt: string;
  sender?: {
    name: string;
    email: string;
  } | null;
  campaign?: {
    subject: string;
    delayBetweenEmails?: number;
  } | null;
}

export interface EmailCampaign {
  id: string;
  userId: string;
  senderId?: string | null;
  subject: string;
  body: string;
  startTime: string;
  delayBetweenEmails: number;
  hourlyLimit: number;
  totalEmails: number;
  createdAt: string;
  updatedAt: string;
}

export interface Sender {
  id: string;
  userId: string;
  name: string;
  email: string;
  etherealUser?: string | null;
  etherealPassword?: string | null;
  hourlyLimit: number;
  isDefault: boolean;
  active: boolean;
  createdAt: string;
}

export interface SlackStatus {
  connected: boolean;
  teamName?: string | null;
  teamId?: string | null;
}

export interface QueueStats {
  waiting: number;
  active: number;
  delayed: number;
  completed: number;
  failed: number;
  total: number;
  isPaused: boolean;
}

export interface DashboardStats {
  scheduledCount: number;
  sentCount: number;
  failedCount: number;
  campaignsCount: number;
  deliveryRate: string;
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface ScheduleCampaignRequest {
  subject: string;
  body: string;
  recipients: string[];
  startTime: string;
  delayBetweenEmails?: number;
  hourlyLimit?: number;
  senderId?: string;
}

export interface ScheduleCampaignResponse {
  campaignId: string;
  totalEmails: number;
  scheduledEmails: number;
  delayBetweenEmails: number;
  firstScheduledAt: string;
}
