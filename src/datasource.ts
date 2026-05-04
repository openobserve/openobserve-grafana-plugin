import {
  DataQueryRequest,
  DataQueryResponse,
  DataSourceApi,
  DataSourceInstanceSettings,
  QueryFixAction,
  DataSourceWithSupplementaryQueriesSupport,
  SupplementaryQueryType,
  SupplementaryQueryOptions,
  LogLevel,
  CustomVariableSupport,
} from '@grafana/data';
import { Observable, from } from 'rxjs';
import { getBackendSrv, getTemplateSrv } from '@grafana/runtime';
import { queryLogsVolume } from './features/log/LogsModel';

import { MyQuery, MyDataSourceOptions, CachedQuery, VariableQuery } from './types';
import { VariableQueryEditor } from './components/VariableQueryEditor';
import { logsErrorMessage, getConsumableTime } from 'utils/zincutils';
import { getOrganizations } from 'services/organizations';
import { cloneDeep } from 'lodash';
import { getGraphDataFrame, getLogsDataFrame } from 'features/log/queryResponseBuilder';
import { buildQuery } from './features/query/queryBuilder';

const REF_ID_STARTER_LOG_VOLUME = 'log-volume-';

export class DataSource
  extends DataSourceApi<MyQuery, MyDataSourceOptions>
  implements DataSourceWithSupplementaryQueriesSupport<MyQuery>
{
  instanceSettings?: DataSourceInstanceSettings<MyDataSourceOptions>;
  url: string;
  streamFields: any[];
  cachedLogsQuery: CachedQuery;
  cachedHistogramQuery: CachedQuery;
  timestampColumn: string;
  histogramQuery: any;
  histogramTimestampColumn: string;

  constructor(instanceSettings: DataSourceInstanceSettings<MyDataSourceOptions>) {
    super(instanceSettings);
    this.url = instanceSettings.url || '';
    this.instanceSettings = instanceSettings;
    this.streamFields = [];
    this.cachedLogsQuery = {
      requestQuery: '',
      isFetching: false,
      data: null,
      promise: null,
    };
    this.cachedHistogramQuery = {
      requestQuery: '',
      isFetching: false,
      data: null,
      promise: null,
    };
    this.timestampColumn = instanceSettings.jsonData.timestamp_column;
    this.histogramQuery = null;
    this.histogramTimestampColumn = "zo_sql_key"; // In histogram query response, we get zo_sql_key as timestamp column by default. Changing this will break things.
    this.variables = new VariableSupport(this);
  }

  applyTemplateVariables(query: MyQuery, scopedVars: any): MyQuery {
    return {
      ...query,
      query: getTemplateSrv().replace(query.query || '', scopedVars),
    };
  }

  /**
   * Main query method that processes data queries for logs and histograms
   * Handles caching, different query types (volume, dashboard, logs), and error scenarios
   */
  async query(options: DataQueryRequest<MyQuery>): Promise<DataQueryResponse> {
    const timestamps = getConsumableTime(options.range);
    const interpolatedTargets = options.targets.map((target) => {
      return this.applyTemplateVariables(target, options.scopedVars);
    });

    const promises = interpolatedTargets.map((target) => {
      return this.processSingleQuery(target, timestamps, options);
    });

    return Promise.all(promises).then((data) => {
      return { data: data || [] };
    });
  }

  /**
   * Processes a single query target with caching, query type detection, and appropriate routing
   * Handles histogram queries, volume queries, dashboard queries, and regular logs queries
   */
  private processSingleQuery(target: MyQuery, timestamps: any, options: DataQueryRequest<MyQuery>): Promise<any> {
    const isHistogramQuery = target?.refId?.includes(REF_ID_STARTER_LOG_VOLUME);
    let reqData = buildQuery(target, timestamps, this.streamFields, options.app, this.timestampColumn);

    // Handle histogram query data preparation
    if (!target.refId?.includes(REF_ID_STARTER_LOG_VOLUME)) {
      this.histogramQuery = reqData;
    } else if (target.refId?.includes(REF_ID_STARTER_LOG_VOLUME) && this.histogramQuery) {
      reqData = this.histogramQuery;
      reqData.query.sql_mode = 'context';
      delete reqData.query.size;
    }

    // Handle cache management
    const { currentCache, shouldUseCachedData } = this.handleCacheManagement(target, reqData, options, isHistogramQuery);

    if (shouldUseCachedData) {
      return this.processCachedDataResponse(target, options, currentCache.data);
    }

    // Route to appropriate query processor based on context
    if (target?.refId?.includes(REF_ID_STARTER_LOG_VOLUME) || options.app === 'panel-editor' || options.app === 'dashboard') {
      return this.processVolumeOrDashboardQuery(target, reqData, options, currentCache);
    }

    // Process regular logs queries
    return this.processLogsQuery(target, reqData, currentCache);
  }

  doRequest(target: any, data: any) {
    const searchType = 'ui';
    const useCache = true;
    const pageType = 'logs';

    const url =
      this.url + `/api/${target.organization}/_search?type=${pageType}&search_type=${searchType}&use_cache=${useCache}`;

    return getBackendSrv().post(url, data, {
      showErrorAlert: false,
    });
  }

  doPartitionRequest(target: any, data: any) {
    const pageType = 'logs';
    const enableAlignHistogram = true;

    const url =
      this.url +
      `/api/${target.organization}/_search_partition?type=${pageType}&enable_align_histogram=${enableAlignHistogram}`;

    return getBackendSrv().post(url, data, {
      showErrorAlert: false,
    });
  }

  doHistogramRequest(target: any, data: any, app = 'logs') {
    const isDashboardRequest =  app === 'panel-editor' ||  app === 'dashboard';

    const searchType = isDashboardRequest ? 'dashboards' : 'ui';
    const useCache = true;
    const pageType = 'logs';

    const url =
      this.url +
      `/api/${target.organization}/_search?type=${pageType}&search_type=${searchType}&use_cache=${useCache}&is_ui_histogram=${!isDashboardRequest}`;

    return getBackendSrv().post(url, data, {
      showErrorAlert: false,
    });
  }

  resetHistogramQueryCache() {
    this.cachedHistogramQuery = {
      requestQuery: '',
      isFetching: false,
      data: null,
      promise: null,
    };
  }

  resetLogsQueryCache() {
    this.cachedLogsQuery = {
      requestQuery: '',
      isFetching: false,
      data: null,
      promise: null,
    };
  }

  /**
   * Handles cache lookup and initialization for query requests
   * Returns the cached data if available, otherwise sets up a new cache entry
   */
  private handleCacheManagement(target: MyQuery, reqData: any, options: DataQueryRequest<MyQuery>, isHistogramQuery: boolean): { currentCache: CachedQuery, shouldUseCachedData: boolean } {
    let currentCache = isHistogramQuery ? this.cachedHistogramQuery : this.cachedLogsQuery;

    const cacheKey = JSON.stringify({
      reqData,
      displayMode: target.displayMode ?? 'auto',
      type: target.refId,
    });

    // Check if we have cached data for this query
    if (cacheKey === currentCache.requestQuery && currentCache.data) {
      return { currentCache, shouldUseCachedData: true };
    }

    // Reset appropriate cache and set up new promise
    if (target?.refId?.includes(REF_ID_STARTER_LOG_VOLUME)) {
      this.resetHistogramQueryCache();
    } else {
      this.resetLogsQueryCache();
    }

    currentCache = isHistogramQuery ? this.cachedHistogramQuery : this.cachedLogsQuery;

    currentCache.data = new Promise((resolve, reject) => {
      currentCache.promise = { resolve, reject };
    });

    currentCache.requestQuery = cacheKey;
    currentCache.isFetching = true;

    return { currentCache, shouldUseCachedData: false };
  }

  /**
   * Processes cached data response based on query type and display mode
   * Returns the appropriate data frame for the query context
   */
  private processCachedDataResponse(target: MyQuery, options: DataQueryRequest<MyQuery>, cachedData: any): any {
    return cachedData?.then((res: any) => {
      const mode = target.displayMode || 'auto';
      if (target?.refId?.includes(REF_ID_STARTER_LOG_VOLUME)) {
        return res;
      }
      if (options.app === 'panel-editor' || options.app === 'dashboard') {
        if (mode === 'graph' || mode === 'auto') {
          return res;
        }
      }
      return res;
    });
  }

  /**
   * Creates appropriate data frame based on display mode and query type
   * Returns either graph or logs data frame with proper caching
   */
  private createDataFrame(hits: any[], target: MyQuery, options: DataQueryRequest<MyQuery>, currentCache: CachedQuery): any {
    const mode = target.displayMode || 'auto';

    if (mode === 'graph' || target?.refId?.includes(REF_ID_STARTER_LOG_VOLUME) || options.app === 'panel-editor' || options.app === 'dashboard') {
      const graphDf = getGraphDataFrame(hits, target, options.app, this.histogramTimestampColumn);
      currentCache.promise?.resolve(graphDf);
      return graphDf;
    } else {
      const logsDf = getLogsDataFrame(hits, target, this.streamFields, this.timestampColumn);
      currentCache.promise?.resolve(logsDf);
      return logsDf;
    }
  }

  /**
   * Handles error scenarios and creates appropriate empty data frames
   * Resolves the cache promise with empty data and returns the data frame
   */
  private handleQueryError(target: MyQuery, options: DataQueryRequest<MyQuery>, currentCache: CachedQuery, error?: any, timestampColumn?: string): any {
    if (error) {
      console.error('Partition or histogram request failed:', error);
    }

    const mode = target.displayMode || 'auto';
    if (mode === 'graph' || target?.refId?.includes(REF_ID_STARTER_LOG_VOLUME) || options.app === 'panel-editor' || options.app === 'dashboard') {
      const graphDf = getGraphDataFrame([], target, options.app, this.histogramTimestampColumn);
      currentCache.promise?.resolve(graphDf);
      return graphDf;
    } else {
      const logsDf = getLogsDataFrame([], target, this.streamFields, this.timestampColumn);
      currentCache.promise?.resolve(logsDf);
      return logsDf;
    }
  }

  /**
   * Processes partition response and executes histogram requests for each partition
   * Combines results from multiple partitions into a single response
   */
  private processPartitionResponse(target: MyQuery, reqData: any, options: DataQueryRequest<MyQuery>, currentCache: CachedQuery, partitionResponse: any): Promise<any> {
    // Check if partitions are available
    if (partitionResponse?.partitions?.length > 0) {
      const partitions = partitionResponse.partitions;

      // Handle non-histogram eligible queries
      if (!partitionResponse.is_histogram_eligible) {
        return Promise.resolve(this.createDataFrame([], target, options, currentCache));
      }

      // Create histogram requests for each partition
      const histogramPromises = partitions.map((partition: any) => {
        const partitionHistogramQuery = {
          ...reqData,
          query: {
            ...reqData.query,
            start_time: partition[0],
            end_time: partition[1],
            histogram_interval: partitionResponse.histogram_interval,
          },
        };

        return this.doHistogramRequest(target, partitionHistogramQuery, options.app);
      });

      // Combine results from all partitions
      return Promise.all(histogramPromises).then((histogramResponses) => {
        const combinedHits = histogramResponses.reduce((acc, response) => {
          return acc.concat(response.hits || []);
        }, []);

        return this.createDataFrame(combinedHits, target, options, currentCache);
      });
    } else {
      // Fallback to direct histogram request if no partitions
      return this.doHistogramRequest(target, reqData).then((histogramResponse) => {
        return this.createDataFrame(histogramResponse.hits, target, options, currentCache);
      });
    }
  }

  /**
   * Handles volume, panel-editor, or dashboard queries using partition + histogram flow
   * Manages the complete partition-based query process including error handling
   */
  private processVolumeOrDashboardQuery(target: MyQuery, reqData: any, options: DataQueryRequest<MyQuery>, currentCache: CachedQuery): Promise<any> {
    // Remove size parameter for partition queries
    if (reqData.query && reqData.query.hasOwnProperty('size')) {
      delete reqData.query.size;
    }

    return this.doPartitionRequest(target, reqData.query)
      .then((partitionResponse) => {
        return this.processPartitionResponse(target, reqData, options, currentCache, partitionResponse);
      })
      .catch((error) => {
        return this.handleQueryError(target, options, currentCache, error, this.timestampColumn);
      });
  }

  /**
   * Processes regular logs queries using the standard doRequest flow
   * Handles response processing and error scenarios for logs queries
   */
  private processLogsQuery(target: MyQuery, reqData: any, currentCache: CachedQuery): Promise<any> {
    return this.doRequest(target, reqData)
      .then((response) => {
        const logsDataFrame = getLogsDataFrame(response.hits, target, this.streamFields, this.timestampColumn);
        currentCache.promise?.resolve(logsDataFrame);
        return logsDataFrame;
      })
      .catch((err) => {
        currentCache.promise?.reject(err);
        let error = {
          message: '',
          detail: '',
        };

        if (err.data) {
          error.message = err.data?.message;
          error.detail = err.data?.error_detail;
        } else {
          error.message = err.statusText;
        }

        const customMessage = logsErrorMessage(err.data.code);
        if (customMessage) {
          error.message = customMessage;
        }

        throw new Error(error.message + (error.detail ? ` ( ${error.detail} ) ` : ''));
      })
      .finally(() => {
        currentCache.isFetching = false;
      });
  }

  async testDatasource() {
    return getOrganizations({ url: this.url })
      .then((res) => {
        return {
          status: 'success',
          message: 'Data source successfully connected.',
        };
      })
      .catch((error) => {
        const info: string = error?.data?.message ?? '';
        const infoInParentheses = info !== '' ? ` (${info})` : '';
        return {
          status: 'error',
          message: `Unable to connect OpenObserve ${infoInParentheses}. Verify that OpenObserve is correctly configured`,
        };
      });
  }

  modifyQuery(query: MyQuery, action: QueryFixAction): any {
    if (!action.options) {
      return query;
    }

    let expression = query.query ?? '';
    switch (action.type) {
      case 'ADD_FILTER': {
        if (expression.length > 0) {
          expression += ' and ';
        }
        expression += `${action.options.key}='${action.options.value}'`;
        break;
      }
      case 'ADD_FILTER_OUT': {
        if (expression.length > 0) {
          expression += ' and ';
        }
        expression += `${action.options.key}!='${action.options.value}'`;
        break;
      }
    }
    return { ...query, query: expression };
  }

  updateStreamFields(streamFields: any[]) {
    this.streamFields = [...streamFields];
  }

  getDataProvider(
    type: SupplementaryQueryType,
    request: DataQueryRequest<MyQuery>
  ): Observable<DataQueryResponse> | undefined {
    if (!this.getSupportedSupplementaryQueryTypes().includes(type)) {
      return undefined;
    }

    switch (type) {
      case SupplementaryQueryType.LogsVolume:
        return this.getLogsVolumeDataProvider(request);
      default:
        return undefined;
    }
  }

  getSupportedSupplementaryQueryTypes(): SupplementaryQueryType[] {
    return [SupplementaryQueryType.LogsVolume];
    // return [SupplementaryQueryType.LogsVolume, SupplementaryQueryType.LogsSample];
  }

  getSupplementaryQuery(options: SupplementaryQueryOptions, originalQuery: MyQuery): MyQuery | undefined {
    return undefined;
  }

  getLogsVolumeDataProvider(request: DataQueryRequest<MyQuery>): Observable<DataQueryResponse> | undefined {
    const logsVolumeRequest = cloneDeep(request);
    const targets = logsVolumeRequest.targets.map((target) => {
      target['refId'] = REF_ID_STARTER_LOG_VOLUME + target.refId;
      return target;
    });

    if (!targets.length) {
      return undefined;
    }

    return queryLogsVolume(
      this,
      { ...logsVolumeRequest, targets },
      {
        extractLevel: () => LogLevel.unknown,
        range: logsVolumeRequest.range,
        targets: logsVolumeRequest.targets,
      }
    );
  }
}

