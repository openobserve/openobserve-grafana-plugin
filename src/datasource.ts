import {
  DataQueryRequest,
  DataQueryResponse,
  DataSourceApi,
  DataSourceInstanceSettings,
  QueryFixAction,
  DataSourceWithSupplementaryQueriesSupport,
  SupplementaryQueryType,
  LogLevel,
} from '@grafana/data';
import { Observable } from 'rxjs';
import { getBackendSrv } from '@grafana/runtime';
import { queryLogsVolume } from './features/log/LogsModel';

import { MyQuery, MyDataSourceOptions, CachedQuery } from './types';
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
  cachedQuery: CachedQuery;

  constructor(instanceSettings: DataSourceInstanceSettings<MyDataSourceOptions>) {
    super(instanceSettings);
    this.url = instanceSettings.url || '';
    this.instanceSettings = instanceSettings;
    this.streamFields = [];
    this.cachedQuery = {
      requestQuery: '',
      isFetching: false,
      data: null,
      promise: null,
    };
  }

  async query(options: DataQueryRequest<MyQuery>): Promise<DataQueryResponse> {
    const timestamps = getConsumableTime(options.range);
    const promises = options.targets.map((target) => {
      if (!this.cachedQuery.data) {
        this.cachedQuery.data = new Promise((resolve, reject) => {
          this.cachedQuery.promise = {
            resolve,
            reject,
          };
        });
      }
      const reqData = buildQuery(target, timestamps, this.streamFields);
      if (JSON.stringify(reqData) === this.cachedQuery.requestQuery) {
        return this.cachedQuery.data
          ?.then((res) => {
            if (target?.refId?.includes(REF_ID_STARTER_LOG_VOLUME)) {
              return res.graph;
            }
            return res.logs;
          })
          .finally(() => {
            this.resetQueryCache();
          });
      }
      this.cachedQuery.requestQuery = JSON.stringify(reqData);
      this.cachedQuery.isFetching = true;
      return this.doRequest(target, reqData)
        .then((response) => {
          const graphDataFrame = getGraphDataFrame(response, target);
          const logsDataFrame = getLogsDataFrame(response, target, this.streamFields);
          this.cachedQuery.promise?.resolve({ graph: graphDataFrame, logs: logsDataFrame });
          if (target?.refId?.includes(REF_ID_STARTER_LOG_VOLUME)) {
            return graphDataFrame;
          }
          return logsDataFrame;
        })
        .catch((err) => {
          this.cachedQuery.promise?.reject(err);
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
          this.cachedQuery.isFetching = false;
        });
    });

    return Promise.all(promises).then((data) => {
      return { data: data || [] };
    });
  }

  doRequest(target: any, data: any) {
    return getBackendSrv().post(this.url + `/api/${target.organization}/_search?type=logs`, data, {
      showErrorAlert: false,
    });
  }

  resetQueryCache() {
    this.cachedQuery = {
      requestQuery: '',
      isFetching: false,
      data: null,
      promise: null,
    };
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
          message: `Unable to connect ZincObserve ${infoInParentheses}. Verify that ZincObserve is correctly configured`,
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

  getSupplementaryQuery(type: SupplementaryQueryType, query: MyQuery): MyQuery | undefined {
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
