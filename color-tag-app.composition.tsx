import { MemoryRouter } from 'react-router-dom';
import { ColorTagApp } from "./color-tag-app.js";

export const ColorTagAppBasic = () => {
  return (
    <MemoryRouter>
      <ColorTagApp />
    </MemoryRouter>
  );
}
