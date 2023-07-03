import React, { useState, useEffect } from 'react';
import { DataSourceHttpSettings, Field, InlineLabel, Input } from '@grafana/ui';
import { DataSourcePluginOptionsEditorProps } from '@grafana/data';
import { MyDataSourceOptions } from '../../types';
import { css } from '@emotion/css';

interface Props extends DataSourcePluginOptionsEditorProps<MyDataSourceOptions> {}

export function ConfigEditor(props: Props) {
  const { onOptionsChange, options } = props;

  const [timestampName, setTimestampName] = useState('');

  useEffect(() => {
    const timestamp_column = options?.jsonData?.timestamp_column || '_timestamp';
    if (timestamp_column) {
      setTimestampName(timestamp_column);
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const updateTimestampName = (name: string) => {
    if (name === '') {
      name = '_timestamp';
    }
    setTimestampName(name);
    onOptionsChange({
      ...options,
      jsonData: {
        ...options.jsonData,
        timestamp_column: name,
      },
    });
  };

  return (
    <div>
      <DataSourceHttpSettings
        defaultUrl="http://localhost:9200"
        dataSourceConfig={options}
        showAccessOptions={false}
        onChange={onOptionsChange}
      ></DataSourceHttpSettings>
      <div className="page-heading">OpenObserve details</div>
      <div
        className={css`
          display: flex;
          align-items: start;
          padding-right: 1rem;
        `}
      >
        <InlineLabel className="width-10">Time field name</InlineLabel>
        <Field
          invalid={timestampName === ''}
          error={timestampName === '' ? 'Timestamp Field Name cannot be empty' : ''}
        >
          <Input
            className="width-18"
            value={timestampName}
            onChange={(e) => updateTimestampName(e.currentTarget.value)}
          />
        </Field>
      </div>
    </div>
  );
}
