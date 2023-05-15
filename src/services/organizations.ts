import { getBackendSrv } from '@grafana/runtime';

export function getOrganizations({
  url,
  page_num,
  page_size,
  sort_by,
  desc = false,
  name = '',
}: {
  url: string;
  page_num: number;
  page_size: number;
  sort_by: string;
  desc?: boolean;
  name?: string;
}) {
  return new Promise((resolve, reject) =>
    getBackendSrv()
      .datasourceRequest({
        method: 'GET',
        url:
          url +
          `/default/organizations?page_num=${page_num}&page_size=${page_size}&sort_by=${sort_by}&desc=${desc}&name=${name}`,
      })
      .then((response) => {
        resolve(response.data);
      })
      .catch((err) => {
        reject(err);
      })
  );
}
