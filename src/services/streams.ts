import { getBackendSrv } from '@grafana/runtime';

export function getStreams(url: string, orgName: string) {
  return new Promise((resolve, reject) =>
    getBackendSrv()
      .get(url + `/api/${orgName}/streams?type=logs&fetchSchema=true`)
      .then((response) => {
        resolve(response);
      })
      .catch((err) => {
        reject(err);
      })
  );
}

export function getStreamSchema({ url, stream }: { url: string; stream: string }) {
  return new Promise((resolve, reject) =>
    getBackendSrv()
      .get(url + `/api/${stream}/schema?type=logs`)
      .then((response) => {
        resolve(response);
      })
      .catch((err) => {
        reject(err);
      })
  );
}
