import { OpenCovidBase } from './open-covid-base';

export interface OpenCovidCategories extends OpenCovidBase {
  NewCases: number;
  NewDeaths: number;
  NewMild: number;
  NewSevere: number;
  NewCritical: number;
  CurrentlyMild: number;
  CurrentlySevere: number;
  CurrentlyCritical: number;
}
