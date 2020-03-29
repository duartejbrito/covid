import { OpenCovidBase } from './open-covid-base';

export interface OpenCovid extends OpenCovidBase {
  Confirmed: number;
  Deaths: number;
  Latitude: number;
  Longitude: number;
  Population: number;
}
