import React, { MutableRefObject, useEffect, useRef } from 'react';
import { QueryField } from '@grafana/ui';
import { QueryEditorProps } from '@grafana/data';
import { DataSource } from '../datasource';
import { MyDataSourceOptions, MyQuery } from '../types';

type Props = QueryEditorProps<DataSource, MyQuery, MyDataSourceOptions>;

export function QueryEditor({ query, onChange, onRunQuery }: Props) {
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
  useEffect(() => {
    console.log(query);

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const onChangeQuery = (queryText: string) => {
    onChange({ ...query, queryText, queryType: 'logs' });
    console.log(query);
    onRunQuery();
  };
  return (
    <div>
      {/* <div className={styles.root}>
        <InlineLabel width={17}>Query type</InlineLabel>
        <div className={styles.queryItem}>
          <QueryTypeS />
        </div>
      </div> */}
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
