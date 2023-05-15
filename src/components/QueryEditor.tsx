import React, { useEffect, useRef, useState } from 'react';
import { InlineLabel, Select, Switch } from '@grafana/ui';
import { QueryEditorProps } from '@grafana/data';
import { DataSource } from '../datasource';
import { MyDataSourceOptions, MyQuery } from '../types';
import { getStreams } from '../services/streams';
import { getOrganizations } from '../services/organizations';
import { css } from '@emotion/css';
import { ZincEditor } from './ZincEditor';

type Props = QueryEditorProps<DataSource, MyQuery, MyDataSourceOptions>;

export function QueryEditor({ query, onChange, onRunQuery, datasource }: Props) {
  const [streams, setStreams]: any = useState({});
  const [streamOptions, setStreamOptions]: any = useState([]);
  const [orgOptions, setOrgOptions]: any = useState([]);

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
          onChange({
            ...query,
            stream: streams[0].name,
            organization: orgs.data[0].name,
            streamFields: streams[0].schema,
            sqlMode: false,
          });
          setStreamOptions([
            ...Object.values(streams).map((stream: any) => ({
              label: stream.name,
              value: stream.name,
            })),
          ]);
          onRunQuery();
        });
      })
      .catch((err) => console.log(err));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (query.sqlMode !== undefined && query.stream) {
      updateQuery();
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query.sqlMode, query.organization, query.stream]);

  useEffect(() => {
    if (query.stream && query.organization) {
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
          setStreams({ ...streams });
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
    });
  };

  const onChangeQuery = (queryText: string) => {
    if (query.query !== queryText) {
      onChange({ ...query, query: queryText, queryType: 'logs' });
    }
  };

  const streamUpdated = (stream: any) => {
    onChange({
      ...query,
      query: '',
      stream: stream.value,
      streamFields: streams[stream.value].schema,
    });
    onRunQuery();
  };

  const orgUpdated = (organization: any) => {
    setupStreams(organization.value).then((streams: any) => {
      onChange({
        ...query,
        query: '',
        stream: streams[0].name,
        organization: organization.value,
        streamFields: streams[0].schema,
      });
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
            className={css`
              width: fit-content;
            `}
            transparent
          >
            Select Organization
          </InlineLabel>
          <Select
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
            className={css`
              width: fit-content;
            `}
            transparent
          >
            Select Stream
          </InlineLabel>
          <Select
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
          className={css`
            width: fit-content;
          `}
          transparent={true}
        >
          SQL Mode
        </InlineLabel>
        <Switch value={!!query.sqlMode} onChange={toggleSqlMode} />
      </div>
      <ZincEditor
        query={query.query}
        onChange={() => onChangeQuery}
        placeholder="Enter a zinc query"
        fields={query.streamFields || []}
        runQuery={onRunQuery}
      ></ZincEditor>
    </div>
  );
}
