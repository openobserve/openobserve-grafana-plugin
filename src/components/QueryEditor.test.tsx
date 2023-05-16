import { render, waitFor, fireEvent, act } from '@testing-library/react';
import React from 'react';
import { getOrganizations } from '../services/organizations';
import { getStreams } from '../services/streams';
import { QueryEditor } from './QueryEditor';
import { MyDataSourceOptions } from 'types';
import { DataSource } from 'datasource';

import { DataSourceInstanceSettings, PluginSignatureStatus, PluginType } from '@grafana/data';
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
    url: '/api/datasources/proxy/uid/fd886f75-fdd9-444b-8868-be92687ff464',
  },
  readOnly: false,
};

const mockOrgs = [
  {
    id: 1,
    identifier: 'default',
    name: 'default',
    user_email: 'root@example.com',
    ingest_threshold: 9383939382,
    search_threshold: 9383939382,
    type: 'default',
    UserObj: {
      first_name: 'root@example.com',
      last_name: 'root@example.com',
      email: 'root@example.com',
    },
  },
  {
    id: 3,
    identifier: 'neworg',
    name: 'neworg',
    user_email: 'root@example.com',
    ingest_threshold: 9383939382,
    search_threshold: 9383939382,
    type: 'custom',
    UserObj: {
      first_name: 'root@example.com',
      last_name: 'root@example.com',
      email: 'root@example.com',
    },
  },
  {
    id: 4,
    identifier: 'production_n230k19AUNT56m0',
    name: 'production_n230k19AUNT56m0',
    user_email: 'root@example.com',
    ingest_threshold: 9383939382,
    search_threshold: 9383939382,
    type: 'custom',
    UserObj: {
      first_name: 'root@example.com',
      last_name: 'root@example.com',
      email: 'root@example.com',
    },
  },
];
const mockStreams = [
  {
    name: 'gke-fluentbit',
    storage_type: 's3',
    stream_type: 'logs',
    stats: {
      doc_time_min: 1680273248592184,
      doc_time_max: 1684231835601605,
      doc_num: 509047692,
      file_num: 31771,
      storage_size: 577585.3,
      compressed_size: 13723.22,
    },
    schema: [
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
    ],
    settings: {
      partition_keys: {},
      full_text_search_keys: ['log', 'message', 'msg'],
      schema_validation: false,
    },
  },
];

jest.mock('../services/organizations', () => ({
  getOrganizations: jest.fn(),
}));

jest.mock('../services/streams', () => ({
  getStreams: jest.fn(),
}));
let wrapper: any;
describe('QueryEdsitor', () => {
  const mockProps = {
    query: {
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
      ],
      sqlMode: false,
      query: '',
      key: 'Q-a981d2e0-bfc9-4fe5-a062-16bf7848d19f-0',
    },
    onChange: jest.fn(),
    onRunQuery: jest.fn(),
    datasource: new DataSource(instanceSettings),
  };

  function renderQueryEditor() {
    return render(<QueryEditor {...mockProps} />);
  }

  beforeEach(() => {
    jest.resetAllMocks();
    (getOrganizations as jest.Mock).mockResolvedValue({ data: mockOrgs });
    (getStreams as jest.Mock).mockResolvedValue({ list: mockStreams });
  });

  it('renders select organization', async () => {
    await act(async () => {
      wrapper = renderQueryEditor();
    });
    expect(await wrapper.getByTestId('query-editor-select-organization-label').textContent).toBe('Select Organization');
    expect(await wrapper.container.querySelector('[id="query-editor-select-organization-input"]')).toBeVisible();
  });

  it('renders select stream', async () => {
    await act(async () => {
      wrapper = renderQueryEditor();
    });
    expect(await wrapper.getByTestId('query-editor-select-stream-label').textContent).toBe('Select Stream');
    expect(await wrapper.container.querySelector('[id="query-editor-select-stream-input"]')).toBeVisible();
  });

  it('fetches and displays organizations and streams on load', async () => {
    const { findByText } = renderQueryEditor();
    await waitFor(() => expect(getOrganizations).toHaveBeenCalled());
    await waitFor(() => expect(getStreams).toHaveBeenCalled());
    expect(await findByText('Select Stream')).toBeInTheDocument();
  });

  it('triggers onChange when SQL Mode is toggled', async () => {
    await act(async () => {
      wrapper = renderQueryEditor();
    });
    expect(wrapper.getByTestId('query-editor-sql-mode-label').textContent).toBe('SQL Mode');
    fireEvent.click(wrapper.getByTestId('query-editor-sql-mode-switch'));
    expect(mockProps.onChange).toHaveBeenCalled();
  });
});
