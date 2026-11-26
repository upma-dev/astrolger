// Contexts live in their own module so hot-reloading av.jsx during development keeps the same context objects.
// (If they were re-created, already-mounted providers and their consumers would stop matching.)
import { createContext } from 'react';

export const AVCtx = createContext(null);
export const AppDataCtx = createContext({ data: null, loading: true, reload: () => {} });
