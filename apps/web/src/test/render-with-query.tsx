/**
 * Shared React Query testing infrastructure.
 *
 * Every test that renders a component (or hook) backed by `useQuery` /
 * `useMutation` needs an isolated `QueryClient` with retries disabled and a
 * predictable teardown. Before this module existed, each test file
 * duplicated:
 *
 *   const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
 *   render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
 *
 * with no teardown at all — the client (and any in-flight fetches it kicked
 * off, e.g. an `invalidateQueries()` refetch from a mutation's `onSuccess`)
 * was simply left to resolve whenever it resolved. When that happened to
 * land after the owning test's function had already returned, React logged
 * an "update ... was not wrapped in act(...)" warning attributed to
 * whichever component happened to be mounted at that moment — sometimes in
 * a completely unrelated test file, since Vitest reuses worker processes
 * across files in the same run.
 *
 * This module fixes that generically two ways:
 *
 * 1. `renderWithQueryClient` / `createQueryClientWrapper` register a
 *    per-test teardown (via `afterEach`) that waits for the client's
 *    in-flight queries/mutations to settle *before* clearing it, so any
 *    background work a test triggers is resolved inside that test's own
 *    window instead of leaking into the next one.
 *
 * 2. Independently of that, React Query's `notifyManager` schedules every
 *    query/mutation state-change notification through `setTimeout(fn, 0)`
 *    (see `@tanstack/query-core`'s `notifyManager.ts`) rather than
 *    delivering it synchronously. That means the `setState` calls backing
 *    a query going idle -> loading -> success always happen in their own
 *    macrotask, outside whatever `act()` call happened to be on the stack
 *    when the fetch was kicked off — Testing Library's `waitFor`/`findBy*`
 *    usually paper over this by re-polling inside their own `act()`, but
 *    not every notification lands inside one of those polls. This is a
 *    known, documented gap (see `notifyManager.setNotifyFunction`'s own
 *    doc comment: "can be used to for example wrap notifications with
 *    `React.act` while running tests"). We wire that up once, at import
 *    time, below — the officially-recommended fix — so query/mutation
 *    notifications are always act()-wrapped regardless of which test
 *    triggered them.
 */
import type { ReactElement, ReactNode } from "react";
import { afterEach } from "vitest";
import {
  MutationCache,
  notifyManager,
  QueryCache,
  QueryClient,
  QueryClientProvider,
  type QueryClientConfig,
} from "@tanstack/react-query";
import {
  act,
  render,
  waitFor,
  type RenderOptions,
  type RenderResult,
} from "@testing-library/react";

// See point 2 above — route every React Query notification through
// act() so state updates from background work (background refetches,
// invalidateQueries-triggered refetches, mutation settling, etc.) are
// never reported as "not wrapped in act(...)", no matter which test or
// component happens to be on screen when the setTimeout(0) fires.
notifyManager.setNotifyFunction((fn) => {
  act(fn);
});
notifyManager.setBatchNotifyFunction((fn) => {
  act(fn);
});

export interface CreateTestQueryClientOptions {
  /**
   * React Query v5 no longer has a `logger` option on `QueryClientConfig` —
   * query/mutation errors are reported via `QueryCache`/`MutationCache`
   * `onError` instead. Most tests intentionally trigger error paths (e.g.
   * "shows an error message when the request fails"), so by default this
   * helper swallows that `onError` reporting to keep test output clean.
   * Set to `false` in a test that specifically asserts on error logging.
   */
  silenceErrors?: boolean;
  /** Escape hatch for a test that needs additional QueryClientConfig
   * (e.g. a custom queryCache) merged in on top of the test defaults. */
  config?: Partial<QueryClientConfig>;
}

/**
 * Build a `QueryClient` configured for tests:
 * - query & mutation retries disabled (no multi-second backoff delays
 *   inflating test time or timing out `waitFor`)
 * - `gcTime: Infinity` so nothing schedules a garbage-collection timer that
 *   could fire after the test/file has moved on
 * - query/mutation errors routed through a silent `onError` by default,
 *   instead of the noisy console reporting v4's `logger` used to provide
 */
