import { IRegistry } from './iregistry.interface';
import { Component, ViewChild, OnInit } from '@angular/core';
import { EcdcService } from './ecdc.service';
import { toArray, map, filter, max, distinct, take } from 'rxjs/operators';
import { from, Observable, interval, Subscription } from 'rxjs';

import { ChartDataSets, ChartOptions } from 'chart.js';
import { BaseChartDirective } from 'ng2-charts';

import { sortByKeys } from './sort-by-keys';
import * as moment from 'moment';
import { MatPaginator } from '@angular/material/paginator';
import { MatTableDataSource } from '@angular/material/table';
import { MatSort, MatSortable } from '@angular/material/sort';
import { SelectionModel } from '@angular/cdk/collections';
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

  selectedMetric = 'totalCases';

  rawData: Array<IRegistry> = [];
  currentSliderValue: number;
  maxSliderValue: number;
  playSub: Subscription;

  displayedColumns: string[] = [
    'select',
    'flag',
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
          callback: value => `${value}${this.isPercentageMetric() ? '%' : ''}`,
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
          const dataItemRounded = this.numberPipe.transform(dataItem, `1.${this.isPercentageMetric() ? '3-3' : '0'}`);
          return `${dataSet.label}: ${dataItemRounded}${this.isPercentageMetric() ? '%' : ''}`;
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
            filter(x => x.date.isSame(this.maxDate)),
            toArray()
          ).subscribe(dataForTable => {
            this.dataForTable = new MatTableDataSource<IRegistry>(dataForTable);
            this.dataForTable.paginator = this.paginator;
            this.dataForTable.sort = this.sort;
          });

      const sortedDataTotal = sortByKeys(this.rawData, '-date', `-${this.selectedMetric}`);

      from(sortedDataTotal)
        .pipe(
          distinct(x => x.location),
          take(5),
          toArray()
        ).subscribe(x => x.forEach(value => {
          this.selection.select(value);
        }));

      this.fetchChartLabels();
      this.fetchChartData();
    });
  }

  ngOnInit() {
    this.selection.changed.subscribe(() => {
      this.fetchChartData();
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
          distinct(x => x.location),
          toArray()
        ).subscribe(items => {
          items.forEach(item => {
            if (this.selection.selected.filter(x => x.location === item.location).length > 0) {
              from(this.rawData)
              .pipe(
                filter(x => x.location === item.location),
                toArray()
              ).subscribe(line => {
                const filtered = this.lineChartData.filter(x => x.label === item.location);
                if (filtered && filtered.length > 0) {
                  filtered[0].data = this.mapLineChart(line);
                } else {
                  this.lineChartData.push({ label: item.location, data: this.mapLineChart(line) });
                }
              });
            } else {
              this.lineChartData = this.lineChartData.filter(x => x.label !== item.location);
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
        value = registry[0][this.selectedMetric];
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

  playClick() {
    let increment = 0;
    this.playSub = interval(250).subscribe(() => {
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

  metricChange() {
    this.sort.sort({ id: this.selectedMetric, start: 'desc' } as MatSortable);
    this.fetchChartData();
  }

  isPercentageMetric() {
    return this.selectedMetric === 'totalCasesByPopulation';
  }

  formatSliderLabel = (a: moment.Moment[]) => {
    return (value: number) => {
      return a && a.length > 0 ? a[value].format('L') : '';
    };
  }
}
