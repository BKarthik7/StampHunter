// ─── Enums ───────────────────────────────────────────────────────

export type Visibility = 'private' | 'public';
export type NotificationType = 'like' | 'comment' | 'follow' | 'mention';

// ─── Core Entities ───────────────────────────────────────────────

export interface User {
  id: string;
  clerkId: string;
  username: string;
  email: string;
  displayName: string | null;
  bio: string | null;
  avatarUrl: string | null;
  isVerified: boolean;
  createdAt: string; // ISO date string
  updatedAt: string;
  // Computed fields (not stored)
  followerCount?: number;
  followingCount?: number;
  stampCount?: number;
  isFollowing?: boolean; // relative to requesting user
}

export interface Stamp {
  id: string;
  userId: string;
  imageUrl: string;
  framedUrl: string | null;
  caption: string | null;
  visibility: Visibility;
  lat: number | null;
  lng: number | null;
  locationName: string | null;
  takenAt: string; // ISO date string
  createdAt: string;
  updatedAt: string;
  // Joined fields
  tags: string[];
  user?: Pick<User, 'id' | 'username' | 'displayName' | 'avatarUrl'>;
  likeCount?: number;
  commentCount?: number;
  isLiked?: boolean; // relative to requesting user
  albumIds?: string[];
}

export interface Album {
  id: string;
  userId: string;
  name: string;
  coverStampId: string | null;
  createdAt: string;
  // Computed
  stampCount?: number;
  coverStamp?: Pick<Stamp, 'id' | 'imageUrl' | 'framedUrl'>;
}

export interface Comment {
  id: string;
  stampId: string;
  userId: string;
  body: string;
  createdAt: string;
  updatedAt: string;
  user?: Pick<User, 'id' | 'username' | 'avatarUrl'>;
}

export interface Notification {
  id: string;
  recipientId: string;
  actorId: string;
  type: NotificationType;
  stampId: string | null;
  read: boolean;
  createdAt: string;
  actor?: Pick<User, 'id' | 'username' | 'avatarUrl'>;
  stamp?: Pick<Stamp, 'id' | 'imageUrl' | 'framedUrl'>;
}

// ─── API Request Types ────────────────────────────────────────────

export interface CreateStampRequest {
  caption?: string;
  visibility: Visibility;
  lat?: number;
  lng?: number;
  tags?: string[];
  albumIds?: string[];
  takenAt?: string;
}

export interface UpdateStampRequest {
  caption?: string;
  visibility?: Visibility;
  tags?: string[];
  albumIds?: string[];
}

export interface CreateAlbumRequest {
  name: string;
  coverStampId?: string;
}

export interface UpdateAlbumRequest {
  name?: string;
  coverStampId?: string;
}

export interface CreateCommentRequest {
  body: string;
}

export interface SyncUserRequest {
  clerkId: string;
  email: string;
  username: string;
  displayName?: string;
  avatarUrl?: string;
}

// ─── API Response Types ───────────────────────────────────────────

export interface ApiError {
  error: {
    code: string;
    message: string;
    field?: string; // for validation errors
  };
}

export interface PaginatedResponse<T> {
  data: T[];
  nextCursor: string | null;
  total?: number;
}

// ─── Feed / Query Types ───────────────────────────────────────────

export interface StampFilters {
  tag?: string;
  albumId?: string;
  visibility?: Visibility;
  dateFrom?: string;
  dateTo?: string;
  locationName?: string;
}

export interface FeedFilters {
  tag?: string;
  locationName?: string;
  cursor?: string;
  limit?: number;
}
