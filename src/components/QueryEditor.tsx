import React, { MutableRefObject, useEffect, useRef, useState } from 'react';
import { InlineLabel, QueryField, Select, Switch } from '@grafana/ui';
import { QueryEditorProps } from '@grafana/data';
import { DataSource } from '../datasource';
import { MyDataSourceOptions, MyQuery } from '../types';
import { getStreams } from '../streams';
import { css } from '@emotion/css';

type Props = QueryEditorProps<DataSource, MyQuery, MyDataSourceOptions>;

export function QueryEditor({ query, onChange, onRunQuery, datasource }: Props) {
  const [streams, setStreams]: any = useState({});
  const [streamOptions, setStreamOptions]: any = useState([]);

  useEffect(() => {
    getStreams(datasource.url).then((response: any) => {
      const streams: { [key: string]: any } = {};
      response.list.forEach((stream: any) => {
        streams[stream.name] = stream;
      });
      setStreams({ ...streams });
      onChange({
        ...query,
        query: query.query || '',
        stream: response.list[0].name,
        streamFields: response.list[0].schema,
        sqlMode: false,
      });
      setStreamOptions([
        ...response.list.map((stream: any) => ({
          label: stream.name,
          value: stream.name,
        })),
      ]);
      onRunQuery();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (query.sqlMode !== undefined) {
      updateQuery();
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query.sqlMode]);

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
    onChange({ ...query, query: queryText, queryType: 'logs' });
  };

  const streamUpdated = (stream: any) => {
    onChange({
      ...query,
      stream: stream.value,
      streamFields: streams[stream.value].schema,
    });
    onRunQuery();
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
      <QueryField
        query={query.query}
        // By default QueryField calls onChange if onBlur is not defined, this will trigger a rerender
        // And slate will claim the focus, making it impossible to leave the field.
        onBlur={() => {}}
        onChange={onChangeQuery}
        placeholder="Enter a zinc query"
        portalOrigin="zincObserve"
      />
    </div>
  );
}
