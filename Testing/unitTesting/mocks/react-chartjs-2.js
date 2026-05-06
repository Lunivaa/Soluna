import React from 'react';

export const Bar = () => React.createElement('div', { 'data-testid': 'bar-chart' });
export const Line = () => React.createElement('div', { 'data-testid': 'line-chart' });
export const Pie = () => React.createElement('div', { 'data-testid': 'pie-chart' });
export const Doughnut = () => React.createElement('div', { 'data-testid': 'doughnut-chart' });

export default {
  Bar,
  Line,
  Pie,
  Doughnut
};
