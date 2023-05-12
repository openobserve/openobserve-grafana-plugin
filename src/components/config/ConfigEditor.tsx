import React, { useEffect } from 'react';
import { DataSourceHttpSettings } from '@grafana/ui';
import { DataSourcePluginOptionsEditorProps } from '@grafana/data';
import { MyDataSourceOptions } from '../../types';

interface Props extends DataSourcePluginOptionsEditorProps<MyDataSourceOptions> {}

export function ConfigEditor(props: Props) {
  const { onOptionsChange, options } = props;

  useEffect(() => {
    console.log(options);
    // onOptionsChange({
    //   ...options,
    //   jsonData: {
    //     ...options,
    //   },
    // });

    // We can't enforce the eslint rule here because we only want to run this once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [options]);
  // const onPathChange = (event: ChangeEvent<HTMLInputElement>) => {
  //   console.log(event, options);
  //   const jsonData = {
  //     ...options.jsonData,
  //     path: event.target.value,
  //   };
  //   onOptionsChange({ ...options, jsonData });
  // };

  // // Secure field (only sent to the backend)
  // const onAPIKeyChange = (event: ChangeEvent<HTMLInputElement>) => {
  //   console.log(event, options);
  //   onOptionsChange({
  //     ...options,
  //     secureJsonData: {
  //       apiKey: event.target.value,
  //     },
  //   });
  // };

  // const onHttpChange = (event: ChangeEvent<HTMLInputElement>) => {
  //   console.log(event);
  //   onOptionsChange({
  //     ...options,
  //     secureJsonData: {},
  //   });
  // };

  // const onResetAPIKey = () => {
  //   onOptionsChange({
  //     ...options,
  //     secureJsonFields: {
  //       ...options.secureJsonFields,
  //       apiKey: false,
  //     },
  //     secureJsonData: {
  //       ...options.secureJsonData,
  //       apiKey: '',
  //     },
  //   });
  // };

  // const secureJsonData = (options.secureJsonData || {}) as MySecureJsonData;

  // const showAccessOptions = useRef(props.options.access === 'direct');

  return (
    <div className="">
      <DataSourceHttpSettings
        defaultUrl="http://localhost:9200"
        dataSourceConfig={options}
        showAccessOptions={false}
        onChange={onOptionsChange}
      />
      {/* 
      <InlineField label="Path" labelWidth={12}>
        <Input
          onChange={onPathChange}
          value={jsonData.path || ''}
          placeholder="json field returned to frontend"
          width={40}
        />
      </InlineField>
      <InlineField label="API Key" labelWidth={12}>
        <SecretInput
          isConfigured={(secureJsonFields && secureJsonFields.apiKey) as boolean}
          value={secureJsonData.apiKey || ''}
          placeholder="secure json field (backend only)"
          width={40}
          onReset={onResetAPIKey}
          onChange={onAPIKeyChange}
        />
      </InlineField> */}
    </div>
  );
}
