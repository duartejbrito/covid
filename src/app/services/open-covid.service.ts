import { OpenCovidCategories } from '../models/opencovid/open-covid-categories';
import { OpenCovidForecast } from '../models/opencovid/open-covid-forecast';
import { OpenCovid } from '../models/opencovid/open-covid';
import { Injectable, Injector } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { CsvService } from './csv.service';
import { CsvProfile } from '../models/csv/csv-profile';

@Injectable({
  providedIn: 'root'
})
export class OpenCovidService {

  private baseUrl = `https://open-covid-19.github.io/data`;
  private csvProfile = {
    skipFirstLine: true,
    maps: [
      { index: 0, property: 'Date', type: 'Moment' },
      { index: 1, property: 'CountryCode', type: 'string' },
      { index: 2, property: 'CountryName', type: 'string' },
      { index: 3, property: 'RegionCode', type: 'string' },
      { index: 4, property: 'RegionName', type: 'string' },
      { index: 5, property: 'NewCases', type: 'number' },
      { index: 6, property: 'NewDeaths', type: 'number' },
      { index: 7, property: 'NewMild', type: 'number' },
      { index: 8, property: 'NewSevere', type: 'number' },
      { index: 9, property: 'NewCritical', type: 'number' },
      { index: 10, property: 'CurrentlyMild', type: 'number' },
      { index: 11, property: 'CurrentlySevere', type: 'number' },
      { index: 12, property: 'CurrentlyCritical', type: 'number' }
    ]
  } as CsvProfile;
  private csvService: CsvService<OpenCovidCategories>;

  constructor(private http: HttpClient, injector: Injector) {
    const csvInjector =  Injector.create({
      providers: [
        { provide: CsvService, useClass: CsvService },
        { provide: 'csvProfile', useValue: this.csvProfile }
      ],
      parent: injector});

    this.csvService = csvInjector.get(CsvService);
  }

  get(): Observable<OpenCovid[]> {
    return this.http.get<OpenCovid[]>(`${this.baseUrl}/data.json`);
  }

  getLatest(): Observable<OpenCovid[]> {
    return this.http.get<OpenCovid[]>(`${this.baseUrl}/data_latest.json`);
  }

  getForcast(): Observable<OpenCovidForecast[]> {
    return this.http.get<OpenCovidForecast[]>(`${this.baseUrl}/data_forecast.json`);
  }

  getCategories(): Observable<OpenCovidCategories[]> {
    return this.csvService.get(`${this.baseUrl}/data_categories.csv`);
  }
}
