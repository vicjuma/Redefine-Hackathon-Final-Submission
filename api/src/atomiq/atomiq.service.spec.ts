import { Test, TestingModule } from '@nestjs/testing';
import { AtomiqService } from './atomiq.service';

describe('AtomiqService', () => {
  let service: AtomiqService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AtomiqService],
    }).compile();

    service = module.get<AtomiqService>(AtomiqService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
