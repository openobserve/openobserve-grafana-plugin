import React from 'react';
import { act, render } from '@testing-library/react';
import { ZincEditor } from './ZincEditor';

describe('ZincEditor', () => {
  let props: any;
  let wrapper: any;

  beforeEach(async () => {
    props = {
      query: '',
      onChange: jest.fn(),
      placeholder: '',
      fields: [],
      runQuery: jest.fn(),
    };

    await act(async () => {
      wrapper = render(<ZincEditor {...props} />);
    });
  });

  it('renders without crashing', async () => {
    expect(wrapper).not.toBeNull();
  });
});
