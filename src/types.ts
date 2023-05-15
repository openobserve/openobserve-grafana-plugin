import { DataQuery, DataSourceJsonData } from '@grafana/data';

export interface MyQuery extends DataQuery {
  query: string;
  constant: number;
  stream?: string;
  startTimeInMicro?: number;
  endTimeInMicro?: number;
  sqlMode: boolean;
  pagination?: {
    rows: number;
  };
  streamFields: any[];
}

export const DEFAULT_QUERY: Partial<MyQuery> = {
  constant: 6.5,
};

/**
 * These are options configured for each DataSource instance
 */
export interface MyDataSourceOptions extends DataSourceJsonData {
  path?: string;
  url: string;
}

/**
 * Value that is used in the backend, but never sent over HTTP to the frontend
 */
export interface MySecureJsonData {
  apiKey?: string;
}

export interface TimeRange {
  startTimeInMicro: number;
  endTimeInMirco: number;
}
