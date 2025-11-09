import { Body, Controller, Post } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { CreateUserDto } from '../user/dto/create-user.dto';
import { ApiBadRequestResponse, ApiBody, ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiTags ,} from '@nestjs/swagger';
import { UserService } from '../user/user.service';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly userService: UserService,
  ) {}

  @Post('register')
  @ApiOperation({ summary: 'Register a new user ' })
  @ApiCreatedResponse({
    description: 'User created',
    schema: {
      example: {
        _id: '67117a4a9f19a4f4b2f4be92',
        firstName: 'Amine',
        lastName: 'Mami',
        Gender: 'Male',
        email: 'amine@example.com',
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


 // FORGOT PASSWORD
  @Post('forgot-password')
  @ApiOperation({ summary: 'Request a password reset code via email' })
  @ApiBody({
    schema: { example: { email: 'user@example.com' } },
  })
  @ApiOkResponse({
    description: 'Reset code sent successfully to the provided email',
    schema: { example: { message: 'Reset code sent to your email' } },
  })
  async forgotPassword(@Body('email') email: string) {
    return this.authService.requestPasswordReset(email);
  }

  // VERIFY RESET CODE
  @Post('verify-reset-code')
  @ApiOperation({ summary: 'Verify the reset code sent to email' })
  @ApiBody({
    schema: { example: { email: 'user@example.com', code: '482931' } },
  })
  @ApiOkResponse({
    description: 'Code verified successfully',
    schema: { example: { message: 'Code verified' } },
  })
  async verifyResetCode(@Body() body: { email: string; code: string }) {
    return this.authService.verifyResetCode(body.email, body.code);
  }

  // RESET PASSWORD
  @Post('reset-password')
  @ApiOperation({ summary: 'Reset password using verified code' })
  @ApiBody({
    schema: { example: { email: 'user@example.com', code: '482931', newPassword: 'newStrongPassword123' } },
  })
  @ApiOkResponse({
    description: 'Password reset successfully',
    schema: { example: { message: 'Password reset successful' } },
  })
  async resetPassword(@Body() body: { email: string; code: string; newPassword: string }) {
    // 1) verify code using AuthService
    await this.authService.verifyResetCode(body.email, body.code);
    // 2) set (and hash) the password using UserService
    await this.userService.updatePasswordByEmail(body.email, body.newPassword);
    return { message: 'Password reset successful' };
  }
}
