import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { forwardRef, Inject } from '@nestjs/common';
import { UserService } from '../user/user.service';
import { CreateUserDto } from '../user/dto/create-user.dto';
import { User } from '../user/entities/user.entity';
import { MailService } from 'src/mail/mail.service';
import { randomBytes } from 'crypto';

@Injectable()
export class AuthService {
  constructor(
    @Inject(forwardRef(() => UserService)) private readonly usersService: UserService,
    private readonly jwtService: JwtService,
     private readonly mailService: MailService,
  ) {}

  async validateUser(email: string, password: string) {
    const user = await this.usersService.findOneByEmail(email);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }
    const isMatch = await bcrypt.compare(password, user.password || '');
    if (!isMatch) {
      throw new UnauthorizedException('Invalid credentials');
    }
    const { password: _pw, ...safe } = user as User & { _id: string };
    return safe as Omit<User, 'password'> & { _id: string };
  }

  async register(dto: CreateUserDto) {
    const existing = await this.usersService.findOneByEmail(dto.email);
    if (existing) {
      throw new ConflictException('Email already in use');
    }
    const { role: _ignored, ...rest } = dto as any;
    const user = await this.usersService.create({ ...(rest as CreateUserDto), role: 'USER' } as any);
    const { password: _pw, ...safe } = (user as unknown as User) as User;
    return safe as Omit<User, 'password'>;
  }

  async login(userLike: { _id?: string; id?: string; email: string; role: 'ADMIN' | 'USER' }) {
    const sub = userLike._id || userLike.id;
    const payload = { sub, email: userLike.email, role: userLike.role };
    return {
      access_token: await this.jwtService.signAsync(payload),
    };
  }


async requestPasswordReset(email: string) {
    const user = await this.usersService.findOneByEmail(email);
    if (!user) throw new UnauthorizedException('No user found with that email');

    const code = randomBytes(3).toString('hex').toUpperCase(); // e.g. A1B2C3
    const expiration = new Date(Date.now() + 15 * 60 * 1000); // 15 min

    await this.usersService.update(user._id, {
      resetCode: code,
      resetCodeExpires: expiration,
    } as any);

    await this.mailService.sendResetCode(email, code);

    return { message: 'Reset code sent successfully' };
  }

  async verifyResetCode(email: string, code: string) {
    const user = await this.usersService.findOneByEmail(email);
    if (!user || user.resetCode !== code)
      throw new UnauthorizedException('Invalid or expired code');

    if (user.resetCodeExpires && user.resetCodeExpires < new Date())
      throw new UnauthorizedException('Code expired');

    return { message: 'Code verified successfully' };
  }

  async resetPassword(email: string, code: string, newPassword: string) {
    const user = await this.usersService.findOneByEmail(email);
    if (!user || user.resetCode !== code)
      throw new UnauthorizedException('Invalid or expired code');

    if (user.resetCodeExpires && user.resetCodeExpires < new Date())
      throw new UnauthorizedException('Code expired');

    const hashed = await bcrypt.hash(newPassword, 10);

    await this.usersService.update(user._id, {
      password: hashed,
      resetCode: null,
      resetCodeExpires: null,
    } as any);

    return { message: 'Password reset successful' };
  }




}


