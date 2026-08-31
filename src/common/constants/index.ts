export const CACHE_KEYS = {
  user: (id: string) => `user:${id}`,
  userByEmail: (email: string) => `user:email:${email}`,
  profile: (userId: string) => `profile:${userId}`,
  platformConfig: (key: string) => `config:${key}`,
  diagnosticTemplate: (slug: string) => `diagnostic:template:${slug}`,
  colleges: 'colleges:list',
  activities: 'activities:list',
} as const;

export const CACHE_TAGS = {
  users: 'users',
  profiles: 'profiles',
  configs: 'configs',
  diagnostics: 'diagnostics',
  colleges: 'colleges',
  activities: 'activities',
} as const;

export const ROLES = {
  STUDENT: 'STUDENT',
  ADMIN: 'ADMIN',
  PROGRAM_MANAGER: 'PROGRAM_MANAGER',
  COUNSELOR: 'COUNSELOR',
  PARENT: 'PARENT',
} as const;

export type Role = (typeof ROLES)[keyof typeof ROLES];
