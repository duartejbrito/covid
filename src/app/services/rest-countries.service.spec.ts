import { TestBed } from '@angular/core/testing';

import { RestCountriesService } from './rest-countries.service';

describe('RestCountriesService', () => {
  let service: RestCountriesService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(RestCountriesService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
