import React from 'react';
import { QueryEditorHelpProps, DataQuery } from '@grafana/data';
import { MyQuery } from '../types.ts';

export function QueryEditorHelp(props: QueryEditorHelpProps<MyQuery>) {
  const examples = [
    {
      title: 'Addition',
      expression: '1 + 2',
      label: 'Add two integers',
    },
    {
      title: 'Subtraction',
      expression: '2 - 1',
      label: 'Subtract an integer from another',
    },
  ];
  return (
    <div>
      <h2>Cheat Sheet</h2>
      {examples.map((item, index) => (
        <div className="cheat-sheet-item" key={index}>
          <div className="cheat-sheet-item__title">{item.title}</div>
          {item.expression ? (
            <div
              className="cheat-sheet-item__example"
              onClick={(e) => props.onClickExample({ refId: 'A', queryText: item.expression } as DataQuery)}
            >
              <code>{item.expression}</code>
            </div>
          ) : null}
          <div className="cheat-sheet-item__label">{item.label}</div>
        </div>
      ))}
    </div>
  );
}
