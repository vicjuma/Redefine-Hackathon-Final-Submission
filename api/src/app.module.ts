import { Module } from '@nestjs/common';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { ConfigModule } from '@nestjs/config';
import { AtomiqModule } from './atomiq/atomiq.module.js';
import { PrismaService } from './prisma.service';

@Module({
  imports: [ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env'],
    }), AtomiqModule,],
  controllers: [AppController],
  providers: [AppService, PrismaService],
})
export class AppModule {}
