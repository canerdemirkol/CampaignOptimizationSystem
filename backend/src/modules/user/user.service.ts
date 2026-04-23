import { Injectable } from '@nestjs/common';
import { UserRepository } from './user.repository';
import { User, UserRole } from '../../domain/entities/user.entity';

@Injectable()
export class UserService {
  constructor(private readonly userRepo: UserRepository) {}

  async getAll(): Promise<User[]> {
    const result = await this.userRepo.findAll(1, 1000, { createdAt: 'desc' });
    return result.data;
  }

  async findAll(page = 1, limit = 10): Promise<any> {
    return this.userRepo.findAll(page, limit, { createdAt: 'desc' });
  }

  async findById(id: string): Promise<User> {
    return this.userRepo.findById(id);
  }

  async updateRole(id: string, role: UserRole): Promise<User> {
    return this.userRepo.update(id, { role } as any);
  }

  async updateStatus(id: string, isActive: boolean): Promise<User> {
    return this.userRepo.update(id, { isActive } as any);
  }

  async delete(id: string): Promise<void> {
    await this.userRepo.delete(id);
  }
}
