import { Module, forwardRef } from '@nestjs/common';
import { UserAccessService } from './user-access.service';
import { UserAccessController } from './user-access.controller';
import { EmailModule } from '../email/email.module';
import { AuthModule } from './auth.module';

@Module({
  imports: [EmailModule, forwardRef(() => AuthModule)],
  controllers: [UserAccessController],
  providers: [UserAccessService],
  exports: [UserAccessService],
})
export class UserAccessModule {}

