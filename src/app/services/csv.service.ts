import { Injectable, Inject } from '@angular/core';
import { Observable, Subscriber } from 'rxjs';
import { HttpHeaders, HttpParams, HttpClient } from '@angular/common/http';
import { switchMap } from 'rxjs/operators';
import * as moment from 'moment';

@Injectable({
  providedIn: 'root'
})
export class CsvService<T> {

  constructor(private http: HttpClient, @Inject('csvProfile') public csvProfile: ICsvProfile) {
  }

  get(url: string): Observable<T[]> {
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

    return this.http.get(url, options)
      .pipe(
        switchMap(file => this.mapLines(file))
      );
  }

  private mapLines(file: ArrayBuffer): Observable<T[]> {
    const blob = new Blob([file], { type: 'application/octet-stream' });
    const reader = new FileReader();
    reader.readAsText(blob);

    return new Observable((observer: Subscriber<T[]>): void => {
      reader.addEventListener('loadend', (progressEvent) => {
        const result: T[] = [];
        const lines = (progressEvent.target.result as string).split(/\r\n|\n/);
        const initIndex = this.csvProfile.skipFirstLine ? 1 : 0;

        for (let i = initIndex; i < lines.length; i++) {
          const currentLine = (lines[i] as string).split(',');
          const item = {} as T;

          this.csvProfile.maps.forEach((map) => {
            switch (map.type) {
              case 'Moment':
                item[map.property] = moment(currentLine[map.index]);
                break;
              case 'number':
                item[map.property] = Number(currentLine[map.index]);
                break;
              case 'boolean':
                item[map.property] = Boolean(currentLine[map.index]);
                break;
              default:
                item[map.property] = currentLine[map.index];
                break;
            }

            if (map.format) {
              item[map.property] = map.format(item, map, currentLine);
            }
          });

          result.push(item);
        }

        observer.next(result);
        observer.complete();
      });
    });
  }
}

type CsvMapProfileType = 'Moment' | 'string' | 'number' | 'boolean';
type CsvMapProfileFormat = (item: any, map: ICsvMapProfile, currentLine: string[]) => moment.Moment | string | number | boolean;
export interface ICsvProfile {
  skipFirstLine: boolean;
  maps: ICsvMapProfile[];
}
export interface ICsvMapProfile {
  index: number;
  property: number | string;
  type: CsvMapProfileType;
  format?: CsvMapProfileFormat;
}
