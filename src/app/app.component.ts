import { IRegistry } from './iregistry.interface';
import { Component, ViewChild, OnInit } from '@angular/core';
import { EcdcService } from './ecdc.service';
import { mergeMap, toArray, groupBy, map, filter, max, min, distinct, concatMap, tap, count, take } from 'rxjs/operators';
import { of, from, Observable, interval, Subscription } from 'rxjs';

import { ChartDataSets, ChartOptions, ChartPoint } from 'chart.js';
import { Color, BaseChartDirective, Label } from 'ng2-charts';

import { sortByKeys } from './sort-by-keys';
import * as moment from 'moment';
import { MatPaginator } from '@angular/material/paginator';
import { MatTableDataSource } from '@angular/material/table';
import { MatSort } from '@angular/material/sort';
import { SelectionModel } from '@angular/cdk/collections';
import { IRegistryCountry } from './iregistry-country.interface';
import { DecimalPipe } from '@angular/common';
import { MatSliderChange } from '@angular/material/slider';

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
  styleUrls: ['./app.component.css'],
  providers: [DecimalPipe]
})
export class AppComponent implements OnInit {

  loaded = false;

  rawData: Array<IRegistry> = [];
  top: Array<string> = [];
  currentSliderValue: number;
  maxSliderValue: number;
  playSub: Subscription;

  displayedColumns: string[] = [
    'select',
    'location',
    'newCases',
    'newDeaths',
    'totalCases',
    'totalDeaths',
    'population',
    'totalCasesByPopulation'
  ];
  maxDate: moment.Moment;
  dataForTable: MatTableDataSource<IRegistry>;
  selection = new SelectionModel<IRegistry>(true, []);

  @ViewChild(MatPaginator, {static: true}) paginator: MatPaginator;
  @ViewChild(MatSort, {static: true}) sort: MatSort;

  public lineChartData: ChartDataSets[] = [];
  public lineChartLabels: moment.Moment[] = [];
  public lineChartOptions: ChartOptions = {
    responsive: true,
    legend: {
      display: true,
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
          const dataItemRounded = this.numberPipe.transform(dataItem, '1.3-3');
          return `${dataSet.label}: ${dataItemRounded}%`;
        }
      }
    }
  };

  @ViewChild(BaseChartDirective, { static: false }) chart: BaseChartDirective;

  constructor(ecdcService: EcdcService, private numberPipe: DecimalPipe) {
    ecdcService.get().subscribe(result => {
      this.rawData = result;

      from(this.rawData)
        .pipe(
          map(x => x.date),
          max()
        ).subscribe(maxDate => this.maxDate = maxDate);

      from(this.rawData)
          .pipe(
            filter(x => x.location.toLowerCase() !== 'world' && x.date.isSame(this.maxDate)),
            toArray()
          ).subscribe(dataForTable => {
            this.dataForTable = new MatTableDataSource<IRegistry>(dataForTable);
            this.dataForTable.paginator = this.paginator;
            this.dataForTable.sort = this.sort;
          });

      const sortedDataTotal = sortByKeys(this.rawData, '-date', '-totalCases');

      from(sortedDataTotal)
        .pipe(
          filter(x => x.location.toLowerCase() !== 'world'),
          map(x => x.location),
          distinct(),
          take(5),
          toArray()
        ).subscribe(top => this.top = ['Portugal', ...top]);

      this.fetchChartLabels();
      this.fetchChartData();
    });
  }

  ngOnInit() {
    this.selection.changed.subscribe(result => {
      from(result.source.selected)
        .pipe(
          map(x => x.location),
          toArray()
        ).subscribe(countries => {
          this.top = countries;
          this.fetchChartData();
        });
    });
  }

  fetchChartLabels() {
    const sortedDataDate = sortByKeys(this.rawData, 'date');

    from(sortedDataDate)
      .pipe(
        map(x => x.date),
        distinct(x => x.format()),
        toArray(),
      ).subscribe(dates => {
        this.lineChartLabels = dates;
        this.currentSliderValue = this.lineChartLabels.length - 1;
        this.maxSliderValue = this.lineChartLabels.length - 1;
      });
  }

  fetchChartData() {
    this.loaded = false;
    from(this.rawData)
        .pipe(
          map(x => x.location),
          distinct(),
          toArray()
        ).subscribe(countries => {
          countries.forEach(country => {
            if (this.top.indexOf(country) > -1) {
              from(this.rawData)
              .pipe(
                filter(x => x.location === country),
                toArray()
              ).subscribe(line => {
                const filtered = this.lineChartData.filter(x => x.label === country);
                if (filtered && filtered.length > 0) {
                  filtered[0].data = this.mapLineChart(line);
                } else {
                  this.lineChartData.push({ label: country, data: this.mapLineChart(line) });
                }
              });
            } else {
              this.lineChartData = this.lineChartData.filter(x => x.label !== country);
            }
          });
          this.loaded = true;
        });
  }

  mapLineChart(registries: Array<IRegistry>): Array<number> {
    const lineValues: Array<number> = [];
    const maxDate = this.lineChartLabels[this.currentSliderValue];
    this.lineChartLabels.filter(x => x.isSameOrBefore(maxDate)).forEach(date => {
      const registry = registries.filter(x => x.date.isSame(date));
      let value = 0;
      if (registry !== null && registry.length > 0) {
        value = registry[0].totalCasesByPopulation;
      }
      lineValues.push(Number(value));
    });
    return lineValues;
  }

  applyFilter(event: Event) {
    const filterValue = (event.target as HTMLInputElement).value;
    this.dataForTable.filter = filterValue.trim().toLowerCase();
  }

  isAllSelected() {
    const numSelected = this.selection.selected.length;
    const numRows = this.dataForTable ? this.dataForTable.data.length : 0;
    return numSelected === numRows;
  }

  masterToggle() {
    this.isAllSelected() ?
        this.selection.clear() :
        this.dataForTable.data.forEach(row => this.selection.select(row));
  }

  checkboxLabel(row?: IRegistry): string {
    if (!row) {
      return `${this.isAllSelected() ? 'select' : 'deselect'} all`;
    }
    return `${this.selection.isSelected(row) ? 'deselect' : 'select'} row ${row.location}`;
  }

  sliderChange(e: MatSliderChange) {
    this.timeMovement(e.value);
  }

  playClick(e) {
    let increment = 0;
    this.playSub = interval(250).subscribe(x => {
      if (increment === this.maxSliderValue) {
        this.playSub.unsubscribe();
      }
      this.timeMovement(increment++);
    });

  }

  timeMovement(value: number) {
    this.currentSliderValue = this.lineChartLabels.slice(0, value).length;

    this.fetchChartData();
  }
}
