import { Body, Controller, Post } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { CreateUserDto } from '../user/dto/create-user.dto';
import { ApiBadRequestResponse, ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @ApiOperation({ summary: 'Register a new user ' })
  @ApiCreatedResponse({
    description: 'User created',
    schema: {
      example: {
        _id: '67117a4a9f19a4f4b2f4be92',
        firstName: 'Alice',
        email: 'alice@example.com',
        avatar: '',
        role: 'USER',
        createdAt: '2025-10-17T22:00:00.000Z',
        updatedAt: '2025-10-17T22:00:00.000Z',
      },
    },
  })
  @ApiBadRequestResponse({ description: 'Validation error or email already in use' })
  register(@Body() body: CreateUserDto) {
    return this.authService.register(body);
  }

  @Post('login')
  @ApiOperation({ summary: 'Login with email and password' })
  @ApiOkResponse({
    description: 'JWT token',
    schema: { example: { access_token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' } },
  })
  @ApiBadRequestResponse({ description: 'Invalid credentials' })
  async login(@Body() body: LoginDto) {
    const user = await this.authService.validateUser(body.email, body.password);
    return this.authService.login(user as { _id?: string; id?: string; email: string; role: 'ADMIN' | 'USER' });
  }
}
