import React, { useEffect, useState } from 'react';
import { QueryEditorProps } from '@grafana/data';
import { InlineLabel, Select, TextArea } from '@grafana/ui';
import { css } from '@emotion/css';
import type { DataSource } from '../datasource';
import { MyDataSourceOptions, MyQuery, VariableQuery } from '../types';
import { getOrganizations } from '../services/organizations';

type Props = QueryEditorProps<DataSource, MyQuery, MyDataSourceOptions, VariableQuery>;

export const VariableQueryEditor = ({ query: rawQuery, onChange, datasource }: Props) => {
  // Grafana may pass a raw string on first load before any config is saved
  const query: VariableQuery = typeof rawQuery === 'object' && rawQuery !== null
    ? rawQuery
    : { refId: 'A', organization: '', query: '' };

  const [orgOptions, setOrgOptions] = useState<Array<{ label: string; value: string }>>([]);

  useEffect(() => {
    getOrganizations({ url: datasource.url, page_num: 0, page_size: 1000, sort_by: 'id' })
      .then((orgs: any) => {
        const options = orgs.data.map((org: any) => ({ label: org.name, value: org.name }));
        setOrgOptions(options);
        if (!query.organization && options.length > 0) {
          onChange({ ...query, organization: options[0].value });
        }
      })
      .catch(console.error);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div>
      <div
        className={css`
          display: flex;
          align-items: center;
          margin-bottom: 8px;
        `}
      >
        <InlineLabel
          transparent
          className={css`
            width: fit-content;
          `}
        >
          Organization
        </InlineLabel>
        <Select
          className={css`
            width: 200px !important;
          `}
          options={orgOptions}
          value={query.organization}
          onChange={(opt) => onChange({ ...query, organization: opt.value! })}
        />
      </div>
      <div
        className={css`
          display: flex;
          align-items: flex-start;
        `}
      >
        <InlineLabel
          transparent
          className={css`
            width: fit-content;
            padding-top: 8px;
          `}
        >
          Query
        </InlineLabel>
        <TextArea
          className={css`
            flex: 1;
            font-family: monospace;
          `}
          value={query.query || ''}
          rows={3}
          placeholder='SELECT DISTINCT host FROM "mystream"'
          onChange={(e) => onChange({ ...query, query: e.currentTarget.value })}
        />
      </div>
    </div>
  );
};
