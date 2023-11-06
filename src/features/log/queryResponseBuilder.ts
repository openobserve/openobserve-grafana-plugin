import { FieldType, MutableDataFrame, PreferredVisualisationType } from '@grafana/data';
import { MyQuery } from '../../types';
import { convertTimeToMs, getFieldType } from '../../utils/zincutils';

export const getLogsDataFrame = (
  data: any,
  target: MyQuery,
  streamFields: any = [],
  timestampColumn = '_timestamp'
) => {
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

  data.forEach((log: any) => {
    logsData.add({ ...log, Content: JSON.stringify(log), Time: convertTimeToMs(log[timestampColumn]) });
  });

  return logsData;
};

export const getGraphDataFrame = (data: any, target: MyQuery, app: string) => {
  const graphData = getDefaultDataFrame(target.refId, 'graph');

  let fields = ['zo_sql_key', 'zo_sql_num'];

  if (app !== 'explore') {
    const columns = getColumnsFromQuery(target.query);

    if (columns.length) {
      fields = columns;
    }
  }

  graphData.addField({
    config: {
      filterable: true,
    },
    name: 'Time',
    type: FieldType.time,
  });

  for (let i = 1; i < fields.length; i++) {
    graphData.addField({
      name: fields[i],
      type: FieldType.number,
    });
  }

  if (!data.length) {
    return graphData;
  }

  data.forEach((log: any) => {
    graphData.add(getField(log, fields));
  });

  return graphData;
};

const getField = (log: any, columns: any) => {
  let field: any = {
    Time: new Date(log[columns[0]] + 'Z').getTime(),
  };

  for (let i = 1; i < columns.length; i++) {
    field[columns[i]] = log[columns[i]];
  }

  return field;
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

const getColumnsFromQuery = (query: string) => {
  // Regular expression pattern to find the select column statements with optional alias
  let pattern = /\bselect\b(.+?)\bfrom\b/i;

  // Get the selected columns
  let match = pattern.exec(query);

  // If there's no select statement, return an empty list
  if (!match) {
    return [];
  }

  // Split the selected columns by comma, then trim extra whitespace
  let selectedColumns = match[1].split(',').map(function (column) {
    return column.trim();
  });

  // Prepare array to store final column names or aliases
  let columnNames: any = [];

  // Iterate over selected columns
  selectedColumns.forEach(function (column) {
    // Regular expression pattern to find alias
    let aliasPattern = /\s+as\s+(.+)$/i;

    // Get the alias
    let aliasMatch = aliasPattern.exec(column);

    // If alias exists, use that, otherwise use column name
    if (aliasMatch) {
      columnNames.push(aliasMatch[1]);
    } else {
      columnNames.push(column);
    }
  });
  return columnNames;
};
