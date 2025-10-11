// User types
export interface User {
  id: string;
  discordId: string;
  username: string;
  email?: string;
  avatar?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Marketplace types
export interface MarketplaceItem {
  id: string;
  name: string;
  description?: string;
  price: number;
  category: string;
  imageUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

// API Response types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// Map related types
export interface MapLocation {
  id: string;
  name: string;
  coordinates: [number, number];
  type: 'npc' | 'location' | 'entity';
  description?: string;
}

export interface WorldEntity {
  id: string;
  name: string;
  type: string;
  position: [number, number];
  properties?: Record<string, any>;
}

// Authentication types
export interface AuthUser {
  id: string;
  username: string;
  email?: string;
  avatar?: string;
}

export interface LoginResponse extends ApiResponse<AuthUser> {
  token?: string;
}
