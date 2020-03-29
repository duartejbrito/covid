import { Ecdc } from '../models/ecdc/ecdc';
import { Injectable, Injector } from '@angular/core';
import { Observable } from 'rxjs';
import { ICsvProfile, CsvService } from './csv.service';

@Injectable({
  providedIn: 'root'
})
export class EcdcService {

  private csvProfile = {
    skipFirstLine: true,
    maps: [
      { index: 0, property: 'date', type: 'Moment' },
      { index: 1, property: 'location', type: 'string' },
      { index: 2, property: 'newCases', type: 'number' },
      { index: 3, property: 'newDeaths', type: 'number' },
      { index: 4, property: 'totalCases', type: 'number' },
      { index: 5, property: 'totalDeaths', type: 'number' }
    ]
  } as ICsvProfile;
  private csvService: CsvService<Ecdc>;

  constructor(injector: Injector) {
    const csvInjector =  Injector.create({
      providers: [
        { provide: CsvService, useClass: CsvService },
        { provide: 'csvProfile', useValue: this.csvProfile }
      ],
      parent: injector});

    this.csvService = csvInjector.get(CsvService);
  }

  get(): Observable<Ecdc[]> {
    return this.csvService.get('https://covid.ourworldindata.org/data/ecdc/full_data.csv');
  }
}
