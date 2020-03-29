import { IAppDatasource } from '../models/iapp-datasource';
import { Ecdc } from '../models/ecdc/ecdc';
import { Injectable } from '@angular/core';
import { EcdcService } from './ecdc.service';
import { RestCountriesService } from './rest-countries.service';
import { Subject, Observable, Subscriber, from } from 'rxjs';
import { map, switchMap, first, filter, toArray } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class AppService {

  private datasourceSubject = new Subject<IAppDatasource[]>();
  datasource: Observable<IAppDatasource[]>;

  constructor(private ecdcService: EcdcService, private restCountriesService: RestCountriesService) {
    this.datasource = this.datasourceSubject.asObservable();
    this.init();
  }

  private init() {
    this.ecdcService.get()
      .pipe(switchMap(x => this.switchMapEcdc(x)), toArray())
      .subscribe(result => {
        this.datasourceSubject.next(result);
        this.datasourceSubject.complete();
      });
  }

  private switchMapEcdc(source: Ecdc[]): Observable<IAppDatasource> {
    return new Observable((observer: Subscriber<IAppDatasource>): void => {
      this.restCountriesService.all().subscribe(countries => {
        from(source)
          .pipe(
            filter(x => x.location !== null && x.location !== undefined && x.location !== 'World'),
            map(x => {
              return {
                date: x.date,
                countryName: x.location,
                newCases: x.newCases,
                newDeaths: x.newDeaths,
                totalCases: x.totalCases,
                totalDeaths: x.totalDeaths,
              } as IAppDatasource;
            })
          )
          .subscribe({
            next: item => {
              from(countries)
              .pipe(first(x => x.name.toLowerCase() === this.getCountryNameToMatch(item.countryName).toLowerCase()
                || x.nativeName.toLowerCase() === item.countryName.toLowerCase(), null))
              .subscribe(country => {
                if (country) {
                  item.countryCode = country.alpha2Code;
                  item.flag = country.flag;
                  item.region = country.region;
                  item.population = country.population;
                  item.area = country.area;
                  item.latitude = country.latlng[0];
                  item.longitude = country.latlng[1];

                  item.totalCasesByPopulation = ((item.totalCases * 100) / country.population);
                  item.totalDeathsByPopulation = ((item.totalDeaths * 100) / country.population);
                  item.totalCasesByArea = ((item.totalCases * 100) / country.area);
                  item.totalDeathsByArea = ((item.totalDeaths * 100) / country.area);
                }

                observer.next(item);
              });
            },
            complete: () => observer.complete()
          });
      });
    });
  }

  private getCountryNameToMatch(name: string): string {
    const replaces: { [id: string]: string; } = {
      Brunei: 'Brunei Darussalam',
      'Cape Verde': 'Cabo Verde',
      'Cote d\'Ivoire': 'Côte d\'Ivoire',
      Curacao: 'Curaçao',
      'Democratic Republic of Congo': 'Congo (Democratic Republic of the)',
      'Faeroe Islands': 'Faroe Islands',
      Iran: 'Iran (Islamic Republic of)',
      Kosovo: 'Republic of Kosovo',
      Laos: 'Lao People\'s Democratic Republic',
      Macedonia: 'Macedonia (the former Yugoslav Republic of)',
      Palestine: 'Palestine, State of',
      Russia: 'Russian Federation',
      'South Korea': 'Korea (Republic of)',
      Syria: 'Syrian Arab Republic',
      Timor: 'Timor-Leste',
      'United States Virgin Islands': 'Virgin Islands (U.S.)',
      Vatican: 'Holy See',
      Vietnam: 'Viet Nam',
    };

    if (replaces[name]) {
      return replaces[name];
    }

    return name;
  }
}
