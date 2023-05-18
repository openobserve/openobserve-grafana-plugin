import { groupBy } from 'lodash';
import { from, isObservable, Observable, ObservableInput } from 'rxjs';

import {
  AbsoluteTimeRange,
  DataFrame,
  DataQuery,
  DataQueryRequest,
  DataQueryResponse,
  DataSourceApi,
  DataSourceJsonData,
  getTimeField,
  LoadingState,
  FieldColorModeId,
  LogLevel,
  LogRowModel,
  LogsVolumeCustomMetaData,
  LogsVolumeType,
  sortDataFrame,
  TimeRange,
  FieldType,
  toDataFrame,
} from '@grafana/data';
import { BarAlignment, GraphDrawStyle, StackingMode } from '@grafana/schema';
import { colors } from '@grafana/ui';

export const LIMIT_LABEL = 'Line limit';
export const COMMON_LABELS = 'Common labels';

// const MILLISECOND = 1;
// const SECOND = 1000 * MILLISECOND;
// const MINUTE = 60 * SECOND;
// const HOUR = 60 * MINUTE;
// const DAY = 24 * HOUR;

export const LogLevelColor = {
  [LogLevel.critical]: colors[7],
  [LogLevel.warning]: colors[1],
  [LogLevel.error]: colors[4],
  [LogLevel.info]: colors[0],
  [LogLevel.debug]: colors[5],
  [LogLevel.trace]: colors[2],
  [LogLevel.unknown]: colors[2],
};

export function filterLogLevels(logRows: LogRowModel[], hiddenLogLevels: Set<LogLevel>): LogRowModel[] {
  if (hiddenLogLevels.size === 0) {
    return logRows;
  }

  return logRows.filter((row: LogRowModel) => {
    return !hiddenLogLevels.has(row.logLevel);
  });
}

/**
 * Convert dataFrame into LogsModel which consists of creating separate array of log rows and metrics series. Metrics
 * series can be either already included in the dataFrame or will be computed from the log rows.
 * @param dataFrame
 * @param intervalMs Optional. In case there are no metrics series, we use this for computing it from log rows.
 * @param absoluteRange Optional. Used to store absolute range of executed queries in logs model. This is used for pagination.
 * @param queries Optional. Used to store executed queries in logs model. This is used for pagination.
 */

/**
 * Returns a clamped time range and interval based on the visible logs and the given range.
 *
 * @param sortedRows Log rows from the query response
 * @param intervalMs Dynamic data interval based on available pixel width
 * @param absoluteRange Requested time range
 * @param pxPerBar Default: 20, buckets will be rendered as bars, assuming 10px per histogram bar plus some free space around it
 */
export function getSeriesProperties(
  sortedRows: LogRowModel[],
  intervalMs: number,
  absoluteRange?: AbsoluteTimeRange,
  pxPerBar = 20,
  minimumBucketSize = 1000
) {
  let visibleRange = absoluteRange;
  let resolutionIntervalMs = intervalMs;
  let bucketSize = Math.max(resolutionIntervalMs * pxPerBar, minimumBucketSize);
  let visibleRangeMs;
  let requestedRangeMs;
  // Clamp time range to visible logs otherwise big parts of the graph might look empty
  if (absoluteRange) {
    const earliestTsLogs = sortedRows[0].timeEpochMs;

    requestedRangeMs = absoluteRange.to - absoluteRange.from;
    visibleRangeMs = absoluteRange.to - earliestTsLogs;

    if (visibleRangeMs > 0) {
      // Adjust interval bucket size for potentially shorter visible range
      const clampingFactor = visibleRangeMs / requestedRangeMs;
      resolutionIntervalMs *= clampingFactor;
      // Minimum bucketsize of 1s for nicer graphing
      bucketSize = Math.max(Math.ceil(resolutionIntervalMs * pxPerBar), minimumBucketSize);
      // makeSeriesForLogs() aligns dataspoints with time buckets, so we do the same here to not cut off data
      const adjustedEarliest = Math.floor(earliestTsLogs / bucketSize) * bucketSize;
      visibleRange = { from: adjustedEarliest, to: absoluteRange.to };
    } else {
      // We use visibleRangeMs to calculate range coverage of received logs. However, some data sources are rounding up range in requests. This means that received logs
      // can (in edge cases) be outside of the requested range and visibleRangeMs < 0. In that case, we want to change visibleRangeMs to be 1 so we can calculate coverage.
      visibleRangeMs = 1;
    }
  }
  return { bucketSize, visibleRange, visibleRangeMs, requestedRangeMs };
}

