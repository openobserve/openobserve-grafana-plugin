import React, { useEffect, useMemo, useState } from 'react';
import { InlineLabel, Select, Switch } from '@grafana/ui';
import { QueryEditorProps } from '@grafana/data';
import { DataSource } from '../datasource';
import { MyDataSourceOptions, MyQuery } from '../types';
import { getStreams } from '../services/streams';
import { getOrganizations } from '../services/organizations';
import { css } from '@emotion/css';
import { ZincEditor } from './ZincEditor';
import { cloneDeep } from 'lodash';

type Props = QueryEditorProps<DataSource, MyQuery, MyDataSourceOptions>;

export const QueryEditor = ({ query, onChange, onRunQuery, datasource }: Props) => {
  const [streamDetails, setStreamDetails]: any = useState({});
  const [streamOptions, setStreamOptions]: any = useState([]);
  const [orgOptions, setOrgOptions]: any = useState([]);
  const [isMounted, setIsMounted]: any = useState(false);

  useEffect(() => {
    getOrganizations({ url: datasource.url, page_num: 0, page_size: 1000, sort_by: 'id' })
      .then((orgs: any) => {
        setOrgOptions([
          ...orgs.data.map((org: any) => ({
            label: org.name,
            value: org.name,
          })),
        ]);
        setupStreams(orgs.data[0].name).then((streams: any) => {
          datasource.updateStreamFields(streams[0].schema);
          setStreamOptions([
            ...Object.values(streams).map((stream: any) => ({
              label: stream.name,
              value: stream.name,
            })),
          ]);
          if (!(query.organization && query.stream && query.hasOwnProperty('sqlMode'))) {
            onChange({
              ...query,
              stream: streams[0].name,
              organization: orgs.data[0].name,
              sqlMode: false,
            });
          }
          setIsMounted(true);
        });
      })
      .catch((err) => console.log(err));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (query.sqlMode !== undefined && query.stream && isMounted) {
      updateQuery();
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query.sqlMode, query.organization, query.stream]);

  useEffect(() => {
    if (query.stream && query.organization && isMounted) {
      updateQuery();
      onRunQuery();
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query.organization, query.stream]);

  const setupStreams = (orgName: string) => {
    return new Promise((resolve) => {
      getStreams(datasource.url, orgName)
        .then((response: any) => {
          const streams: { [key: string]: any } = {};
          response.list.forEach((stream: any) => {
            streams[stream.name] = stream;
          });
          setStreamDetails(cloneDeep(streams));
          resolve(response.list);
        })
        .catch((err) => console.log(err));
    });
  };

  const updateQuery = () => {
    let newQuery = query.query;
    if (query.sqlMode) {
      let whereClause = '';
      if (newQuery.trim().length) {
        whereClause = 'WHERE ' + newQuery.trim();
      }
      newQuery = `SELECT *  FROM "${query.stream}" ${whereClause}`;
    } else {
      newQuery = '';
    }
    onChange({
      ...query,
      query: newQuery,
      sqlMode: query.sqlMode,
    });
  };

  const onChangeQuery = ({ value, sqlMode }: { value: string; sqlMode: boolean }) => {
    onChange({ ...query, query: value, sqlMode: sqlMode });
  };

  const streamUpdated = (stream: any) => {
    onChange({
      ...query,
      query: '',
      stream: stream.value,
    });
    datasource.updateStreamFields(cloneDeep(streamDetails[stream.value].schema));
  };

  const orgUpdated = (organization: any) => {
    setupStreams(organization.value).then((streams: any) => {
      onChange({
        ...query,
        query: '',
        stream: streams[0].name,
        organization: organization.value,
      });
      datasource.updateStreamFields(cloneDeep(streams[0].schema));
      setStreamOptions([
        ...streams.map((stream: any) => ({
          label: stream.name,
          value: stream.name,
        })),
      ]);
    });
  };

  const toggleSqlMode = () => {
    onChange({
      ...query,
      sqlMode: !query.sqlMode,
    });
  };

  const generateEditorId = useMemo(
    () => query.stream + query.organization + (streamDetails[query.stream]?.schema || []).length,
    [query.stream, query.organization, streamDetails]
  );
  return (
    <div>
      <div
        className={css`
          display: flex;
          align-items: center;
        `}
      >
        <div
          className={css`
            display: flex;
            align-items: center;
            padding-right: 1rem;
          `}
        >
          <InlineLabel
            data-testid="query-editor-select-organization-label"
            className={css`
              width: fit-content;
            `}
            transparent
          >
            Select Organization
          </InlineLabel>
          <Select
            id="query-editor-select-organization-input"
            className={css`
              width: 200px !important;
              margin: 8px 0px;
            `}
            options={orgOptions}
            value={query.organization}
            onChange={orgUpdated}
          />
        </div>
        <div
          className={css`
            display: flex;
            align-items: center;
          `}
        >
          <InlineLabel
            data-testid="query-editor-select-stream-label"
            className={css`
              width: fit-content;
            `}
            transparent
          >
            Select Stream
          </InlineLabel>
          <Select
            id="query-editor-select-stream-input"
            className={css`
              width: 200px !important;
              margin: 8px 0px;
            `}
            options={streamOptions}
            value={query.stream}
            onChange={streamUpdated}
          />
        </div>
      </div>
      <div
        className={css`
          display: flex;
          align-items: center;
          padding-bottom: 0.5rem;
        `}
      >
        <InlineLabel
          data-testid="query-editor-sql-mode-label"
          className={css`
            width: fit-content;
          `}
          transparent={true}
        >
          SQL Mode
        </InlineLabel>
        <Switch data-testid="query-editor-sql-mode-switch" value={!!query.sqlMode} onChange={toggleSqlMode} />
      </div>
      {query.stream && (
        <ZincEditor
          key={generateEditorId}
          query={query.query}
          onChange={onChangeQuery}
          placeholder="Enter a zinc query"
          getFields={streamDetails[query.stream]?.schema || []}
          isSQLMode={query.sqlMode}
          runQuery={onRunQuery}
          id={generateEditorId}
        />
      )}
    </div>
  );
};
