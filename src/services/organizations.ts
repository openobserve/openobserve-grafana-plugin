import { getBackendSrv } from '@grafana/runtime';

export function getOrganizations({
  url,
  page_num = 0,
  page_size = 1000,
  sort_by = 'id',
  desc = false,
  name = '',
}: {
  url: string;
  page_num?: number;
  page_size?: number;
  sort_by?: string;
  desc?: boolean;
  name?: string;
}) {
  return new Promise((resolve, reject) =>
    getBackendSrv()
      .get(
        url +
          `/api/organizations?page_num=${page_num}&page_size=${page_size}&sort_by=${sort_by}&desc=${desc}&name=${name}`
      )
      .then((response) => {
        resolve(response);
      })
      .catch((err) => {
        reject(err);
      })
  );
}
