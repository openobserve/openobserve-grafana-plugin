import { getBackendSrv } from '@grafana/runtime';

export class Streams {
  url: string;
  constructor(url: string) {
    this.url = url;
  }
  getStreams() {
    const headers: any = {};
    headers['Content-Type'] = 'application/x-ndjson';
    return new Promise((resolve, reject) =>
      getBackendSrv()
        .datasourceRequest({
          method: 'GET',
          url: this.url + '/streams',
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
}
