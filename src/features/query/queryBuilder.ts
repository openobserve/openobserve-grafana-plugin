import { MyQuery, TimeRange } from 'types';
import { b64EncodeUnicode } from 'utils/zincutils';

export const buildQuery = (
  queryData: MyQuery,
  timestamps: TimeRange,
  streamFields: any[],
  app: string,
  timestampColumn: string
) => {
  try {
    let query: string = queryData.query || '';

    let req: any = {
      query: {
        sql: 'select * from "[INDEX_NAME]" [WHERE_CLAUSE]',
        start_time: timestamps.startTimeInMicro,
        end_time: timestamps.endTimeInMirco,
        size: 300,
      },
      aggs: {
        histogram: `select histogram(${timestampColumn}, '[INTERVAL]') AS zo_sql_key, count(*) AS zo_sql_num from query GROUP BY zo_sql_key ORDER BY zo_sql_key`,
      },
    };

    if (timestamps.startTimeInMicro && timestamps.endTimeInMirco) {
      req.query.start_time = timestamps.startTimeInMicro;
      req.query.end_time = timestamps.endTimeInMirco;

      let chartInterval = '1 second';

      const timeDifference = (timestamps.endTimeInMirco - timestamps.startTimeInMicro) / 1000;

      if (timeDifference >= 1000 * 60 * 5) {
        chartInterval = '3 second';
      }
      if (timeDifference >= 1000 * 60 * 10) {
        chartInterval = '5 second';
      }
      if (timeDifference >= 1000 * 60 * 20) {
        chartInterval = '10 second';
      }
      if (timeDifference >= 1000 * 60 * 30) {
        chartInterval = '15 second';
      }
      if (timeDifference >= 1000 * 60 * 60) {
        chartInterval = '30 second';
      }
      if (timeDifference >= 1000 * 3600 * 2) {
        chartInterval = '1 minute';
      }
      if (timeDifference >= 1000 * 3600 * 6) {
        chartInterval = '5 minute';
      }
      if (timeDifference >= 1000 * 3600 * 24) {
        chartInterval = '30 minute';
      }
      if (timeDifference >= 1000 * 86400 * 7) {
        chartInterval = '1 hour';
      }
      if (timeDifference >= 1000 * 86400 * 30) {
        chartInterval = '1 day';
      }

      req.aggs.histogram = req.aggs.histogram.replaceAll('[INTERVAL]', chartInterval);
    } else {
      return false;
    }

    if (app !== 'explore') {
      req.query.size = 0;
    }

    if (queryData.sqlMode) {
      req.query.sql = queryData.query;
      req.query['sql_mode'] = 'full';
      delete req.aggs;
    }

    if (!queryData.sqlMode) {
      let whereClause = query;

      if (query.trim().length) {
        whereClause = whereClause
          .replace(/=(?=(?:[^"']*"[^"']*"')*[^"']*$)/g, ' =')
          .replace(/>(?=(?:[^"']*"[^"']*"')*[^"']*$)/g, ' >')
          .replace(/<(?=(?:[^"']*"[^"']*"')*[^"']*$)/g, ' <');

        whereClause = whereClause
          .replace(/!=(?=(?:[^"']*"[^"']*"')*[^"']*$)/g, ' !=')
          .replace(/! =(?=(?:[^"']*"[^"']*"')*[^"']*$)/g, ' !=')
          .replace(/< =(?=(?:[^"']*"[^"']*"')*[^"']*$)/g, ' <=')
          .replace(/> =(?=(?:[^"']*"[^"']*"')*[^"']*$)/g, ' >=');

        const parsedSQL = whereClause.split(' ');
        streamFields.forEach((field: any) => {
          parsedSQL.forEach((node: any, index: any) => {
            if (node === field.name) {
              node = node.replaceAll('"', '');
              parsedSQL[index] = '"' + node + '"';
            }
          });
        });

        whereClause = parsedSQL.join(' ');

        req.query.sql = req.query.sql.replace('[WHERE_CLAUSE]', ' WHERE ' + whereClause);
      } else {
        req.query.sql = req.query.sql.replace('[WHERE_CLAUSE]', '');
      }

      req.query.sql = req.query.sql.replace('[INDEX_NAME]', queryData.stream);
    }

    req['encoding'] = 'base64';
    req.query.sql = b64EncodeUnicode(req.query.sql);
    if (!queryData.sqlMode) {
      req.aggs.histogram = b64EncodeUnicode(req.aggs.histogram);
    }

    return req;
  } catch (e) {
    console.log('error in building query:', e);
  }
};
