import { CsvMapProfile } from './csv-map-profile';

export interface CsvProfile {
  skipFirstLine: boolean;
  maps: CsvMapProfile[];
}
