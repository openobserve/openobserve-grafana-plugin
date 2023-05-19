/* eslint-disable react/no-unescaped-entities */
import React from 'react';
import { QueryEditorHelpProps } from '@grafana/data';
import { MyQuery } from '../types';
import { css } from '@emotion/css';

export function QueryEditorHelp(props: QueryEditorHelpProps<MyQuery>) {
  const line = css`
    margin-left: 8px;
  `;
  const lineContainer = css`
    margin: 2px 0;
  `;
  return (
    <div>
      <div className="syntax-guide-text">
        {props.query.sqlMode ? (
          <ul className="guide-list">
            <li className={lineContainer}>
              For full text search of value 'error' use
              <code className={line}>
                SELECT * FROM <b>stream</b> WHERE match_all('error')
              </code>
            </li>
            <li className={lineContainer}>
              For case-insensitive full text search of value 'error' use
              <code className={line}>
                SELECT * FROM <b>stream</b> WHERE match_all_ignore_case('error')
              </code>
            </li>
            <li className={lineContainer}>
              For column search of value 'error' use
              <code className={line}>
                SELECT * FROM <b>stream</b> WHERE str_match(<b>fieldname</b>, 'error')
              </code>
            </li>
            <li className={lineContainer}>
              To search value 200 for code column use
              <code className={line}>
                SELECT * FROM <b>stream</b> WHERE code=200
              </code>
            </li>
            <li className={lineContainer}>
              To search value 'stderr' for stream column use
              <code className={line}>
                SELECT * FROM <b>stream</b> WHERE stream='stderr'
              </code>
            </li>
            <li className={lineContainer}>
              For additional examples,
              <a
                className={css`
                  margin-left: 4px;
                  text-decoration: underline;
                `}
                href="https://docs.zinc.dev/example-queries/"
                target="_blank"
                rel="noreferrer"
              >
                click here
              </a>
              .
            </li>
          </ul>
        ) : (
          <ul className="guide-list">
            <li className={lineContainer}>
              For full text search of value 'error' use
              <code className={line}>match_all('error') in query editor</code>
            </li>
            <li className={lineContainer}>
              For case-insensitive full text search of value 'error' use
              <code className={line}>match_all_ignore_case('error')</code>
            </li>
            <li className={lineContainer}>
              For column search of value 'error' use
              <code className={line}>
                str_match(<b>fieldname</b>, 'error')
              </code>
            </li>
            <li className={lineContainer}>
              To search value 200 for code column use
              <code className={line}>code=200</code>
            </li>
            <li className={lineContainer}>
              To search value 'stderr' for stream column use
              <code className={line}>stream='stderr'</code>
            </li>
            <li>
              For additional examples,
              <a
                className={css`
                  margin-left: 4px;
                  text-decoration: underline;
                `}
                href="https://docs.zinc.dev/example-queries/"
                target="_blank"
                rel="noreferrer"
              >
                click here
              </a>
              .
            </li>
          </ul>
        )}
      </div>
    </div>
  );
}
