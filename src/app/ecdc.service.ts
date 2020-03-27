import { IRegistry } from './iregistry.interface';
import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable, Subscriber } from 'rxjs';
import { map, mergeMap, switchMap, concatMap, tap } from 'rxjs/operators';
import { IRegistryCountry } from './iregistry-country.interface';
import * as moment from 'moment';

@Injectable({
  providedIn: 'root'
})
export class EcdcService {

  constructor(private http: HttpClient) { }

  public get(): Observable<Array<IRegistry>> {
    const options: {
        headers?: HttpHeaders;
        observe?: 'body';
        params?: HttpParams;
        reportProgress?: boolean;
        responseType: 'arraybuffer';
        withCredentials?: boolean;
    } = {
        responseType: 'arraybuffer'
    };

    return this.http.get('https://covid.ourworldindata.org/data/ecdc/full_data.csv', options)
      .pipe(
        switchMap(file => this.mapToIRegistry(file))
      );
  }

  private mapToIRegistry(file: ArrayBuffer): Observable<Array<IRegistry>> {
    const blob = new Blob([file], { type: 'application/octet-stream' });
    const reader = new FileReader();
    reader.readAsText(blob);

    return new Observable((observer: Subscriber<Array<IRegistry>>): void => {
      reader.addEventListener('loadend', (e) => {
        const registries: Array<IRegistry> = [];
        const lines = (e.target.result as string).split(/\r\n|\n/);

        for (let i = 1; i < lines.length; i++) {
          const currentRecord = (lines[i] as string).split(',');
          if (currentRecord[1] != null && currentRecord[1].toLowerCase() !== 'world') {
            const registry = {
              date: moment(currentRecord[0]),
              location: currentRecord[1],
              matchingLocation: this.getLocationName(currentRecord[1]),
              newCases: Number(currentRecord[2]),
              newDeaths: Number(currentRecord[3]),
              totalCases: Number(currentRecord[4]),
              totalDeaths: Number(currentRecord[5]),
            } as IRegistry;

            registries.push(registry);
          }
        }

        this.getCountryInfo(registries).subscribe(x => {
          observer.next(registries);
          observer.complete();
        });
      });
    });
  }

  public getCountryInfo(registries: Array<IRegistry>): Observable<Array<IRegistry>> {
    return this.http.get(`https://restcountries.eu/rest/v2/all`)
      .pipe(map((x: Array<IRegistryCountry>) => {
        registries.forEach(value => {
          const country = x.filter(a => a.name.toLowerCase() === value.location.toLowerCase()
            || a.nativeName.toLowerCase() === value.location.toLowerCase()
            || a.name.toLowerCase() === value.matchingLocation.toLowerCase());
          if (country && country.length > 0) {
            value.totalCasesByPopulation = ((value.totalCases * 100) / country[0].population);
            value.totalDeathsByPopulation = ((value.totalDeaths * 100) / country[0].population);
            value.totalCasesByArea = ((value.totalCases * 100) / country[0].area);
            value.totalDeathsByArea = ((value.totalDeaths * 100) / country[0].area);
            value.population = country[0].population;
            value.area = country[0].area;
            value.country = country[0];
          }
        });
        return registries;
      }));
  }

  getLocationName(name: string): string {
    const replaces: { [id: string]: string; } = {
      "Brunei": "Brunei Darussalam",
      "Cape Verde": "Cabo Verde",
      "Cote d'Ivoire": "Côte d'Ivoire",
      "Curacao": "Curaçao",
      "Democratic Republic of Congo": "Congo (Democratic Republic of the)",
      "Faeroe Islands": "Faroe Islands",
      "Iran": "Iran (Islamic Republic of)",
      "Kosovo": "Republic of Kosovo",
      "Laos": "Lao People's Democratic Republic",
      "Macedonia": "Macedonia (the former Yugoslav Republic of)",
      "Palestine": "Palestine, State of",
      "Russia": "Russian Federation",
      "South Korea": "Korea (Republic of)",
      "Syria": "Syrian Arab Republic",
      "Timor": "Timor-Leste",
      "United States Virgin Islands": "Virgin Islands (U.S.)",
      "Vatican": "Holy See",
      "Vietnam": "Viet Nam",
    };

    if (replaces[name]) {
      return replaces[name];
    }

    return name;
  }
}
