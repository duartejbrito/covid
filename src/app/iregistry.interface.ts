import { IRegistryCountry } from './iregistry-country.interface';
import * as moment from 'moment';

export interface IRegistry {
  date: moment.Moment;
  location: string;
  newCases: number;
  newDeaths: number;
  totalCases: number;
  totalDeaths: number;
  population: number;
  totalCasesByPopulation: number;
  country: IRegistryCountry;
}