type LogsVolumeQueryOptions<T extends DataQuery> = {
  extractLevel: (dataFrame: DataFrame) => LogLevel;
  targets: T[];
  range: TimeRange;
};

/**
 * Creates an observable, which makes requests to get logs volume and aggregates results.
 */
export function queryLogsVolume<TQuery extends DataQuery, TOptions extends DataSourceJsonData>(
  datasource: DataSourceApi<TQuery, TOptions>,
  logsVolumeRequest: DataQueryRequest<TQuery>,
  options: LogsVolumeQueryOptions<TQuery>
): Observable<DataQueryResponse> {
  return new Observable((observer) => {
    let logsVolumeData: DataFrame[] = [];
    observer.next({
      state: LoadingState.Loading,
      error: undefined,
      data: [],
    });

    console.log(logsVolumeRequest);

    const queryResponse = datasource.query(logsVolumeRequest);

    let queryObservable: Observable<DataQueryResponse>;

    if (isObservable(queryResponse)) {
      queryObservable = queryResponse as Observable<DataQueryResponse>;
    } else {
      queryObservable = from(queryResponse as ObservableInput<DataQueryResponse>);
    }
    console.log(queryObservable);
    const subscription = queryObservable.subscribe({
      complete: () => {
        console.log('complete');
        observer.complete();
      },
      next: (dataQueryResponse: DataQueryResponse) => {
        const { error } = dataQueryResponse;
        console.log(dataQueryResponse);
        if (error !== undefined) {
          observer.next({
            state: LoadingState.Error,
            error,
            data: [],
          });
          observer.error(error);
        } else {
          const framesByRefId = groupBy(dataQueryResponse.data, 'refId');
          console.log('frames by ref id', framesByRefId, options);

          logsVolumeData = dataQueryResponse.data.map((dataFrame) => {
            let sourceRefId = dataFrame.refId || '';
            if (sourceRefId.startsWith('log-volume-')) {
              sourceRefId = sourceRefId.substr('log-volume-'.length);
            }

            const logsVolumeCustomMetaData: LogsVolumeCustomMetaData = {
              logsVolumeType: LogsVolumeType.FullRange,
              absoluteRange: { from: options.range.from.valueOf(), to: options.range.to.valueOf() },
              datasourceName: datasource.name,
              sourceQuery: options.targets.find((dataQuery) => dataQuery.refId === sourceRefId)!,
            };

            dataFrame.meta = {
              ...dataFrame.meta,
              custom: {
                ...dataFrame.meta?.custom,
                ...logsVolumeCustomMetaData,
              },
            };
            return updateLogsVolumeConfig(dataFrame, options.extractLevel, framesByRefId[dataFrame.refId].length === 1);
          });

          console.log(logsVolumeData);

          observer.next({
            state: dataQueryResponse.state,
            error: undefined,
            data: logsVolumeData,
          });
        }
      },
      error: (error) => {
        console.log(error);
        observer.next({
          state: LoadingState.Error,
          error: error,
          data: logsVolumeData,
        });
        observer.error(error);
      },
    });
    return () => {
      subscription?.unsubscribe();
    };
  });
}

/**
 * Creates an observable, which makes requests to get logs sample.
 */
