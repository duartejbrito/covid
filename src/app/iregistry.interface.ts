import { IRegistryCountry } from './iregistry-country.interface';

export interface IRegistry {
  date: Date;
  location: string;
  newCases: number;
  newDeaths: number;
  totalCases: number;
  totalDeaths: number;
  country?: IRegistryCountry;
}
