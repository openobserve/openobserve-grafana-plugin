import { MyDataSourceOptions } from 'types';
import { DataSource } from './datasource';
import { DataSourceInstanceSettings, PluginSignatureStatus, PluginType } from '@grafana/data';
import { buildQuery } from 'features/query/queryBuilder';

let DateTime = {
  add: jest.fn(),
  set: jest.fn(),
  diff: jest.fn(),
  endOf: jest.fn(),
  format: jest.fn(),
  fromNow: jest.fn(),
  from: jest.fn(),
  isSame: jest.fn(),
  isBefore: jest.fn(),
  isValid: jest.fn(),
  local: jest.fn(),
  locale: jest.fn(),
  startOf: jest.fn(),
  subtract: jest.fn(),
  toDate: jest.fn(),
  toISOString: jest.fn(),
  isoWeekday: jest.fn(),
  valueOf: jest.fn().mockReturnValue(new Date('2023-05-16T00:00:00Z')),
  unix: jest.fn(),
  utc: jest.fn(),
  utcOffset: jest.fn(),
  hour: jest.fn(),
  minute: jest.fn(),
};

jest.mock('rxjs', () => {
  return {
    Observable: jest.fn(),
  };
});

jest.mock('@grafana/runtime', () => ({
  ...jest.requireActual('@grafana/runtime'),
  getBackendSrv: () => {
    return {
      post: jest.fn().mockResolvedValue({
        hits: [
          {
            _p: 'F',
            _timestamp: 1684219692352167,
            kubernetes_container_hash:
              'registry.k8s.io/ingress-nginx/controller@sha256:4ba73c697770664c1e00e9f968de14e08f606ff961c76e5d7033a4a9c593c629',
            kubernetes_container_image: 'sha256:f2e1146a6d96ac8eebb251284f45f8569f5879c6ec894ae1335d26617d36af2d',
            kubernetes_container_name: 'controller',
            kubernetes_docker_id: 'e7d62026ddcae35198986225d10ca11080fac2cd1537d427e1ca5007cb9d4311',
            kubernetes_host: 'gke-dev1-default-pool-e40c8755-duy8',
            kubernetes_labels_app_kubernetes_io_component: 'controller',
            kubernetes_labels_app_kubernetes_io_instance: 'ingress-nginx',
            kubernetes_labels_app_kubernetes_io_name: 'ingress-nginx',
            kubernetes_labels_pod_template_hash: '6f7bd4bcfb',
            kubernetes_namespace_name: 'ingress-nginx',
            kubernetes_pod_id: '109d2bd2-53d0-4e58-9588-69563e6891ef',
            kubernetes_pod_name: 'ingress-nginx-controller-6f7bd4bcfb-8dslk',
            log: '18.236.103.156 - root@example.com [16/May/2023:06:48:12 +0000] "POST /api/production_n230k19AUNT56m0/default/_json HTTP/2.0" 200 86 "-" "Fluent-Bit" 44501 0.008 [ziox-alpha1-zo1-zincobserve-router-5080] [] 10.24.0.213:5080 102 0.008 200 f0455fd5afbee4926c34606fd33a30f9',
            stream: 'stdout',
            time: '2023-05-16T06:48:12.352167318Z',
          },
        ],
      }),
    };
  },
  reportInteraction: jest.fn(),
}));

