import { createContext, useContext } from 'react';

/** A slip tells the sheet how tall its content wants to be, so a card with many choices can open taller. */
export const SheetFitContext = createContext<(contentPx: number) => void>(() => undefined);
export const useSheetFit = () => useContext(SheetFitContext);
