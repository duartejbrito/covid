import { IRegistry } from './iregistry.interface';
import { Component, ViewChild } from '@angular/core';
import { EcdcService } from './ecdc.service';
import { mergeMap, toArray, groupBy, map, filter, max, min, distinct, concatMap, tap, count, take } from 'rxjs/operators';
import { of, from, Observable } from 'rxjs';

import { ChartDataSets, ChartOptions } from 'chart.js';
import { Color, BaseChartDirective, Label } from 'ng2-charts';

import { sortByKeys } from './sort-by-keys';

export const sortKeys = <T>(...keys: string[]) => (source: Observable<T[]>): Observable<T[]> => new Observable(observer => {
    return source.subscribe({
        next(x) {
            observer.next(
                sortByKeys(x, ...keys)
            );
        },
        error(err) { observer.error(err); },
        complete() { observer.complete(); }
    });
});

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {

  loaded = false;

  rawData: Array<IRegistry> = [];
  top: Array<string> = [];

  public lineChartData: ChartDataSets[] = [];
  public lineChartLabels: Label[] = [];
  public lineChartOptions: ChartOptions = {
    responsive: true,
    scales: {
      xAxes: [{ }],
      yAxes: [
        {
          id: 'y-axis-0',
          position: 'left',
        }
      ]
    }
  };

  constructor(ecdcService: EcdcService) {
    ecdcService.get().subscribe(result => {
      this.rawData = result;
      console.log(result)

      const sortedDataTotal = sortByKeys(result, '-date', '-totalCases');

      from(sortedDataTotal)
        .pipe(
          filter(x => x.location.toLowerCase() !== 'world'),
          map(x => x.location),
          distinct(),
          take(5),
          toArray()
        ).subscribe(top => this.top = ['Portugal', ...top]);

      const sortedDataDate = sortByKeys(result, 'date');

      from(sortedDataDate)
        .pipe(
          map(x => x.date as unknown as string),
          distinct(),
          toArray(),
        ).subscribe(dates => this.lineChartLabels = dates);

      from(result)
        .pipe(
          map(x => x.location),
          distinct(),
          toArray()
        ).subscribe(countries => {
          countries.forEach(country => {
            if (this.top.indexOf(country) > -1) {
              from(result)
              .pipe(
                filter(x => x.location === country),
                toArray()
              ).subscribe(line => {
                this.lineChartData.push({ label: country, data: this.mapLineChart(line) });
              });
            }
          });
          this.loaded = true;
        });
    });
  }

  mapLineChart(registries: Array<IRegistry>): Array<number> {
    const lineValues: Array<number> = [];
    this.lineChartLabels.forEach(date => {
      const registry = registries.filter(x => x.date as unknown as string === date);
      let value = 0;
      if (registry !== null && registry.length > 0) {
        value = (registry[0].totalCases * 100) / registry[0].country.population;
      }
      lineValues.push(Number(value));
    });
    return lineValues;
  }
}
