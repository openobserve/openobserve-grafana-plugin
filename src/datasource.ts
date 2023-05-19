import {
  DataQueryRequest,
  DataQueryResponse,
  DataSourceApi,
  DataSourceInstanceSettings,
  MutableDataFrame,
  FieldType,
  QueryFixAction,
  DataSourceWithSupplementaryQueriesSupport,
  SupplementaryQueryType,
  LogLevel,
} from '@grafana/data';
import { Observable } from 'rxjs';
import { getBackendSrv } from '@grafana/runtime';
import { queryLogsVolume } from './LogsModel';

import { MyQuery, MyDataSourceOptions, TimeRange } from './types';
import { b64EncodeUnicode, convertTimeToMs, logsErrorMessage } from 'utils/zincutils';
import { getOrganizations } from 'services/organizations';
import { cloneDeep, isArray } from 'lodash';

export const REF_ID_STARTER_LOG_VOLUME = 'log-volume-';
export const REF_ID_STARTER_LOG_SAMPLE = 'log-sample-';

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

  getConsumableTime(range: any) {
    const startTimeInMicro: any = new Date(new Date(range!.from.valueOf()).toISOString()).getTime() * 1000;
    const endTimeInMirco: any = new Date(new Date(range!.to.valueOf()).toISOString()).getTime() * 1000;
    return {
      startTimeInMicro,
      endTimeInMirco,
    };
  }

  buildDataFrame(data: any, target: MyQuery) {
    const fieldsMapping: { [key: string]: FieldType } = {
      Utf8: FieldType.string,
      Int64: FieldType.number,
      timestamp: FieldType.time,
    };

    const logsData = new MutableDataFrame({
      refId: target.refId,
      meta: {
        preferredVisualisationType: 'logs',
      },
      fields: [],
    });

    const graphData = new MutableDataFrame({
      refId: target.refId,
      meta: {
        preferredVisualisationType: 'graph',
      },
      fields: [],
    });

    let fields = [];
    console.log(data);
    logsData.addField({
      config: {
        filterable: true,
      },
      name: 'Time',
      type: FieldType.time,
    });
    logsData.addField({
      name: 'Content',
      type: FieldType.string,
    });

    this.streamFields.forEach((field: any) => {
      fields.push({
        name: field.name,
        type: fieldsMapping[field.type],
      });
    });

    data.hits.forEach((log: any) => {
      logsData.add({ ...log, Content: JSON.stringify(log), Time: convertTimeToMs(log._timestamp) });
    });

    graphData.addField({
      config: {
        filterable: true,
      },
      name: 'Time',
      type: FieldType.time,
    });
    graphData.addField({
      name: 'Value',
      type: FieldType.number,
    });

    data.aggs?.histogram.forEach((log: any) => {
      let histDate = new Date(log.zo_sql_key + 'Z').getTime();
      graphData.add({ Time: histDate, Value: log.zo_sql_num });
    });

    return [logsData, graphData];
  }

  async query(options: DataQueryRequest<MyQuery>): Promise<DataQueryResponse> {
    console.log('query', options);
    const timestamps = this.getConsumableTime(options.range);
    const promises = options.targets.map((target) => {
      const reqData = this.buildQuery(target, timestamps);
      return this.doRequest(target, reqData)
        .then((response) => {
          console.log('target', target);
          return this.buildDataFrame(response, target)[target?.refId?.includes(REF_ID_STARTER_LOG_VOLUME) ? 1 : 0];
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

  buildQuery(queryData: MyQuery, timestamps: TimeRange) {
    try {
      let query: string = queryData.query || '';

      let req: any = {
        query: {
          sql: 'select * from "[INDEX_NAME]" [WHERE_CLAUSE]',
          start_time: timestamps.startTimeInMicro,
          end_time: timestamps.endTimeInMirco,
          size: 1000,
        },
        aggs: {
          histogram:
            'select histogram(' +
            '_timestamp' +
            ", '[INTERVAL]') AS zo_sql_key, count(*) AS zo_sql_num from query GROUP BY zo_sql_key ORDER BY zo_sql_key",
        },
      };

      if (timestamps.startTimeInMicro && timestamps.endTimeInMirco) {
        let chartKeyFormat = 'HH:mm:ss';

        req.query.start_time = timestamps.startTimeInMicro;
        req.query.end_time = timestamps.endTimeInMirco;

        let chartInterval = '1 second';

        const timeDifference = (timestamps.endTimeInMirco - timestamps.startTimeInMicro) / 1000;

        if (timeDifference >= 1000 * 60 * 5) {
          chartInterval = '3 second';
          chartKeyFormat = 'HH:mm:ss';
        }
        if (timeDifference >= 1000 * 60 * 10) {
          chartInterval = '5 second';
          chartKeyFormat = 'HH:mm:ss';
        }
        if (timeDifference >= 1000 * 60 * 20) {
          chartInterval = '10 second';
          chartKeyFormat = 'HH:mm:ss';
        }
        if (timeDifference >= 1000 * 60 * 30) {
          chartInterval = '15 second';
          chartKeyFormat = 'HH:mm:ss';
        }
        if (timeDifference >= 1000 * 60 * 60) {
          chartInterval = '30 second';
          chartKeyFormat = 'HH:mm:ss';
        }
        if (timeDifference >= 1000 * 3600 * 2) {
          chartInterval = '1 minute';
          chartKeyFormat = 'MM-DD HH:mm';
        }
        if (timeDifference >= 1000 * 3600 * 6) {
          chartInterval = '5 minute';
          chartKeyFormat = 'MM-DD HH:mm';
        }
        if (timeDifference >= 1000 * 3600 * 24) {
          chartInterval = '30 minute';
          chartKeyFormat = 'MM-DD HH:mm';
        }
        if (timeDifference >= 1000 * 86400 * 7) {
          chartInterval = '1 hour';
          chartKeyFormat = 'MM-DD HH:mm';
        }
        if (timeDifference >= 1000 * 86400 * 30) {
          chartInterval = '1 day';
          chartKeyFormat = 'YYYY-MM-DD';
        }
        console.log(chartInterval, chartKeyFormat);
        req.aggs.histogram = req.aggs.histogram.replaceAll('[INTERVAL]', chartInterval);
      } else {
        return false;
      }

      if (queryData.sqlMode) {
        req.query.sql = queryData.query;
      }

      if (!queryData.sqlMode) {
        let whereClause = query;

        if (query.trim().length) {
          whereClause = whereClause
            .replace(/=(?=(?:[^"']*"[^"']*"')*[^"']*$)/g, ' =')
            .replace(/>(?=(?:[^"']*"[^"']*"')*[^"']*$)/g, ' >')
            .replace(/<(?=(?:[^"']*"[^"']*"')*[^"']*$)/g, ' <');

          whereClause = whereClause
            .replace(/!=(?=(?:[^"']*"[^"']*"')*[^"']*$)/g, ' !=')
            .replace(/! =(?=(?:[^"']*"[^"']*"')*[^"']*$)/g, ' !=')
            .replace(/< =(?=(?:[^"']*"[^"']*"')*[^"']*$)/g, ' <=')
            .replace(/> =(?=(?:[^"']*"[^"']*"')*[^"']*$)/g, ' >=');

          const parsedSQL = whereClause.split(' ');
          this.streamFields.forEach((field: any) => {
            parsedSQL.forEach((node: any, index: any) => {
              if (node === field.name) {
                node = node.replaceAll('"', '');
                parsedSQL[index] = '"' + node + '"';
              }
            });
          });

          whereClause = parsedSQL.join(' ');

          req.query.sql = req.query.sql.replace('[WHERE_CLAUSE]', ' WHERE ' + whereClause);
        } else {
          req.query.sql = req.query.sql.replace('[WHERE_CLAUSE]', '');
        }

        req.query.sql = req.query.sql.replace('[INDEX_NAME]', queryData.stream);
      }

      req['encoding'] = 'base64';
      req.query.sql = b64EncodeUnicode(req.query.sql);
      req.aggs.histogram = b64EncodeUnicode(req.aggs.histogram);

      return req;
    } catch (e) {
      console.log('error in building query:', e);
    }
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
    return [SupplementaryQueryType.LogsVolume, SupplementaryQueryType.LogsSample];
  }

  getSupplementaryQuery(type: SupplementaryQueryType, query: MyQuery): MyQuery | undefined {
    if (!this.getSupportedSupplementaryQueryTypes().includes(type)) {
      return undefined;
    }

    console.log(type, query);

    // const normalizedQuery = getNormalizedLokiQuery(query);
    // const expr = removeCommentsFromQuery(normalizedQuery.expr);
    // let isQuerySuitable = false;

    switch (type) {
      // case SupplementaryQueryType.LogsVolume:
      //   // it has to be a logs-producing range-query
      //   isQuerySuitable = !!(query.expr && isLogsQuery(query.expr) && query.queryType === LokiQueryType.Range);
      //   if (!isQuerySuitable) {
      //     return undefined;
      //   }

      //   return {
      //     ...normalizedQuery,
      //     refId: `${REF_ID_STARTER_LOG_VOLUME}${normalizedQuery.refId}`,
      //     queryType: LokiQueryType.Range,
      //     supportingQueryType: SupportingQueryType.LogsVolume,
      //     expr: `sum by (level) (count_over_time(${expr}[$__interval]))`,
      //   };

      // case SupplementaryQueryType.LogsSample:
      //   // it has to be a metric query
      //   isQuerySuitable = !!(query.expr && !isLogsQuery(query.expr));
      //   if (!isQuerySuitable) {
      //     return undefined;
      //   }
      //   return {
      //     ...normalizedQuery,
      //     queryType: LokiQueryType.Range,
      //     refId: `${REF_ID_STARTER_LOG_SAMPLE}${normalizedQuery.refId}`,
      //     expr: getLogQueryFromMetricsQuery(expr),
      //     maxLines: Number.isNaN(Number(options.limit)) ? this.maxLines : Number(options.limit),
      //   };

      default:
        return undefined;
    }
  }

  getLogsVolumeDataProvider(request: DataQueryRequest<MyQuery>): Observable<DataQueryResponse> | undefined {
    const logsVolumeRequest = cloneDeep(request);
    const targets = logsVolumeRequest.targets.map((target) => {
      target['refId'] = REF_ID_STARTER_LOG_VOLUME + target.refId;
      return target;
    });
    // .filter((query): query is MyQuery => !!query);
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

  // getLogsSampleDataProvider(request: DataQueryRequest<MyQuery>): Observable<DataQueryRequest> | undefined {
  //   const logsSampleRequest = cloneDeep(request);
  //   const targets = logsSampleRequest.targets;
  //   // .map((query) => this.getSupplementaryQuery({ type: SupplementaryQueryType.LogsSample, limit: 100 }, query))
  //   // .filter((query): query is MyQuery => !!query);

  //   if (!targets.length) {
  //     return undefined;
  //   }
  //   // return queryLogsSample(this, { ...logsSampleRequest, targets });
  // }
}