export function createTestQueryClient(options: CreateTestQueryClientOptions = {}): QueryClient {
  const { silenceErrors = true, config } = options;

  return new QueryClient({
    queryCache: new QueryCache({
      onError: silenceErrors ? () => {} : undefined,
    }),
    mutationCache: new MutationCache({
      onError: silenceErrors ? () => {} : undefined,
    }),
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: Infinity,
      },
      mutations: {
        retry: false,
      },
    },
    ...config,
  });
}

/**
 * Wait for a `QueryClient`'s in-flight queries and mutations to settle
 * (e.g. a refetch kicked off by `invalidateQueries()` in a mutation's
 * `onSuccess`), then clear it. Used as the shared teardown for both
 * `renderWithQueryClient` and `createQueryClientWrapper` — pulled out on
 * its own so a test can also call it directly if it manages a `QueryClient`
 * by hand.
 *
 * The wait is bounded (1s) and never throws: a test whose component is
 * deliberately left in a loading/pending state (e.g. "shows a spinner
 * while the request is in flight") should not fail its own teardown.
 */
async function settleAndDispose(queryClient: QueryClient): Promise<void> {
  await waitFor(
    () => {
      if (queryClient.isFetching() > 0 || queryClient.isMutating() > 0) {
        throw new Error("react-query: waiting for in-flight activity to settle");
      }
    },
    { timeout: 1000, interval: 10 },
  ).catch(() => {
    // Intentionally swallowed — see comment above.
  });
  queryClient.clear();
}

const pendingTeardowns = new Set<() => Promise<void>>();

afterEach(async () => {
  for (const teardown of pendingTeardowns) {
    await teardown();
  }
  pendingTeardowns.clear();
});

export interface RenderWithQueryClientOptions extends Omit<RenderOptions, "wrapper">, CreateTestQueryClientOptions {
  /** Reuse a `QueryClient` you built yourself (e.g. to assert on its cache
   * afterwards) instead of having one created automatically. */
  queryClient?: QueryClient;
}

export interface RenderWithQueryClientResult extends RenderResult {
  queryClient: QueryClient;
}

/**
 * `render()` a component wrapped in a `QueryClientProvider`, using an
 * isolated, test-tuned `QueryClient` (see `createTestQueryClient`).
 *
 * Automatic cleanup: component unmount is still handled by Testing
 * Library's own auto-cleanup (`afterEach(cleanup)`, registered as soon as
 * `@testing-library/react` is imported normally, as it is here). This
 * module additionally registers an `afterEach` that waits for the
 * client's background work to settle and then calls `queryClient.clear()`,
 * so nothing from this test's `QueryClient` survives into the next test.
 */
export function renderWithQueryClient(
  ui: ReactElement,
  options: RenderWithQueryClientOptions = {},
): RenderWithQueryClientResult {
  const { queryClient: providedClient, silenceErrors, config, ...renderOptions } = options;
  const queryClient = providedClient ?? createTestQueryClient({ silenceErrors, config });

  function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  }

  const result = render(ui, { wrapper: Wrapper, ...renderOptions });

  pendingTeardowns.add(() => settleAndDispose(queryClient));

  return { ...result, queryClient };
}

export interface QueryClientWrapperResult {
  wrapper: ({ children }: { children: ReactNode }) => ReactElement;
  queryClient: QueryClient;
}

/**
 * Companion to `renderWithQueryClient` for `renderHook()` call sites
 * (`renderHook(() => useThing(), { wrapper })`), which need a bare wrapper
 * component rather than a full `render()` result. Registers the same
 * settle-then-clear teardown.
 */
export function createQueryClientWrapper(options: CreateTestQueryClientOptions = {}): QueryClientWrapperResult {
  const queryClient = createTestQueryClient(options);

  function wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  }

  pendingTeardowns.add(() => settleAndDispose(queryClient));

  return { wrapper, queryClient };
}
