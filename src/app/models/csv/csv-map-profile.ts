import * as moment from 'moment';

type CsvMapProfileType = 'Moment' | 'string' | 'number' | 'boolean';
type CsvMapProfileFormat = (item: any, map: CsvMapProfile, currentLine: string[]) => moment.Moment | string | number | boolean;

export interface CsvMapProfile {
  index: number;
  property: number | string;
  type: CsvMapProfileType;
  format?: CsvMapProfileFormat;
}
