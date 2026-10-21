import React, { createContext, useContext, useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const HeaderContext = createContext({
  headerConfig: null,
  setHeaderConfig: () => {}
});

export function HeaderProvider({ children }) {
  const [headerConfig, setHeaderConfig] = useState(null);
  const location = useLocation();

  // Reset custom header configuration whenever navigation occurs
  useEffect(() => {
    setHeaderConfig(null);
  }, [location.pathname]);

  return (
    <HeaderContext.Provider value={{ headerConfig, setHeaderConfig }}>
      {children}
    </HeaderContext.Provider>
  );
}

export function useHeader() {
  return useContext(HeaderContext);
}
