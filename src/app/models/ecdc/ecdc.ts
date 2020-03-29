import * as moment from 'moment';

export interface Ecdc {
  date: moment.Moment;
  location: string;
  newCases: number;
  newDeaths: number;
  totalCases: number;
  totalDeaths: number;
  population: number;
  totalCasesByPopulation: number;
  totalDeathsByPopulation: number;
  area: number;
  totalCasesByArea: number;
  totalDeathsByArea: number;
}
