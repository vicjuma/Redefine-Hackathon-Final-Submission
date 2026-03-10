import { Test, TestingModule } from '@nestjs/testing';
import { AtomiqController } from './atomiq.controller';
import { AtomiqService } from './atomiq.service';

describe('AtomiqController', () => {
  let controller: AtomiqController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AtomiqController],
      providers: [AtomiqService],
    }).compile();

    controller = module.get<AtomiqController>(AtomiqController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
