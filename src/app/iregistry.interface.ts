import { IRegistryCountry } from './iregistry-country.interface';
import * as moment from 'moment';

export interface IRegistry {
  date: moment.Moment;
  location: string;
  matchingLocation: string;
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
  country: IRegistryCountry;
}
