import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import { organizationsApi, tradingApi } from '../api';
import type { TradingAccount } from '../api/trading';
import * as SecureStore from 'expo-secure-store';

const SELECTED_ACCOUNT_KEY = 'rmsm.trading.selectedAccountId';

type TradingAccountContextValue = {
  organizationId: string | null;
  accounts: TradingAccount[];
  currentAccount: TradingAccount | null;
  loading: boolean;
  error: string | null;
  refreshAccounts: () => Promise<void>;
  selectAccount: (accountId: string) => Promise<void>;
};

const TradingAccountContext =
  createContext<TradingAccountContextValue | undefined>(undefined);

function chooseDefaultAccount(
  accounts: TradingAccount[],
  persistedAccountId: string | null,
): TradingAccount | null {
  if (persistedAccountId) {
    const persisted = accounts.find(
      (account) => account.id === persistedAccountId,
    );

    if (persisted) {
      return persisted;
    }
  }

  return (
    accounts.find(
      (account) =>
        account.type === 'DEMO' && account.status === 'ACTIVE',
    ) ??
    accounts.find((account) => account.type === 'DEMO') ??
    accounts[0] ??
    null
  );
}

export function TradingAccountProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [organizationId, setOrganizationId] = useState<string | null>(null);
  const [accounts, setAccounts] = useState<TradingAccount[]>([]);
  const [currentAccount, setCurrentAccount] =
    useState<TradingAccount | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refreshAccounts = useCallback(async () => {
    setError(null);

    try {
      const organizations = await organizationsApi.list();
      const organization = organizations.items[0];

      if (!organization) {
        throw new Error('No active organization is available.');
      }

      const nextAccounts = await tradingApi.listAccounts(organization.id);
console.log(
  "[TradingAccountProvider] AFTER listAccounts",
  JSON.stringify(
    {
      isArray: Array.isArray(nextAccounts),
      count: Array.isArray(nextAccounts) ? nextAccounts.length : null,
      accounts: Array.isArray(nextAccounts)
        ? nextAccounts.map((item) => ({
            id: item.id,
            name: item.name,
            type: item.type,
            status: item.status,
          }))
        : nextAccounts,
    },
    null,
    2,
  ),
);

      const persistedAccountId = await SecureStore.getItemAsync(
        SELECTED_ACCOUNT_KEY,
      );

      const nextCurrentAccount = chooseDefaultAccount(
        nextAccounts,
        persistedAccountId,
      );

      setOrganizationId(organization.id);
      setAccounts(nextAccounts);
      setCurrentAccount(nextCurrentAccount);

      if (nextCurrentAccount) {
        await SecureStore.setItemAsync(
          SELECTED_ACCOUNT_KEY,
          nextCurrentAccount.id,
        );
      }
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : 'Unable to load trading accounts.';

      console.error('[TradingAccountProvider] Failed to load accounts:', err);
      setError(message);
      setAccounts([]);
      setCurrentAccount(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const selectAccount = useCallback(
    async (accountId: string) => {
      const account = accounts.find((item) => item.id === accountId);

      if (!account) {
        throw new Error('Selected trading account is not available.');
      }

      setCurrentAccount(account);

      await SecureStore.setItemAsync(
        SELECTED_ACCOUNT_KEY,
        account.id,
      );
    },
    [accounts],
  );

  useEffect(() => {
    void refreshAccounts();
  }, [refreshAccounts]);

  const value = useMemo<TradingAccountContextValue>(
    () => ({
      organizationId,
      accounts,
      currentAccount,
      loading,
      error,
      refreshAccounts,
      selectAccount,
    }),
    [
      organizationId,
      accounts,
      currentAccount,
      loading,
      error,
      refreshAccounts,
      selectAccount,
    ],
  );

  return (
    <TradingAccountContext.Provider value={value}>
      {children}
    </TradingAccountContext.Provider>
  );
}

export function useTradingAccount(): TradingAccountContextValue {
  const context = useContext(TradingAccountContext);

  if (!context) {
    throw new Error(
      'useTradingAccount must be used inside TradingAccountProvider.',
    );
  }

  return context;
}
