import * as moment from 'moment';

export interface IAppDatasource {
  date: moment.Moment;

  countryCode: string;
  countryName: string;
  flag: string;
  region: string;
  population: number;
  area: number;
  latitude: number;
  longitude: number;

  newCases: number;
  newDeaths: number;
  totalCases: number;
  totalDeaths: number;

  totalCasesByPopulation: number;
  totalDeathsByPopulation: number;
  totalCasesByArea: number;
  totalDeathsByArea: number;
}
