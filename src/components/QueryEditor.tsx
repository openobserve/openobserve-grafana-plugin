import React, { MutableRefObject, useEffect, useRef, useState } from 'react';
import { InlineLabel, Label, QueryField, Select } from '@grafana/ui';
import { QueryEditorProps } from '@grafana/data';
import { DataSource } from '../datasource';
import { MyDataSourceOptions, MyQuery } from '../types';
import { Streams } from '../streams';
import { css } from '@emotion/css';

type Props = QueryEditorProps<DataSource, MyQuery, MyDataSourceOptions>;

export function QueryEditor({ query, onChange, onRunQuery, datasource }: Props) {
  const myRef: MutableRefObject<string> = useRef('');
  const queryValue: string = myRef.current;

  // const onQueryTextChange = (event: ChangeEvent<HTMLInputElement>) => {
  //   onChange({ ...query, queryText: event.target.value });
  // };
  // const promises = options.targets.map((target) => {
  //   // Your code goes here.
  //   // this.doRequest(target);
  // });

  // return Promise.all(promises).then((data) => ({ data }));
  // const onConstantChange = (event: ChangeEvent<HTMLInputElement>) => {
  //   onChange({ ...query, constant: parseFloat(event.target.value) });
  //   // executes the query
  //   onRunQuery();
  // };

  // const { queryText, constant } = query;
  // const [streams, setStreams]: any = useState();

  // setStreams(new Streams(datasource.url));
  const [streams, setStreams]: any = useState([]);

  useEffect(() => {
    new Streams(datasource.url).getStreams().then((response: any) => {
      console.log(response);
      setStreams([
        ...response.list.map((stream: any) => ({
          label: stream.name,
          value: stream.name,
        })),
      ]);
      onChange({ ...query, stream: response.list[0].name });
      onRunQuery();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onChangeQuery = (queryText: string) => {
    onChange({ ...query, queryText, queryType: 'logs' });
    console.log(query);
  };

  const streamUpdated = (stream: string) => {
    console.log('stream updated', stream);
    onChange({ ...query, stream: stream });
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
          options={streams}
          value={query.stream}
          onChange={streamUpdated}
        ></Select>
      </div>
      <QueryField
        query={queryValue}
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
