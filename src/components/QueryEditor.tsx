import React, { MutableRefObject, useEffect, useRef, useState } from 'react';
import { InlineLabel, QueryField, Select } from '@grafana/ui';
import { QueryEditorProps } from '@grafana/data';
import { DataSource } from '../datasource';
import { MyDataSourceOptions, MyQuery } from '../types';
import { getStreams, getStreamSchema } from '../streams';
import { css } from '@emotion/css';

type Props = QueryEditorProps<DataSource, MyQuery, MyDataSourceOptions>;

export function QueryEditor({ query, onChange, onRunQuery, datasource }: Props) {
  const myRef: MutableRefObject<string> = useRef('');
  const queryValue: string = myRef.current;

  const [streams, setStreams]: any = useState({});
  const [streamOptions, setStreamOptions]: any = useState([]);

  useEffect(() => {
    getStreams(datasource.url).then((response: any) => {
      const streams: { [key: string]: any } = {};
      response.list.forEach((stream: any) => {
        streams[stream.name] = stream;
      });
      setStreams({ ...streams });
      setStreamOptions([
        ...response.list.map((stream: any) => ({
          label: stream.name,
          value: stream.name,
        })),
      ]);
      onChange({
        ...query,
        query: query.query || '',
        stream: response.list[0].name,
        streamFields: response.list[0].schema,
      });
      onRunQuery();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onChangeQuery = (queryText: string) => {
    onChange({ ...query, query: queryText, queryType: 'logs' });
    console.log(query);
  };

  const streamUpdated = (stream: { label: string; value: string }) => {
    console.log(datasource.instanceSettings);
    onChange({
      ...query,
      stream: stream.value,
      streamFields: streams[stream.value].schema,
    });
    onRunQuery();
  };
  return (
    <div>
      <div
        className={css`
          display: flex;
          align-items: center;
        `}
      >
        <InlineLabel width={17} tooltip="Select stream to get logs">
          Select Stream
        </InlineLabel>{' '}
        <Select
          className={css`
            width: 200px !important;
            margin: 8px 0px;
          `}
          options={streamOptions}
          value={query.stream}
          onChange={streamUpdated}
        ></Select>
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
