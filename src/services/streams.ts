import { getBackendSrv } from '@grafana/runtime';

export function getStreams(url: string, orgName: string) {
  return new Promise((resolve, reject) =>
    getBackendSrv()
      .datasourceRequest({
        method: 'GET',
        url: url + `/${orgName}/streams`,
        params: {
          type: 'logs',
          fetchSchema: true,
        },
      })
      .then((response) => {
        resolve(response.data);
      })
      .catch((err) => {
        reject(err);
      })
  );
}

export function getStreamSchema({ url, stream }: { url: string; stream: string }) {
  return new Promise((resolve, reject) =>
    getBackendSrv()
      .datasourceRequest({
        method: 'GET',
        url: url + `/${stream}/schema`,
        params: {
          type: 'logs',
        },
      })
      .then((response) => {
        resolve(response.data);
      })
      .catch((err) => {
        reject(err);
      })
  );
}
