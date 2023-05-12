import {
  DataQueryRequest,
  DataQueryResponse,
  DataSourceApi,
  DataSourceInstanceSettings,
  MutableDataFrame,
  FieldType,
} from '@grafana/data';

import { getBackendSrv } from '@grafana/runtime';

import { MyQuery, MyDataSourceOptions } from './types';

export class DataSource extends DataSourceApi<MyQuery, MyDataSourceOptions> {
  instanceSettings?: DataSourceInstanceSettings<MyDataSourceOptions>;
  url: string;

  constructor(instanceSettings: DataSourceInstanceSettings<MyDataSourceOptions>) {
    super(instanceSettings);
    this.url = instanceSettings.url || '';
    // this.name = instanceSettings.name;
    console.log(instanceSettings, this.url);
    this.instanceSettings = instanceSettings;
  }

  async query(options: DataQueryRequest<MyQuery>): Promise<DataQueryResponse> {
    console.log('query zinc observe', { ...options }, this.url);
    const { range } = options;
    const from = range!.from.valueOf();
    const to = range!.to.valueOf();

    console.log('query zinc observe', { ...options }, this.url);
    // const { range } = options;
    // const from = range!.from.valueOf();
    // const to = range!.to.valueOf();
    const promises = options.targets.map((target) => {
      // Your code goes here.
      return this.doRequest(target)
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
          response.data.hits.forEach((point: any) => {
            console.log(point);
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
          console.log(frame);
          return frame;
        })
        .catch((err) => console.log(err));
    });

    // return Promise.all(promises).then((data) => ({ data }));
    // Return a constant for each query.
    // const data = options.targets.map((target) => {
    //   return new MutableDataFrame({
    //     refId: target.refId,
    //     fields: [
    //       { name: 'Time', values: [from, to], type: FieldType.time },
    //       { name: 'Value', values: [target.constant, target.constant], type: FieldType.number },
    //     ],
    //   });
    // });
    // console.log('promises');
    // return { data: [] };
    return Promise.all(promises).then((data) => {
      console.log({ data: data || [] });
      return { data: data || [] };
    });
  }

  async doRequest(target: any) {
    const headers: any = {};
    // headers = options.headers || {};
    headers['Content-Type'] = 'application/x-ndjson';
    // const query = defaults(target, { query: target.queryText });
    // console.log(query);
    return getBackendSrv().datasourceRequest({
      method: 'POST',
      url: this.url,
      params: {
        type: 'logs',
      },
      data: {
        query: {
          sql: 'select * from "gke-fluentbit" ',
          start_time: 1683866197007000,
          end_time: 1683867097007000,
          from: 0,
          size: 150,
        },
      },
    });
  }

  async testDatasource() {
    // Implement a health check for your data source.
    return {
      status: 'success',
      message: 'Success saved',
    };
  }
}
