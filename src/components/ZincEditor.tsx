import React, { useRef } from 'react';
import { css } from '@emotion/css';
import { ReactMonacoEditor, monacoTypes } from '@grafana/ui';

interface Props {
  query: string;
  onChange: (queryText: string) => void;
  placeholder: string;
  fields: any[];
  runQuery: () => void;
}

export const ZincEditor = ({ query, onChange, placeholder, fields, runQuery }: Props): any => {
  const reactMonacoEditorRef = useRef(null);
  const options: monacoTypes.editor.IStandaloneEditorConstructionOptions = {
    wordWrap: 'on',
    lineNumbers: 'on',
    lineNumbersMinChars: 0,
    overviewRulerLanes: 0,
    fixedOverflowWidgets: false,
    overviewRulerBorder: false,
    lineDecorationsWidth: 3,
    hideCursorInOverviewRuler: true,
    renderLineHighlight: 'none',
    glyphMargin: false,
    folding: false,
    scrollBeyondLastColumn: 0,
    scrollBeyondLastLine: true,
    scrollbar: { horizontal: 'auto', vertical: 'visible' },
    find: {
      addExtraSpaceOnTop: false,
      autoFindInSelection: 'never',
      seedSearchStringFromSelection: 'never',
    },
    minimap: { enabled: false },
  };

  const createDependencyProposals = (range: any, monaco: any) => {
    const keywords = [
      {
        label: 'and',
        kind: monaco.languages.CompletionItemKind.Keyword,
        insertText: 'and ',
        range: range,
      },
      {
        label: 'or',
        kind: monaco.languages.CompletionItemKind.Keyword,
        insertText: 'or ',
        range: range,
      },
      {
        label: 'like',
        kind: monaco.languages.CompletionItemKind.Keyword,
        insertText: "like '%${1:params}%' ",
        range: range,
      },
      {
        label: 'in',
        kind: monaco.languages.CompletionItemKind.Keyword,
        insertText: "in ('${1:params}') ",
        range: range,
        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
      },
      {
        label: 'not in',
        kind: monaco.languages.CompletionItemKind.Keyword,
        insertText: "not in ('${1:params}') ",
        range: range,
        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
      },
      {
        label: 'between',
        kind: monaco.languages.CompletionItemKind.Keyword,
        insertText: "between '${1:params}' and '${1:params}' ",
        range: range,
        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
      },
      {
        label: 'not between',
        kind: monaco.languages.CompletionItemKind.Keyword,
        insertText: "not between '${1:params}' and '${1:params}' ",
        range: range,
        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
      },
      {
        label: 'is null',
        kind: monaco.languages.CompletionItemKind.Keyword,
        insertText: 'is null ',
        range: range,
      },
      {
        label: 'is not null',
        kind: monaco.languages.CompletionItemKind.Keyword,
        insertText: 'is not null ',
        range: range,
      },
      {
        label: '>',
        kind: monaco.languages.CompletionItemKind.Operator,
        insertText: '> ',
        range: range,
      },
      {
        label: '<',
        kind: monaco.languages.CompletionItemKind.Operator,
        insertText: '< ',
        range: range,
      },
      {
        label: '>=',
        kind: monaco.languages.CompletionItemKind.Operator,
        insertText: '>= ',
        range: range,
      },
      {
        label: '<=',
        kind: monaco.languages.CompletionItemKind.Operator,
        insertText: '<= ',
        range: range,
      },
      {
        label: '<>',
        kind: monaco.languages.CompletionItemKind.Operator,
        insertText: '<> ',
        range: range,
      },
      {
        label: '=',
        kind: monaco.languages.CompletionItemKind.Operator,
        insertText: '= ',
        range: range,
      },
      {
        label: '!=',
        kind: monaco.languages.CompletionItemKind.Operator,
        insertText: '!= ',
        range: range,
      },
      {
        label: '()',
        kind: monaco.languages.CompletionItemKind.Keyword,
        insertText: '(${1:condition}) ',
        range: range,
        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
      },
    ];

    fields.forEach((field: any) => {
      if (field.name === '_timestamp') {
        return;
      }
      let itemObj = {
        label: field.name,
        kind: monaco.languages.CompletionItemKind.Text,
        insertText: field.name,
        range: range,
        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
      };
      keywords.push(itemObj);
    });

    return keywords;
  };

  const onEditorMount = (editor: any, monaco: any) => {
    console.log(reactMonacoEditorRef.current);
    monaco.languages.registerCompletionItemProvider('sql', {
      provideCompletionItems: function (model: any, position: any) {
        // find out if we are completing a property in the 'dependencies' object.
        let textUntilPosition = model.getValueInRange({
          startLineNumber: 1,
          startColumn: 1,
          endLineNumber: position.lineNumber,
          endColumn: position.column,
        });

        let word = model.getWordUntilPosition(position);
        let range = {
          startLineNumber: position.lineNumber,
          endLineNumber: position.lineNumber,
          startColumn: word.startColumn,
          endColumn: word.endColumn,
        };

        let arr = textUntilPosition.trim().split(' ');
        let filteredSuggestions = [];
        filteredSuggestions = createDependencyProposals(range, monaco);
        filteredSuggestions = filteredSuggestions.filter((item) => {
          return item.label.toLowerCase().includes(word.word.toLowerCase());
        });

        // if (filteredSuggestions.length == 0) {
        const lastElement = arr.pop();

        filteredSuggestions.push({
          label: `match_all('${lastElement}')`,
          kind: monaco.languages.CompletionItemKind.Text,
          insertText: `match_all('${lastElement}')`,
          range: range,
        });
        filteredSuggestions.push({
          label: `match_all_ignore_case('${lastElement}')`,
          kind: monaco.languages.CompletionItemKind.Text,
          insertText: `match_all_ignore_case('${lastElement}')`,
          range: range,
        });

        return {
          suggestions: filteredSuggestions,
        };
      },
    });

    editor.onDidChangeModelContent((e: any) => {
      onChange(editor.getValue());
    });

    editor.createContextKey('ctrlenter', true);
    editor.addCommand(
      monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter,
      function () {
        runQuery();
      },
      'ctrlenter'
    );

    window.addEventListener('click', () => {
      editor.layout();
    });
  };

  return (
    <>
      <ReactMonacoEditor
        data-testid="zinc-editor-react-monaco-editor"
        options={options}
        onMount={onEditorMount}
        value={query}
        language="sql"
        className={css`
          height: 100px;
          max-height: 200px;
        `}
      ></ReactMonacoEditor>
    </>
  );
};