export function queryLogsSample<TQuery extends DataQuery, TOptions extends DataSourceJsonData>(
  datasource: DataSourceApi<TQuery, TOptions>,
  logsSampleRequest: DataQueryRequest<TQuery>
): Observable<DataQueryResponse> {
  logsSampleRequest.hideFromInspector = true;

  return new Observable((observer) => {
    let rawLogsSample: DataFrame[] = [];
    observer.next({
      state: LoadingState.Loading,
      error: undefined,
      data: [],
    });

    const queryResponse = datasource.query(logsSampleRequest);

    let queryObservable: Observable<DataQueryResponse>;

    if (isObservable(queryResponse)) {
      queryObservable = queryResponse as Observable<DataQueryResponse>;
    } else {
      queryObservable = from(queryResponse as ObservableInput<DataQueryResponse>);
    }

    const subscription = queryObservable.subscribe({
      complete: () => {
        observer.next({
          state: LoadingState.Done,
          error: undefined,
          data: rawLogsSample,
        });
        observer.complete();
      },
      next: (dataQueryResponse: DataQueryResponse) => {
        const { error } = dataQueryResponse;
        if (error !== undefined) {
          observer.next({
            state: LoadingState.Error,
            error,
            data: [],
          });
          observer.error(error);
        } else {
          rawLogsSample = dataQueryResponse.data.map((dataFrame) => {
            const frame = toDataFrame(dataFrame);
            const { timeIndex } = getTimeField(frame);
            return sortDataFrame(frame, timeIndex);
          });
        }
      },
      error: (error) => {
        observer.next({
          state: LoadingState.Error,
          error: error,
          data: [],
        });
        observer.error(error);
      },
    });
    return () => {
      subscription?.unsubscribe();
    };
  });
}

const updateLogsVolumeConfig = (
  dataFrame: DataFrame,
  extractLevel: (dataFrame: DataFrame) => LogLevel,
  oneLevelDetected: boolean
): DataFrame => {
  dataFrame.fields = dataFrame.fields.map((field) => {
    if (field.type === FieldType.number) {
      field.config = {
        ...field.config,
        ...getLogVolumeFieldConfig(extractLevel(dataFrame), oneLevelDetected),
      };
    }
    return field;
  });
  return dataFrame;
};

function getLogVolumeFieldConfig(level: LogLevel, oneLevelDetected: boolean) {
  const name = oneLevelDetected && level === LogLevel.unknown ? 'logs' : level;
  const color = LogLevelColor[level];
  return {
    displayNameFromDS: name,
    color: {
      mode: FieldColorModeId.Fixed,
      fixedColor: color,
    },
    custom: {
      drawStyle: GraphDrawStyle.Bars,
      barAlignment: BarAlignment.Center,
      lineColor: color,
      pointColor: color,
      fillColor: color,
      lineWidth: 1,
      fillOpacity: 100,
      stacking: {
        mode: StackingMode.Normal,
        group: 'A',
      },
    },
  };
}
// function getIntervalInfo(scopedVars: ScopedVars, timespanMs: number): { interval: string; intervalMs?: number } {
//   if (scopedVars.__interval_ms) {
//     let intervalMs: number = scopedVars.__interval_ms.value;
//     let interval = '';
//     // below 5 seconds we force the resolution to be per 1ms as interval in scopedVars is not less than 10ms
//     if (timespanMs < SECOND * 5) {
//       intervalMs = MILLISECOND;
//       interval = '1ms';
//     } else if (intervalMs > HOUR) {
//       intervalMs = DAY;
//       interval = '1d';
//     } else if (intervalMs > MINUTE) {
//       intervalMs = HOUR;
//       interval = '1h';
//     } else if (intervalMs > SECOND) {
//       intervalMs = MINUTE;
//       interval = '1m';
//     } else {
//       intervalMs = SECOND;
//       interval = '1s';
//     }

//     return { interval, intervalMs };
//   } else {
//     return { interval: '$__interval' };
//   }
// }
