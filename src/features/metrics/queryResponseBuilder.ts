import { FieldType, MutableDataFrame, PreferredVisualisationType } from '@grafana/data';
import { MyQuery } from 'types';
import { convertTimeToMs, getFieldType } from 'utils/zincutils';

export const getLogsDataFrame = (data: any, target: MyQuery, streamFields: any = []) => {
  const logsData = getDefaultDataFrame(target.refId, 'logs');

  logsData.addField({
    config: {
      filterable: true,
    },
    name: 'Time',
    type: FieldType.time,
  });
  logsData.addField({
    name: 'Content',
    type: FieldType.string,
  });

  streamFields.forEach((field: any) => {
    logsData.addField({
      name: field.name,
      type: getFieldType(field.type),
    });
  });

  data.hits.forEach((log: any) => {
    logsData.add({ ...log, Content: JSON.stringify(log), Time: convertTimeToMs(log._timestamp) });
  });

  return logsData;
};

export const getGraphDataFrame = (data: any, target: MyQuery) => {
  const graphData = getDefaultDataFrame(target.refId, 'graph');

  graphData.addField({
    config: {
      filterable: true,
    },
    name: 'Time',
    type: FieldType.time,
  });
  graphData.addField({
    name: 'Value',
    type: FieldType.number,
  });

  data.aggs?.histogram.forEach((log: any) => {
    let histDate = new Date(log.zo_sql_key + 'Z').getTime();
    graphData.add({ Time: histDate, Value: log.zo_sql_num });
  });

  return graphData;
};

export const getDefaultDataFrame = (refId: string, visualisationType: PreferredVisualisationType = 'logs') => {
  return new MutableDataFrame({
    refId: refId,
    meta: {
      preferredVisualisationType: visualisationType,
    },
    fields: [],
  });
};
