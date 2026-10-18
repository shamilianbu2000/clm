import { Module } from '@nestjs/common';
import { ContractsController, TemplatesController } from './contracts.controller';
import { ContractsService } from './contracts.service';

@Module({ controllers: [ContractsController, TemplatesController], providers: [ContractsService] })
export class AppModule {}
