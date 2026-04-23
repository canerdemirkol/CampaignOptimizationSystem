// Domain Entity - User (Aggregate Root)
// Section 3.1 of Master Prompt

export enum UserRole {
  ADMIN = 'ADMIN',
  USER = 'USER',
  VIEWER = 'VIEWER',
}

export class User {
  readonly id: string;
  readonly username: string;
  readonly passwordHash: string;
  readonly email: string;
  readonly role: UserRole;
  readonly isActive: boolean;
  readonly createdAt: Date;
  readonly updatedAt: Date;

  constructor(props: {
    id: string;
    username: string;
    passwordHash: string;
    email: string;
    role: UserRole;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
  }) {
    this.id = props.id;
    this.username = props.username;
    this.passwordHash = props.passwordHash;
    this.email = props.email;
    this.role = props.role;
    this.isActive = props.isActive;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
  }

  // Domain Rule: Inactive user cannot login
  canLogin(): boolean {
    return this.isActive;
  }

  // Domain Rule: Check role permissions
  hasRole(role: UserRole): boolean {
    return this.role === role;
  }

  isAdmin(): boolean {
    return this.role === UserRole.ADMIN;
  }
}
