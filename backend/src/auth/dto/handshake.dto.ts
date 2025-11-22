import { IsOptional, IsString } from 'class-validator';

export class HandshakeDto {
  @IsOptional()
  @IsString()
  token?: string;
}

