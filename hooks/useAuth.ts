
import { useState, useEffect, useCallback, useMemo } from 'react';
import { PublicClientApplication } from '@azure/msal-browser';
import { msalConfig, loginRequest, AUTHORIZED_DOMAIN } from '../authConfig';

export const useAuth = () => {
  const [msalInstance] = useState(() => new PublicClientApplication(msalConfig));
  const [account, setAccount] = useState<any | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState<boolean>(true);

  useEffect(() => {
    const initializeMsal = async () => {
      try {
        await msalInstance.initialize();
        const currentAccounts = msalInstance.getAllAccounts();
        if (currentAccounts.length > 0) {
          setAccount(currentAccounts[0]);
        }
      } catch (err: any) {
        console.error(err);
        setAuthError(err.errorMessage || 'An unknown authentication error occurred.');
      } finally {
        setIsAuthLoading(false);
      }
    };
    initializeMsal();
  }, [msalInstance]);

  const handleLogin = useCallback(async () => {
    try {
      const response = await msalInstance.loginPopup(loginRequest);
      setAccount(response.account);
    } catch (e: any) {
      console.error(e);
      setAuthError(e.errorMessage || 'Login failed.');
    }
  }, [msalInstance]);

  const handleLogout = useCallback(async () => {
    if (account) {
      try {
        await msalInstance.logoutPopup({ account });
        setAccount(null);
      } catch (e: any) {
        console.error(e);
        setAuthError(e.errorMessage || 'Logout failed.');
      }
    }
  }, [msalInstance, account]);

  const isAuthorized = useMemo(() => {
    if (!account) return false;
    const username = account.username || '';
    return username.toLowerCase().endsWith(`@${AUTHORIZED_DOMAIN}`);
  }, [account]);

  return {
    account,
    isAuthorized,
    isAuthLoading,
    authError,
    handleLogin,
    handleLogout,
  };
};
