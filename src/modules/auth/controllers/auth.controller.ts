import { Body, Controller, Get, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthService } from '../services/auth.service';
import { LoginDto, RegisterDto, GoogleAuthDto } from '../dto/auth.dto';
import { Public } from '../../../common/decorators/auth.decorators';
import type { AuthenticatedUser } from '../../../common/decorators/current-user.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('register')
  @ApiOperation({ summary: 'Register a new student account' })
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Public()
  @Post('login')
  @ApiOperation({ summary: 'Login with email and password' })
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Public()
  @Post('google')
  @ApiOperation({
    summary: 'Sign in with Google — creates an account automatically if new',
  })
  loginWithGoogle(@Body() dto: GoogleAuthDto) {
    return this.authService.loginWithGoogle(dto.idToken);
  }

  @ApiBearerAuth()
  @Get('me')
  @ApiOperation({ summary: 'Get current authenticated user' })
  getMe(@CurrentUser() user: AuthenticatedUser) {
    return this.authService.getMe(user.id);
  }
}
