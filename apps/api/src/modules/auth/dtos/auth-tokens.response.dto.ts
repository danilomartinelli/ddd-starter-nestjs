import { ApiProperty } from '@nestjs/swagger';

export class AuthTokensResponseDto {
  @ApiProperty({ example: 'eyJhbGciOiJIUzI1NiIs...' })
  accessToken: string;

  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  refreshToken: string;

  @ApiProperty({ example: 3600, description: 'Token expiry in seconds' })
  expiresIn: number;
}