class VariableSupport extends CustomVariableSupport<DataSource, VariableQuery, MyQuery, MyDataSourceOptions> {
  editor = VariableQueryEditor;

  constructor(private ds: DataSource) {
    super();
  }

  query = (request: DataQueryRequest<VariableQuery>): Observable<DataQueryResponse> => {
    return from(this.executeQuery(request));
  };

  private async executeQuery(request: DataQueryRequest<VariableQuery>): Promise<DataQueryResponse> {
    const target = request.targets[0];
    if (!target?.organization || !target?.query) {
      return { data: [] };
    }

    const now = Date.now() * 1000;
    const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000 * 1000;

    try {
      const response = await this.ds.doRequest({ organization: target.organization }, {
        query: { sql: target.query, start_time: thirtyDaysAgo, end_time: now, size: 500 },
      });

      const hits: any[] = response.hits || [];
      if (hits.length === 0) { return { data: [] }; }

      const firstKey = Object.keys(hits[0])[0];
      // Return MetricFindValue objects directly — Grafana's variable runner accepts these
      // in DataQueryResponse.data without needing DataFrame processing
      const data = hits
        .map((hit) => hit[firstKey])
        .filter((v) => v !== undefined && v !== null)
        .map((v) => ({ text: String(v), value: String(v) }));

      return { data };
    } catch {
      return { data: [] };
    }
  }
}
