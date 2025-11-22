import { IsEmail, IsArray, IsString, IsOptional, IsNotEmpty, ArrayMinSize, IsBoolean } from 'class-validator';

export class SubmitAccessRequestDto {
  @IsEmail()
  @IsNotEmpty()
  email!: string;

  @IsArray()
  @ArrayMinSize(1, { message: 'At least one app must be selected' })
  @IsString({ each: true })
  appIds!: string[];

  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  phone?: string;
}

export class ApproveAccessRequestDto {
  @IsString()
  @IsNotEmpty()
  requestId!: string;
}

export class RejectAccessRequestDto {
  @IsString()
  @IsNotEmpty()
  requestId!: string;

  @IsString()
  @IsOptional()
  reason?: string;
}

export class RegenerateUserAccessCodeDto {
  @IsString()
  @IsNotEmpty()
  userId!: string;

  @IsString()
  @IsNotEmpty()
  appKey!: string;
}

export class ResendAccessCodeDto {
  @IsEmail()
  @IsNotEmpty()
  email!: string;

  @IsString()
  @IsNotEmpty()
  appKey!: string;
}

export class ToggleUserAppAccessDto {
  @IsString()
  @IsNotEmpty()
  userId!: string;

  @IsString()
  @IsNotEmpty()
  appKey!: string;

  @IsBoolean()
  enabled!: boolean;
}

