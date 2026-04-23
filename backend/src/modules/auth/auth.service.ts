import { Injectable, UnauthorizedException, ConflictException, ForbiddenException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { UserRepository } from '../user/user.repository';
import { LoginDto, RegisterDto, TokenPayloadDto } from './dto/auth.dto';

@Injectable()
export class AuthService {
  private readonly accessTokenExpiry = '15m'; // 15 minutes - Section 4
  private readonly refreshTokenExpiry = 7 * 24 * 60 * 60 * 1000; // 7 days - Section 4

  constructor(
    private readonly userRepo: UserRepository,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async register(dto: RegisterDto) {
    const existingUser = await this.userRepo.findByUsernameOrEmail(dto.username, dto.email);
    if (existingUser) {
      throw new ConflictException('Username or email already exists');
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);

    const user = await this.userRepo.createRaw({
      data: {
        username: dto.username,
        email: dto.email,
        passwordHash,
        role: 'USER',
        isActive: true,
      },
    });

    return {
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
      },
      message: 'User registered successfully',
    };
  }

  async login(dto: LoginDto) {
    const user = await this.userRepo.findByUsername(dto.username);

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Domain Rule: Inactive user cannot login (Section 3.1)
    if (!user.isActive) {
      throw new ForbiddenException('User account is inactive');
    }

    const isPasswordValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const tokens = await this.generateTokens(user);

    return {
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
      },
      ...tokens,
    };
  }

  async refreshTokens(refreshToken: string) {
    const storedToken = await this.userRepo.findRefreshToken(refreshToken);

    if (!storedToken) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    if (storedToken.expiresAt < new Date()) {
      await this.userRepo.deleteRefreshToken(storedToken.id);
      throw new UnauthorizedException('Refresh token expired');
    }

    if (!storedToken.user.isActive) {
      throw new ForbiddenException('User account is inactive');
    }

    // Delete old refresh token
    await this.userRepo.deleteRefreshToken(storedToken.id);

    // Generate new tokens
    const tokens = await this.generateTokens(storedToken.user);

    return {
      user: {
        id: storedToken.user.id,
        username: storedToken.user.username,
        email: storedToken.user.email,
        role: storedToken.user.role,
      },
      ...tokens,
    };
  }

  async logout(refreshToken: string) {
    await this.userRepo.deleteRefreshTokensByToken(refreshToken);
    return { message: 'Logged out successfully' };
  }

  async validateUser(payload: TokenPayloadDto) {
    const user = await this.userRepo.findByIdOrNull(payload.sub);

    if (!user || !user.isActive) {
      throw new UnauthorizedException('User not found or inactive');
    }

    return user;
  }

  private async generateTokens(user: { id: string; username: string; email: string; role: string }) {
    const payload: TokenPayloadDto = {
      sub: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
    };

    const accessToken = this.jwtService.sign(payload, {
      expiresIn: this.accessTokenExpiry,
    });

    const refreshToken = uuidv4();
    const refreshTokenExpiry = new Date(Date.now() + this.refreshTokenExpiry);

    await this.userRepo.createRefreshToken({
      token: refreshToken,
      userId: user.id,
      expiresAt: refreshTokenExpiry,
    });

    return { accessToken, refreshToken };
  }
}
