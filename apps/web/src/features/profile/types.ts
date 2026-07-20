export interface Profile {
  id: string;
  userId: string;
  firstName: string | null;
  lastName: string | null;
  avatarUrl: string | null;
  timezone: string;
  language: string;
  phone: string | null;
  notificationPreferences: { email?: boolean; push?: boolean; sms?: boolean; marketing?: boolean };
  createdAt: string;
  updatedAt: string;
}

export interface UserAccountSummary {
  id: string;
  email: string;
  status: string;
  emailVerifiedAt: string | null;
  createdAt: string;
  profile: Profile | null;
}

export interface UpdateProfileInput {
  firstName?: string;
  lastName?: string;
  avatarUrl?: string;
  timezone?: string;
  language?: string;
  phone?: string;
  notificationPreferences?: Record<string, boolean>;
}
