import { OpenCovid } from './open-covid';
import * as moment from 'moment';

export interface OpenCovidForecast extends OpenCovid {
  ForecastDate: moment.Moment;
}
