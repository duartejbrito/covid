import { IRegistry } from './iregistry.interface';
import { Component, ViewChild, OnInit } from '@angular/core';
import { EcdcService } from './ecdc.service';
import { mergeMap, toArray, groupBy, map, filter, max, min, distinct, concatMap, tap, count, take } from 'rxjs/operators';
import { of, from, Observable } from 'rxjs';

import { ChartDataSets, ChartOptions, ChartPoint } from 'chart.js';
import { Color, BaseChartDirective, Label } from 'ng2-charts';

import { sortByKeys } from './sort-by-keys';
import * as moment from 'moment';
import { MatPaginator } from '@angular/material/paginator';
import { MatTableDataSource } from '@angular/material/table';
import { MatSort } from '@angular/material/sort';

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
export class AppComponent implements OnInit {

  loaded = false;

  rawData: Array<IRegistry> = [];
  top: Array<string> = [];

  displayedColumns: string[] = ['location', 'newCases', 'newDeaths', 'totalCases', 'totalDeaths', 'population', 'totalCasesByPopulation'];
  maxDate: moment.Moment;
  dataForTable: MatTableDataSource<IRegistry>;

  @ViewChild(MatPaginator, {static: true}) paginator: MatPaginator;
  @ViewChild(MatSort, {static: true}) sort: MatSort;

  public lineChartData: ChartDataSets[] = [];
  public lineChartLabels: moment.Moment[] = [];
  public lineChartOptions: ChartOptions = {
    responsive: true,
    legend: {
      position: 'right',
      align: 'center'
    },
    scales: {
      xAxes: [{
        type: 'time',
        time: {
          unit: 'day',
          displayFormats: {
            day: 'MMM DD'
          }
        },
      }],
      yAxes: [{
        ticks: {
          min: 0,
          callback: value => `${value}%`,
        },
        scaleLabel: {
          display: true,
          labelString: 'Percentage by Population'
        }
      }]
    },
    tooltips: {
      enabled: true,
      callbacks: {
        title: (item, data) => {
          const tooltipItem = item[0];
          return (data.labels[tooltipItem.index] as moment.Moment).format('L');
        },
        label: (item, data) => {
          const dataSet = data.datasets[item.datasetIndex];
          const dataItem = dataSet.data[item.index];
          const dataItemRounded = this.roundValue(dataItem);
          return `${dataSet.label}: ${dataItemRounded}%`;
        }
      }
    }
  };

  constructor(ecdcService: EcdcService) {
    ecdcService.get().subscribe(result => {
      this.rawData = result;

      from(result)
        .pipe(
          map(x => x.date),
          max()
        ).subscribe(maxDate => this.maxDate = maxDate);

      from(result)
          .pipe(
            filter(x => x.location.toLowerCase() !== 'world' && x.date.isSame(this.maxDate)),
            toArray()
          ).subscribe(dataForTable => {
            this.dataForTable = new MatTableDataSource<IRegistry>(dataForTable);
            this.dataForTable.paginator = this.paginator;
            this.dataForTable.sort = this.sort;
          });

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
          map(x => x.date),
          distinct(x => x.format()),
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

  ngOnInit() {
  }

  mapLineChart(registries: Array<IRegistry>): Array<number> {
    const lineValues: Array<number> = [];
    this.lineChartLabels.forEach(date => {
      const registry = registries.filter(x => x.date.isSame(date));
      let value = 0;
      if (registry !== null && registry.length > 0) {
        value = registry[0].totalCasesByPopulation;
      }
      lineValues.push(Number(value));
    });
    return lineValues;
  }

  roundValue(value: number | ChartPoint) {
    return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
  }

  applyFilter(event: Event) {
    const filterValue = (event.target as HTMLInputElement).value;
    this.dataForTable.filter = filterValue.trim().toLowerCase();
  }
}
