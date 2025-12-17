// Mock for @elastic/react-search-ui
const React = require('react');

module.exports = {
  SearchProvider: ({ children }) => React.createElement('div', { 'data-testid': 'mock-search-provider' }, children),
  SearchBox: (props) => React.createElement('input', { 
    'data-testid': 'mock-search-box',
    placeholder: props.inputProps?.placeholder,
    className: props.className
  }),
};
