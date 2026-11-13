import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entities/user.entity.js';
import { LoyaltyTransaction } from './entities/loyalty-transaction.entity.js';
import { UsersService } from './users.service.js';

@Module({
  imports: [TypeOrmModule.forFeature([User, LoyaltyTransaction])],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}