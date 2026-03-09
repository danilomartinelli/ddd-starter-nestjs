import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';

export class LoginRequestDto {
  @ApiProperty({ example: 'john@gmail.com' })
  @MaxLength(320)
  @MinLength(5)
  @IsEmail()
  readonly email: string;

  @ApiProperty({ example: 'SecureP@ssw0rd' })
  @MaxLength(128)
  @MinLength(8)
  @IsString()
  readonly password: string;
}
