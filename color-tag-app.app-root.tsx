import { BrowserRouter } from 'react-router-dom';
import { createRoot } from 'react-dom/client';
import { ColorTagApp } from "./color-tag-app.js";

if (import.meta.hot) import.meta.hot.accept();

const container = document.getElementById('root');
const root = createRoot(container!);

root.render(
  <BrowserRouter>
    <ColorTagApp />
  </BrowserRouter>
);
