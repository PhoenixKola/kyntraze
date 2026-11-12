import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './app/App';
import { validateContent } from './content/validateContent';
const issues = validateContent(); if (issues.length) throw new Error(`Content validation failed: ${issues.join('; ')}`);
ReactDOM.createRoot(document.getElementById('root')!).render(<React.StrictMode><App/></React.StrictMode>);
