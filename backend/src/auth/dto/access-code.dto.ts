import { Type } from 'class-transformer';
import {
  IsArray,
  IsNotEmpty,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';

export class AppAssignmentDto {
  @IsString()
  @IsNotEmpty()
  appId!: string;

  @IsString()
  @IsNotEmpty()
  appKey!: string;

  @IsString()
  @IsOptional()
  appName?: string;

  @IsString()
  @IsOptional()
  appPath?: string;
}

export class SyncAccessCodesDto {
  @IsString()
  @IsNotEmpty()
  supervisorId!: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AppAssignmentDto)
  assignments: AppAssignmentDto[] = [];
}

export class RegenerateAccessCodeDto {
  @IsString()
  @IsNotEmpty()
  supervisorId!: string;

  @IsString()
  @IsNotEmpty()
  appKey!: string;
}

export class CheckAccessCodeDto {
  @IsString()
  @IsNotEmpty()
  code!: string;

  @IsString()
  @IsNotEmpty()
  appKey!: string;
}

export class SendSupervisorWelcomeDto {
  @IsString()
  @IsNotEmpty()
  supervisorId!: string;

  @IsString()
  @IsNotEmpty()
  password!: string;
}


