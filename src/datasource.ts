import {
  DataQueryRequest,
  DataQueryResponse,
  DataSourceApi,
  DataSourceInstanceSettings,
  MutableDataFrame,
  FieldType,
  QueryFixAction,
} from '@grafana/data';

import { getBackendSrv } from '@grafana/runtime';

import { MyQuery, MyDataSourceOptions, TimeRange } from './types';
import { b64EncodeUnicode, logsErrorMessage } from 'utils/zincutils';
export class DataSource extends DataSourceApi<MyQuery, MyDataSourceOptions> {
  instanceSettings?: DataSourceInstanceSettings<MyDataSourceOptions>;
  url: string;

  constructor(instanceSettings: DataSourceInstanceSettings<MyDataSourceOptions>) {
    super(instanceSettings);
    this.url = instanceSettings.url || '';
    this.instanceSettings = instanceSettings;
  }

  getConsumableTime(range: any) {
    const startTimeInMicro: any = new Date(new Date(range!.from.valueOf()).toISOString()).getTime() * 1000;
    const endTimeInMirco: any = new Date(new Date(range!.to.valueOf()).toISOString()).getTime() * 1000;
    return {
      startTimeInMicro,
      endTimeInMirco,
    };
  }

  async query(options: DataQueryRequest<MyQuery>): Promise<DataQueryResponse> {
    const timestamps = this.getConsumableTime(options.range);
    const promises = options.targets.map((target) => {
      // Your code goes here.
      const reqData = this.buildQuery(target, timestamps);
      return this.doRequest(target, reqData)
        .then((response) => {
          const frame = new MutableDataFrame({
            refId: target.refId,
            meta: {
              preferredVisualisationType: 'logs',
            },
            fields: [
              { name: 'Time', type: FieldType.time },
              { name: 'log', type: FieldType.string },
              { name: 'kubernetes_container_hash', type: FieldType.string },
              { name: 'kubernetes_container_image', type: FieldType.string },
              { name: 'kubernetes_container_name', type: FieldType.string },
              { name: 'kubernetes_docker_id', type: FieldType.string },
              { name: 'kubernetes_labels_app_kubernetes_io_instance', type: FieldType.string },
              { name: 'kubernetes_host', type: FieldType.string },
            ],
          });
          response.hits.forEach((point: any) => {
            frame.appendRow([
              point.time,
              point.log,
              point.kubernetes_container_hash,
              point.kubernetes_container_image,
              point.kubernetes_container_name,
              point.kubernetes_docker_id,
              point.kubernetes_labels_app_kubernetes_io_instance,
              point.kubernetes_host,
            ]);
          });
          return frame;
        })
        .catch((err) => {
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
    return getBackendSrv().post(this.url + `/${target.organization}/_search?type=logs`, data, {
      showErrorAlert: false,
    });
  }

  async testDatasource() {
    // Implement a health check for your data source.
    return {
      status: 'success',
      message: 'Success saved',
    };
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
          size: 150,
          sql_mode: 'full',
        },
      };

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
          queryData.streamFields.forEach((field: any) => {
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

      return req;
    } catch (e) {
      console.log('error in building query:', e);
    }
  }
}
