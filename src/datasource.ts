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
import { queryLogsVolume } from './features/logs/LogsModel';

import { MyQuery, MyDataSourceOptions } from './types';
import { logsErrorMessage, getConsumableTime } from 'utils/zincutils';
import { getOrganizations } from 'services/organizations';
import { cloneDeep } from 'lodash';
import { getGraphDataFrame, getLogsDataFrame } from 'features/logs/queryResponseBuilder';
import { buildQuery } from './features/query/queryBuilder';

const REF_ID_STARTER_LOG_VOLUME = 'log-volume-';

export class DataSource
  extends DataSourceApi<MyQuery, MyDataSourceOptions>
  implements DataSourceWithSupplementaryQueriesSupport<MyQuery>
{
  instanceSettings?: DataSourceInstanceSettings<MyDataSourceOptions>;
  url: string;
  streamFields: any[];

  constructor(instanceSettings: DataSourceInstanceSettings<MyDataSourceOptions>) {
    super(instanceSettings);
    this.url = instanceSettings.url || '';
    this.instanceSettings = instanceSettings;
    this.streamFields = [];
  }

  async query(options: DataQueryRequest<MyQuery>): Promise<DataQueryResponse> {
    const timestamps = getConsumableTime(options.range);
    const promises = options.targets.map((target) => {
      const reqData = buildQuery(target, timestamps, this.streamFields);
      return this.doRequest(target, reqData)
        .then((response) => {
          if (target?.refId?.includes(REF_ID_STARTER_LOG_VOLUME)) {
            return getGraphDataFrame(response, target);
          }
          return getLogsDataFrame(response, target, this.streamFields);
        })
        .catch((err) => {
          console.log(err);
          let error = '';
          if (err.response !== undefined) {
            error = err.response.data.error;
          } else {
            error = err.message;
          }

          const customMessage = logsErrorMessage(err.response.data.code);
          if (customMessage) {
            error = customMessage;
          }
          throw new Error(error);
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
