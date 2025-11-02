import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { forwardRef, Inject } from '@nestjs/common';
import { UserService } from '../user/user.service';
import { CreateUserDto } from '../user/dto/create-user.dto';
import { User } from '../user/entities/user.entity';

@Injectable()
export class AuthService {
  constructor(
    @Inject(forwardRef(() => UserService)) private readonly usersService: UserService,
    private readonly jwtService: JwtService,
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
}
