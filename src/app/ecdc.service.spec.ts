import { TestBed } from '@angular/core/testing';

import { EcdcService } from './ecdc.service';

describe('EcdcService', () => {
  let service: EcdcService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(EcdcService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
