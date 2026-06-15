import React, {
  createContext,
  useContext,
  useReducer,
  ReactNode,
  useEffect,
} from 'react';

import { AppState } from '../../shared/types';

type AppAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_SERVER_URL'; payload: string }
  | { type: 'CLEAR_ERROR' };

const getBaseUrl = () => {
  const port = process.env.REACT_APP_BACKEND_PORT || '3001';
  let hostname = '127.0.0.1';
  if (typeof window !== 'undefined') {
    hostname =
      window.location.hostname === 'localhost'
        ? '127.0.0.1'
        : window.location.hostname;
  }
  return `http://${hostname}:${port}`;
};

const initialState: AppState = {
  loading: false,
  error: null,
  serverUrl: getBaseUrl(),
};

const AppContext = createContext<
  | {
      state: AppState;
      dispatch: React.Dispatch<AppAction>;
    }
  | undefined
>(undefined);

function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    case 'SET_ERROR':
      return { ...state, error: action.payload, loading: false };
    case 'CLEAR_ERROR':
      return { ...state, error: null };
    case 'SET_SERVER_URL':
      return { ...state, serverUrl: action.payload };
    default:
      return state;
  }
}

export const AppProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [state, dispatch] = useReducer(appReducer, initialState);

  useEffect(() => {
    // For web app, server URL is based on environment variable and hostname
    dispatch({
      type: 'SET_SERVER_URL',
      payload: getBaseUrl(),
    });
  }, []);

  return (
    <AppContext.Provider value={{ state, dispatch }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
