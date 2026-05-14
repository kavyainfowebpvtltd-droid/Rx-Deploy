import { useEffect } from 'react';
import { RouterProvider } from 'react-router';
import { router } from './routes.js';

const applyMobileTableLabels = () => {
  document.querySelectorAll('table').forEach((table) => {
    const headers = Array.from(table.querySelectorAll('thead th')).map((header) =>
      header.textContent.replace(/\s+/g, ' ').trim(),
    );

    if (headers.length === 0) {
      return;
    }

    table.querySelectorAll('tbody tr').forEach((row) => {
      let cellIndex = 0;

      row.querySelectorAll('td').forEach((cell) => {
        const colSpan = Number(cell.getAttribute('colspan') || 1);

        if (colSpan > 1) {
          cell.dataset.label = '';
          cellIndex += colSpan;
          return;
        }

        cell.dataset.label = headers[cellIndex] || '';
        cellIndex += colSpan;
      });
    });
  });
};

export default function App() {
  useEffect(() => {
    applyMobileTableLabels();

    const observer = new MutationObserver(() => {
      window.requestAnimationFrame(applyMobileTableLabels);
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });

    return () => observer.disconnect();
  }, []);

  return <RouterProvider router={router} />;
}
