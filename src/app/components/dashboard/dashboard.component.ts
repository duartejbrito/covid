import { Component, ViewChild, OnInit } from '@angular/core';
import { toArray, map, filter, max, take, groupBy, mergeMap } from 'rxjs/operators';
import { from, interval, Subscription, Subject } from 'rxjs';

import { ChartDataSets, ChartOptions } from 'chart.js';
import { BaseChartDirective } from 'ng2-charts';

import * as moment from 'moment';
import { MatPaginator } from '@angular/material/paginator';
import { MatTableDataSource } from '@angular/material/table';
import { MatSort, MatSortable } from '@angular/material/sort';
import { SelectionModel } from '@angular/cdk/collections';
import { DecimalPipe } from '@angular/common';
import { MatSliderChange } from '@angular/material/slider';
import { IAppDatasource } from 'src/app/models/iapp-datasource';
import { AppService } from 'src/app/services/app.service';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss'],
  providers: [DecimalPipe]
})
export class DashboardComponent implements OnInit {
  loaded = false;

  selectedMetric = 'totalCases';

  rawData: IAppDatasource[] = [];
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
  dataForTable: MatTableDataSource<IAppDatasource>;
  selection = new SelectionModel<IAppDatasource>(true, []);

  @ViewChild(MatPaginator, { static: true }) paginator: MatPaginator;
  @ViewChild(MatSort, { static: true }) sort: MatSort;

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

  constructor(private appService: AppService, private numberPipe: DecimalPipe) {
    this.appService.datasource.subscribe(result => this.init(result));
    this.appService.init();
  }

  ngOnInit() {
    this.selection.changed.subscribe((changes) => {
      if (changes.removed.length > 0) {
        this.lineChartData = this.lineChartData.filter(x => changes.removed.filter(c => c.countryName === x.label).length === 0);
      }

      if (changes.added.length > 0) {
        this.fetchChartData();
      }
    });
  }

  init(data: IAppDatasource[]) {
    this.rawData = data;

    from(this.rawData)
      .pipe(
        map(x => x.date),
        max()
      ).subscribe(maxDate => {
        this.maxDate = maxDate;
        this.fetchChartLabels();
      });

    from(this.rawData)
      .pipe(
        filter(x => x.date.isSame(this.maxDate)),
        toArray()
      ).subscribe(dataForTable => {
        this.dataForTable = new MatTableDataSource<IAppDatasource>(dataForTable);
        this.dataForTable.paginator = this.paginator;
        this.dataForTable.sort = this.sort;

        from(this.dataForTable.sortData(dataForTable, this.sort))
          .pipe(
            take(5),
            toArray()
          ).subscribe(x => x.forEach(value => {
            this.selection.select(value);
          }));
      });
  }

  generateRangeOfDates(
    start: moment.Moment,
    end: moment.Moment,
    key: moment.unitOfTime.DurationConstructor,
    arr = [start.startOf(key)]): Array<moment.Moment> {
    const next = moment(start).add(1, key).startOf(key);
    if (next.isAfter(end, key)) {
      return arr;
    }
    return this.generateRangeOfDates(next, end, key, arr.concat(next));
  }

  fetchChartLabels() {
    const rawDates = this.generateRangeOfDates(moment('2019-12-31'), this.maxDate, 'day');

    this.lineChartLabels = rawDates;
    this.currentSliderValue = this.lineChartLabels.length - 1;
    this.maxSliderValue = this.lineChartLabels.length - 1;
  }

  fetchChartData() {
    this.loaded = false;
    from(this.rawData)
      .pipe(
        filter(x => this.selection.selected.filter(s => s.countryName === x.countryName).length > 0),
        groupBy(x => x.countryName),
        mergeMap(x => x.pipe(toArray())),
        map(x => {
          return {
            label: x[0].countryName,
            data: this.mapLineChart(x)
          } as ChartDataSets;
        })
      ).subscribe(item => {
        const filtered = this.lineChartData.filter(x => x.label === item.label);
        if (filtered && filtered.length > 0) {
          filtered[0].data = item.data;
        } else {
          this.lineChartData.push(item);
          this.chart?.updateColors();
        }
        this.loaded = true;
      });
  }

  mapLineChart(registries: Array<IAppDatasource>): Array<number> {
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

  checkboxLabel(row?: IAppDatasource): string {
    if (!row) {
      return `${this.isAllSelected() ? 'select' : 'deselect'} all`;
    }
    return `${this.selection.isSelected(row) ? 'deselect' : 'select'} row ${row.countryName}`;
  }

  sliderChange(e: MatSliderChange) {
    this.timeMovement(e.value);
  }

  playClick() {
    let increment = 0;
    this.playSub = interval(10000 / this.maxSliderValue).subscribe(() => {
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
    this.lineChartData = [];
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