describe('DataSource', () => {
  const instanceSettings: DataSourceInstanceSettings<MyDataSourceOptions> = {
    id: 2,
    uid: 'fd886f75-fdd9-444b-8868-be92687ff464',
    type: 'zinc-grafanatest-datasource',
    name: 'ZincObserve',
    meta: {
      id: 'zinc-grafanatest-datasource',
      type: 'datasource' as PluginType,
      name: 'ZincObserve',
      info: {
        author: {
          name: 'Zinc',
          url: '',
        },
        description: 'Zinc observe',
        links: [],
        logos: {
          small: 'public/plugins/zinc-grafanatest-datasource/img/logo.svg',
          large: 'public/plugins/zinc-grafanatest-datasource/img/logo.svg',
        },
        build: {},
        screenshots: [],
        version: '1.0.0',
        updated: '2023-05-15',
      },
      dependencies: {
        grafanaDependency: '^9.3.8',
        grafanaVersion: '*',
        plugins: [],
      },
      includes: undefined,
      category: '',
      backend: false,
      annotations: false,
      metrics: true,
      alerting: false,
      logs: true,
      tracing: false,
      streaming: false,
      signature: 'unsigned' as PluginSignatureStatus,
      module: 'plugins/zinc-grafanatest-datasource/module',
      baseUrl: 'public/plugins/zinc-grafanatest-datasource',
    },
    url: '/api/datasources/proxy/uid/fd886f75-fdd9-444b-8868-be92687ff464',
    isDefault: false,
    access: 'proxy',
    jsonData: {
      timestamp_column: '_timestamp',
      url: '/api/datasources/proxy/uid/fd886f75-fdd9-444b-8868-be92687ff464',
    },
    readOnly: false,
  };

  let ds: DataSource;

  beforeEach(() => {
    ds = new DataSource(instanceSettings);
  });

  describe('testDatasource', () => {
    it('should return success status', async () => {
      const result = await ds.testDatasource();

      expect(result).toEqual({
        status: 'error',
        message: 'Unable to connect ZincObserve . Verify that ZincObserve is correctly configured',
      });
    });
  });

  describe('When query method is called', () => {
    let options = {
      app: 'explore',
      timezone: 'browser',
      startTime: 1684212732045,
      interval: '2s',
      intervalMs: 2000,
      panelId: 325325235425,
      targets: [
        {
          refId: 'A',
          datasource: {
            type: 'zinc-grafanatest-datasource',
            uid: 'fd886f75-fdd9-444b-8868-be92687ff464',
          },
          stream: 'gke-fluentbit',
          organization: 'default',
          constant: 5,
          streamFields: [
            {
              name: '_p',
              type: 'Utf8',
            },
            {
              name: '_timestamp',
              type: 'Int64',
            },
            {
              name: 'kubernetes_annotations_checksum_config',
              type: 'Utf8',
            },
            {
              name: 'kubernetes_annotations_checksum_luascripts',
              type: 'Utf8',
            },
            {
              name: 'kubernetes_container_image',
              type: 'Utf8',
            },
            {
              name: 'kubernetes_container_name',
              type: 'Utf8',
            },
            {
              name: 'kubernetes_docker_id',
              type: 'Utf8',
            },
            {
              name: 'kubernetes_host',
              type: 'Utf8',
            },
            {
              name: 'kubernetes_labels_app_kubernetes_io_instance',
              type: 'Utf8',
            },
            {
              name: 'kubernetes_labels_app_kubernetes_io_name',
              type: 'Utf8',
            },
            {
              name: 'kubernetes_labels_controller_revision_hash',
              type: 'Utf8',
            },
            {
              name: 'kubernetes_labels_pod_template_generation',
              type: 'Utf8',
            },
            {
              name: 'kubernetes_namespace_name',
              type: 'Utf8',
            },
            {
              name: 'kubernetes_pod_id',
              type: 'Utf8',
            },
            {
              name: 'kubernetes_pod_name',
              type: 'Utf8',
            },
            {
              name: 'log',
              type: 'Utf8',
            },
            {
              name: 'stream',
              type: 'Utf8',
            },
            {
              name: 'time',
              type: 'Utf8',
            },
            {
              name: 'kubernetes_container_hash',
              type: 'Utf8',
            },
            {
              name: 'kubernetes_labels_app',
              type: 'Utf8',
            },
            {
              name: 'kubernetes_labels_component',
              type: 'Utf8',
            },
          ],
          sqlMode: true,
          query: 'SELECT *  FROM "gke-fluentbit" ',
          key: 'Q-7f589db2-4fa2-424a-a36a-3fc9bcff8ebd-0',
        },
      ],
      range: {
        from: DateTime,
        to: DateTime,
        raw: {
          from: 'now-1h',
          to: 'now',
        },
      },
      requestId: 'explore_left',
      rangeRaw: {
        from: 'now-1h',
        to: 'now',
      },
      scopedVars: {
        __interval: {
          text: '2s',
          value: '2s',
        },
        __interval_ms: {
          text: 2000,
          value: 2000,
        },
      },
      maxDataPoints: 1378,
      liveStreaming: false,
      endTime: 1684212733488,
    };
    let result: any;
    let doRequest: any;
    beforeEach(async () => {
      doRequest = jest.spyOn(ds, 'doRequest');
      result = await ds.query(options);
    });
    it('should call doRequest', () => {
      expect(doRequest).toBeCalledTimes(1);
    });
    it('should return DataFrame', () => {
      expect(result.data.length).toBe(1);
    });
  });

  describe('buildSearch', () => {
    const queryData = {
      refId: 'A',
      constant: 5,
      datasource: {
        type: 'zinc-grafanatest-datasource',
        uid: 'fd886f75-fdd9-444b-8868-be92687ff464',
      },
      stream: 'gke-fluentbit',
      organization: 'default',
      streamFields: [
        {
          name: '_p',
          type: 'Utf8',
        },
        {
          name: '_timestamp',
          type: 'Int64',
        },
        {
          name: 'kubernetes_annotations_checksum_config',
          type: 'Utf8',
        },
        {
          name: 'kubernetes_annotations_checksum_luascripts',
          type: 'Utf8',
        },
        {
          name: 'kubernetes_container_image',
          type: 'Utf8',
        },
        {
          name: 'kubernetes_container_name',
          type: 'Utf8',
        },
        {
          name: 'kubernetes_docker_id',
          type: 'Utf8',
        },
        {
          name: 'kubernetes_host',
          type: 'Utf8',
        },
        {
          name: 'kubernetes_labels_app_kubernetes_io_instance',
          type: 'Utf8',
        },
        {
          name: 'kubernetes_labels_app_kubernetes_io_name',
          type: 'Utf8',
        },
        {
          name: 'kubernetes_labels_controller_revision_hash',
          type: 'Utf8',
        },
        {
          name: 'kubernetes_labels_pod_template_generation',
          type: 'Utf8',
        },
        {
          name: 'kubernetes_namespace_name',
          type: 'Utf8',
        },
        {
          name: 'kubernetes_pod_id',
          type: 'Utf8',
        },
        {
          name: 'kubernetes_pod_name',
          type: 'Utf8',
        },
        {
          name: 'log',
          type: 'Utf8',
        },
        {
          name: 'stream',
          type: 'Utf8',
        },
        {
          name: 'time',
          type: 'Utf8',
        },
        {
          name: 'kubernetes_container_hash',
          type: 'Utf8',
        },
      ],
      sqlMode: true,
      query: 'SELECT *  FROM "gke-fluentbit" ',
      key: 'Q-2985ff4a-77bf-49ad-a58b-0ce8963cdfc3-0',
    };
    const timestamps = {
      startTimeInMicro: 1684224722497000,
      endTimeInMirco: 1684228322497000,
    };

    let result: any;
    const expectedReq = {
      query: {
        sql: 'U0VMRUNUICogIEZST00gImdrZS1mbHVlbnRiaXQiIA==',
        start_time: 1684224722497000,
        end_time: 1684228322497000,
        size: 150,
        sql_mode: 'full',
      },
      encoding: 'base64',
    };
    beforeEach(async () => {
      result = buildQuery(queryData, timestamps, queryData.streamFields, 'explore', '_timestamp');
    });
    it('should return query request data', () => {
      expect(JSON.stringify(result)).toMatch(JSON.stringify(expectedReq));
    });
  });
});
