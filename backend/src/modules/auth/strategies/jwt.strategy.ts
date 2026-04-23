import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, ExtractJwt } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { AuthService } from '../auth.service';
import { TokenPayloadDto } from '../dto/auth.dto';
import { CryptoService } from '../../../infrastructure/crypto/crypto.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly configService: ConfigService,
    private readonly authService: AuthService,
  ) {
    const encryptionKey = configService.get<string>('ENCRYPTION_KEY') || '';
    const jwtSecret = CryptoService.decryptEnvValue(
      configService.get<string>('JWT_SECRET'),
      encryptionKey,
    );

    super({
      // Extract JWT from httpOnly cookie (Section 4)
      jwtFromRequest: ExtractJwt.fromExtractors([
        (request: Request) => {
          return request?.cookies?.access_token;
        },
        ExtractJwt.fromAuthHeaderAsBearerToken(),
      ]),
      ignoreExpiration: false,
      secretOrKey: jwtSecret || 'default-secret-change-in-production',
    });
  }

  async validate(payload: TokenPayloadDto) {
    const user = await this.authService.validateUser(payload);
    if (!user) {
      throw new UnauthorizedException();
    }
    return user;
  }
}
