import * as moment from 'moment';

export interface OpenCovidBase {
  Date: moment.Moment;
  CountryCode: string;
  CountryName: string;
  RegionCode: string;
  RegionName: string;
}
