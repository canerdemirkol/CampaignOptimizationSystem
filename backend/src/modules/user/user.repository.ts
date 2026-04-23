import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { BaseRepository } from '../../infrastructure/repositories';
import { User, UserRole } from '../../domain/entities/user.entity';

@Injectable()
export class UserRepository extends BaseRepository<User> {
  constructor(prisma: PrismaService) {
    super(prisma, 'User');
  }

  protected getDelegate() {
    return this.prisma.user;
  }

  protected toDomain(data: any): User {
    return new User({
      id: data.id,
      username: data.username,
      passwordHash: data.passwordHash,
      email: data.email,
      role: data.role as UserRole,
      isActive: data.isActive,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    });
  }

  async findByUsername(username: string): Promise<any | null> {
    return this.findUniqueRaw({ where: { username } });
  }

  async findByUsernameOrEmail(username: string, email: string): Promise<any | null> {
    return (this.delegate as any).findFirst({
      where: {
        OR: [{ username }, { email }],
      },
    });
  }

  async findRefreshToken(token: string) {
    return this.prisma.refreshToken.findUnique({
      where: { token },
      include: { user: true },
    });
  }

  async createRefreshToken(data: { token: string; userId: string; expiresAt: Date }) {
    return this.prisma.refreshToken.create({ data });
  }

  async deleteRefreshToken(id: string) {
    return this.prisma.refreshToken.delete({ where: { id } });
  }

  async deleteRefreshTokensByToken(token: string) {
    return this.prisma.refreshToken.deleteMany({ where: { token } });
  }
}
