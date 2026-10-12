import { render, screen } from '@testing-library/react';
import { expect, it } from 'vitest';
import { ResultsList } from './ResultsList';

it('renders untrusted result text without creating executable links', () => {
  render(
    <ResultsList
      results={[
        {
          title: '<script>unsafe</script>',
          url: 'javascript:alert(1)',
          snippet: '<b>plain text</b>',
          domain: 'untrusted.test',
          position: null,
        },
      ]}
    />,
  );
  expect(screen.getByText('<script>unsafe</script>')).toBeInTheDocument();
  expect(screen.getByText('<b>plain text</b>')).toBeInTheDocument();
  expect(screen.queryByRole('link')).not.toBeInTheDocument();
  expect(screen.getByLabelText('Position unavailable')).toHaveTextContent('—');
});
