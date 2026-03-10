import { Module } from '@nestjs/common';
import { AtomiqService } from './atomiq.service';
import { AtomiqController } from './atomiq.controller';
import { PrismaService } from 'src/prisma.service';

@Module({
  controllers: [AtomiqController],
  providers: [AtomiqService, PrismaService],
})
export class AtomiqModule {}
