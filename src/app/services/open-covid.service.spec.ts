import { TestBed } from '@angular/core/testing';

import { OpenCovidService } from './open-covid.service';

describe('OpenCovidService', () => {
  let service: OpenCovidService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(OpenCovidService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
