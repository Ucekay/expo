import React from 'react';
import { Text, View } from 'react-native';

import { store } from '../global-state/router-store';
import { useLocalSearchParams } from '../hooks';
import { router } from '../imperative-api';
import Stack from '../layouts/Stack';
import Tabs from '../layouts/Tabs';
import { act, renderRouter, screen, testRouter } from '../testing-library';
import { Slot } from '../views/Navigator';

it('stacks should always push a new route', () => {
  renderRouter({
    index: () => null,
    '(group)/_layout': () => <Stack />,
    '(group)/user/[id]/_layout': () => <Stack />,
    '(group)/user/[id]/index': function User() {
      return <View testID={JSON.stringify(useLocalSearchParams())} />;
    },
    '(group)/post/[id]/_layout': () => <Stack />,
    '(group)/post/[id]/index': () => null,
  });

  // Initial stale state
  expect(store.state).toStrictEqual({
    routes: [{ name: '__root', state: { routes: [{ name: 'index', path: '/' }], stale: true } }],
    stale: true,
  });

  /**
   * Need to push separately so a new state is generated every time, otherwise they are batched
   * Every `push` event should create a new history frame
   */
  act(() => router.push('/post/1'));
  act(() => router.push('/user/1'));
  act(() => router.push('/post/2'));
  act(() => router.push('/user/1'));
  act(() => router.push('/user/2'));

  expect(store.state).toStrictEqual({
    index: 0,
    key: expect.any(String),
    preloadedRoutes: [],
    routeNames: ['__root'],
    routes: [
      {
        key: expect.any(String),
        name: '__root',
        params: undefined,
        state: {
          index: 1,
          key: expect.any(String),
          preloadedRoutes: [],
          routeNames: ['index', '(group)', '_sitemap', '+not-found'],
          routes: [
            {
              key: expect.any(String),
              name: 'index',
              params: undefined,
              path: '/',
            },
            {
              key: expect.any(String),
              name: '(group)',
              params: {
                id: '1',
              },
              path: undefined,
              state: {
                index: 3,
                key: expect.any(String),
                preloadedRoutes: [],
                routeNames: ['user/[id]', 'post/[id]'],
                routes: [
                  {
                    key: expect.any(String),
                    name: 'post/[id]',
                    params: {
                      id: '1',
                      params: {
                        id: '1',
                      },
                      screen: 'index',
                    },
                    path: undefined,
                  },
                  {
                    key: expect.any(String),
                    name: 'user/[id]',
                    params: {
                      id: '1',
                      params: {
                        id: '1',
                      },
                      screen: 'index',
                    },
                    path: undefined,
                  },
                  {
                    key: expect.any(String),
                    name: 'post/[id]',
                    params: {
                      id: '2',
                      params: {
                        id: '2',
                      },
                      screen: 'index',
                    },
                    path: undefined,
                  },
                  {
                    key: expect.any(String),
                    name: 'user/[id]',
                    params: {
                      id: '1',
                    },
                    path: undefined,
                    state: {
                      index: 1,
                      key: expect.any(String),
                      preloadedRoutes: [],
                      routeNames: ['index'],
                      routes: [
                        {
                          key: expect.any(String),
                          name: 'index',
                          params: {
                            id: '1',
                          },
                          path: undefined,
                        },
                        {
                          key: expect.any(String),
                          name: 'index',
                          params: {
                            id: '2',
                          },
                          path: undefined,
                        },
                      ],
                      stale: false,
                      type: 'stack',
                    },
                  },
                ],
                stale: false,
                type: 'stack',
              },
            },
          ],
          stale: false,
          type: 'stack',
        },
      },
    ],
    stale: false,
    type: 'stack',
  });
});

it('can push & replace with nested Slots', async () => {
  renderRouter({
    _layout: () => <Slot />,
    index: () => <Text testID="index" />,
    'one/_layout': () => <Slot />,
    'one/index': () => <Text testID="one" />,
  });

  act(() => router.push('/one'));
  expect(screen).toHavePathname('/one');
  expect(screen.getByTestId('one')).toBeOnTheScreen();

  // Correctly targets the `root` slot (sets target: <root layout key>)
  act(() => router.push('/'));
  expect(screen).toHavePathname('/');
  expect(screen.getByTestId('index')).toBeOnTheScreen();
});

it('should navigate as expected when nested Stacks & Tabs', async () => {
  renderRouter({
    index: () => <Text testID="index" />,
    'apple/_layout': () => <Stack />,
    'apple/index': () => <Text testID="apple" />,
    'apple/[type]/_layout': () => <Tabs />,
    'apple/[type]/color': () => <Text testID="color" />,
    'apple/[type]/taste': () => <Text testID="taste" />,
  });

  act(() => router.push('/apple')); // Push to the root Stack
  expect(screen).toHavePathname('/apple');
  expect(screen.getByTestId('apple')).toBeOnTheScreen();

  act(() => router.push('/apple/1/color')); // Push to the apple/layout
  expect(screen).toHavePathname('/apple/1/color');

  act(() => router.push('/apple/1/taste')); // Tabs don't push, so this doesn't affect the history
  expect(screen).toHavePathname('/apple/1/taste');

  act(() => router.push('/apple/2/taste')); // [type] is outside of the tabs, so it pushed to apple/_layout
  expect(screen).toHavePathname('/apple/2/taste');

  act(() => router.push('/apple/2/color')); // Tabs don't push, so this doesn't affect the history
  expect(screen).toHavePathname('/apple/2/color');

  act(() => router.back());
  expect(screen).toHavePathname('/apple/1/taste');

  act(() => router.back());
  expect(screen).toHavePathname('/apple/1/color');

  act(() => router.back());
  expect(screen).toHavePathname('/apple');
});

it('works in a nested layout Stack->Tab->Stack', () => {
  renderRouter({
    index: () => null,
    _layout: () => <Stack />,
    '(tabs)/_layout': () => <Tabs />,
    '(tabs)/a': () => <Text testID="a" />,
    '(tabs)/b': () => <Text testID="b" />,
    '(tabs)/c/_layout': () => <Stack />,
    '(tabs)/c/one': () => <Text testID="c/one" />,
    '(tabs)/c/two': () => <Text testID="c/two" />,
    d: () => null,
  });

  testRouter.push('/a');
  expect(screen.getByTestId('a')).toBeOnTheScreen();
  testRouter.push('/b');
  expect(screen.getByTestId('b')).toBeOnTheScreen();
  testRouter.push('/c/one');
  expect(screen.getByTestId('c/one')).toBeOnTheScreen();
  testRouter.push('/c/two');
  expect(screen.getByTestId('c/two')).toBeOnTheScreen();
  testRouter.push('/c/two');
  expect(screen.getByTestId('c/two')).toBeOnTheScreen();

  testRouter.push('/d');

  expect(store.state).toStrictEqual({
    index: 0,
    key: expect.any(String),
    preloadedRoutes: [],
    routeNames: ['__root'],
    routes: [
      {
        key: expect.any(String),
        name: '__root',
        params: undefined,
        state: {
          index: 2,
          key: expect.any(String),
          preloadedRoutes: [],
          routeNames: ['index', '(tabs)', 'd', '_sitemap', '+not-found'],
          routes: [
            {
              key: expect.any(String),
              name: 'index',
              params: undefined,
              path: '/',
            },
            {
              key: expect.any(String),
              name: '(tabs)',
              path: undefined,
              state: {
                history: [
                  {
                    key: expect.any(String),
                    type: 'route',
                  },
                  {
                    key: expect.any(String),
                    type: 'route',
                  },
                ],
                index: 2,
                key: expect.any(String),
                preloadedRouteKeys: [],
                routeNames: ['a', 'b', 'c'],
                routes: [
                  {
                    key: expect.any(String),
                    name: 'a',
                    params: {},
                    path: undefined,
                  },
                  {
                    key: expect.any(String),
                    name: 'b',
                    params: {},
                    path: undefined,
                  },
                  {
                    key: expect.any(String),
                    name: 'c',
                    path: undefined,
                    state: {
                      index: 2,
                      key: expect.any(String),
                      preloadedRoutes: [],
                      routeNames: ['one', 'two'],
                      routes: [
                        {
                          key: expect.any(String),
                          name: 'one',
                          params: {},
                          path: undefined,
                        },
                        {
                          key: expect.any(String),
                          name: 'two',
                          params: {},
                          path: undefined,
                        },
                        {
                          key: expect.any(String),
                          name: 'two',
                          params: {},
                          path: undefined,
                        },
                      ],
                      stale: false,
                      type: 'stack',
                    },
                  },
                ],
                stale: false,
                type: 'tab',
              },
            },
            {
              key: expect.any(String),
              name: 'd',
              params: {},
              path: undefined,
            },
          ],
          stale: false,
          type: 'stack',
        },
      },
    ],
    stale: false,
    type: 'stack',
  });
});

it('targets the correct Stack when pushing to a nested layout', () => {
  renderRouter(
    {
      _layout: () => <Stack />,
      a: () => null,
      b: () => null,
      'one/_layout': () => <Stack />,
      'one/index': () => <View testID="one" />,
      'one/page': () => <View testID="one/page" />,
      'one/two/_layout': () => <Stack />,
      'one/two/index': () => <View testID="one/two" />,
      'one/two/page': () => <View testID="one/two/page" />,
    },
    {
      initialUrl: '/a',
    }
  );

  act(() => router.push('/b')); // Should at at index 1 on the root stack

  act(() => router.push('/one')); // Should at at index 2 on the root stack
  expect(screen.getByTestId('one')).toBeOnTheScreen();

  act(() => router.push('/one/page')); // Should at at index 1, nested inside index 2 on the root stack
  expect(screen.getByTestId('one/page')).toBeOnTheScreen();

  act(() => router.push('/one/two')); // Should at at index 2, nested inside index 2 on the root stack
  expect(screen.getByTestId('one/two')).toBeOnTheScreen();

  act(() => router.push('/one/two/page')); // Should at at index 1, nested inside index 2, inside index 2 on the root stack
  expect(screen.getByTestId('one/two/page')).toBeOnTheScreen();

  act(() => router.push('/a')); // Should push to the root stack

  expect(store.state).toStrictEqual({
    index: 0,
    key: expect.any(String),
    preloadedRoutes: [],
    routeNames: ['__root'],
    routes: [
      {
        key: expect.any(String),
        name: '__root',
        params: undefined,
        state: {
          index: 3,
          key: expect.any(String),
          preloadedRoutes: [],
          routeNames: ['a', 'b', 'one', '_sitemap', '+not-found'],
          routes: [
            {
              key: expect.any(String),
              name: 'a',
              params: undefined,
              path: '/a',
            },
            {
              key: expect.any(String),
              name: 'b',
              params: {},
              path: undefined,
            },
            {
              key: expect.any(String),
              name: 'one',
              path: undefined,
              state: {
                index: 2,
                key: expect.any(String),
                preloadedRoutes: [],
                routeNames: ['index', 'two', 'page'],
                routes: [
                  {
                    key: expect.any(String),
                    name: 'index',
                    params: {},
                    path: undefined,
                  },
                  {
                    key: expect.any(String),
                    name: 'page',
                    params: {},
                    path: undefined,
                  },
                  {
                    key: expect.any(String),
                    name: 'two',
                    path: undefined,
                    state: {
                      index: 1,
                      key: expect.any(String),
                      preloadedRoutes: [],
                      routeNames: ['index', 'page'],
                      routes: [
                        {
                          key: expect.any(String),
                          name: 'index',
                          params: {},
                          path: undefined,
                        },
                        {
                          key: expect.any(String),
                          name: 'page',
                          params: {},
                          path: undefined,
                        },
                      ],
                      stale: false,
                      type: 'stack',
                    },
                  },
                ],
                stale: false,
                type: 'stack',
              },
            },
            {
              key: expect.any(String),
              name: 'a',
              params: {},
              path: undefined,
            },
          ],
          stale: false,
          type: 'stack',
        },
      },
    ],
    stale: false,
    type: 'stack',
  });
});

it('push should also add anchor routes', () => {
  renderRouter({
    index: () => null,
    '(group)/_layout': {
      default: () => <Stack />,
      unstable_settings: {
        anchor: 'apple',
      },
    },
    '(group)/index': () => null,
    '(group)/apple': () => null,
    '(group)/orange': () => null,
  });

  // Initial stale state
  expect(store.state).toStrictEqual({
    routes: [
      {
        name: '__root',
        state: {
          routes: [
            {
              name: 'index',
              path: '/',
            },
          ],
          stale: true,
        },
      },
    ],
    stale: true,
  });

  act(() => router.push('/orange', { withAnchor: true }));

  expect(store.state).toStrictEqual({
    index: 0,
    key: expect.any(String),
    preloadedRoutes: [],
    routeNames: ['__root'],
    routes: [
      {
        key: expect.any(String),
        name: '__root',
        params: undefined,
        state: {
          index: 1,
          key: expect.any(String),
          preloadedRoutes: [],
          routeNames: ['index', '(group)', '_sitemap', '+not-found'],
          routes: [
            {
              key: expect.any(String),
              name: 'index',
              params: undefined,
              path: '/',
            },
            {
              key: expect.any(String),
              name: '(group)',
              path: undefined,
              state: {
                index: 1,
                key: expect.any(String),
                preloadedRoutes: [],
                routeNames: ['apple', 'index', 'orange'],
                routes: [
                  {
                    key: expect.any(String),
                    name: 'apple',
                    params: undefined,
                  },
                  {
                    key: expect.any(String),
                    name: 'orange',
                    params: {},
                    path: undefined,
                  },
                ],
                stale: false,
                type: 'stack',
              },
            },
          ],
          stale: false,
          type: 'stack',
        },
      },
    ],
    stale: false,
    type: 'stack',
  });
});

describe('singular', () => {
  test('can dynamically route using singular', () => {
    renderRouter(
      {
        '[slug]': () => null,
      },
      {
        initialUrl: '/apple',
      }
    );

    act(() => router.push('/apple'));
    act(() => router.push('/apple'));
    act(() => router.push('/banana'));

    expect(screen).toHaveRouterState({
      index: 0,
      key: expect.any(String),
      preloadedRoutes: [],
      routeNames: ['__root'],
      routes: [
        {
          key: expect.any(String),
          name: '__root',
          params: {
            slug: 'apple',
          },
          state: {
            index: 3,
            key: expect.any(String),
            preloadedRoutes: [],
            routeNames: ['_sitemap', '[slug]', '+not-found'],
            routes: [
              {
                key: expect.any(String),
                name: '[slug]',
                params: {
                  slug: 'apple',
                },
                path: '/apple',
              },
              {
                key: expect.any(String),
                name: '[slug]',
                params: {
                  slug: 'apple',
                },
                path: undefined,
              },
              {
                key: expect.any(String),
                name: '[slug]',
                params: {
                  slug: 'apple',
                },
                path: undefined,
              },
              {
                key: expect.any(String),
                name: '[slug]',
                params: {
                  slug: 'banana',
                },
                path: undefined,
              },
            ],
            stale: false,
            type: 'stack',
          },
        },
      ],
      stale: false,
      type: 'stack',
    });

    // Should push /apple and remove all previous instances of /apple
    act(() => router.push('/apple', { dangerouslySingular: true }));

    expect(screen).toHaveRouterState({
      index: 0,
      key: expect.any(String),
      preloadedRoutes: [],
      routeNames: ['__root'],
      routes: [
        {
          key: expect.any(String),
          name: '__root',
          params: {
            slug: 'apple',
          },
          state: {
            index: 1,
            key: expect.any(String),
            preloadedRoutes: [],
            routeNames: ['_sitemap', '[slug]', '+not-found'],
            routes: [
              {
                key: expect.any(String),
                name: '[slug]',
                params: {
                  slug: 'banana',
                },
                path: undefined,
              },
              {
                key: expect.any(String),
                name: '[slug]',
                params: {
                  slug: 'apple',
                },
                path: undefined,
              },
            ],
            stale: false,
            type: 'stack',
          },
        },
      ],
      stale: false,
      type: 'stack',
    });
  });

  test('can dynamically route using singular function', () => {
    renderRouter(
      {
        '[slug]': () => null,
      },
      {
        initialUrl: '/apple',
      }
    );

    act(() => router.push('/apple?id=1'));
    act(() => router.push('/apple?id=1'));
    act(() => router.push('/apple?id=2'));
    act(() => router.push('/banana'));

    expect(screen).toHaveRouterState({
      index: 0,
      key: expect.any(String),
      preloadedRoutes: [],
      routeNames: ['__root'],
      routes: [
        {
          key: expect.any(String),
          name: '__root',
          params: {
            slug: 'apple',
          },
          state: {
            index: 4,
            key: expect.any(String),
            preloadedRoutes: [],
            routeNames: ['_sitemap', '[slug]', '+not-found'],
            routes: [
              {
                key: expect.any(String),
                name: '[slug]',
                params: {
                  slug: 'apple',
                },
                path: '/apple',
              },
              {
                key: expect.any(String),
                name: '[slug]',
                params: {
                  id: '1',
                  slug: 'apple',
                },
                path: undefined,
              },
              {
                key: expect.any(String),
                name: '[slug]',
                params: {
                  id: '1',
                  slug: 'apple',
                },
                path: undefined,
              },
              {
                key: expect.any(String),
                name: '[slug]',
                params: {
                  id: '2',
                  slug: 'apple',
                },
                path: undefined,
              },
              {
                key: expect.any(String),
                name: '[slug]',
                params: {
                  slug: 'banana',
                },
                path: undefined,
              },
            ],
            stale: false,
            type: 'stack',
          },
        },
      ],
      stale: false,
      type: 'stack',
    });

    // Should push /apple and remove all previous instances of /apple
    act(() => {
      return router.push('/apple', { dangerouslySingular: (_, params) => params.slug?.toString() });
    });

    expect(screen).toHaveRouterState({
      index: 0,
      key: expect.any(String),
      preloadedRoutes: [],
      routeNames: ['__root'],
      routes: [
        {
          key: expect.any(String),
          name: '__root',
          params: {
            slug: 'apple',
          },
          state: {
            index: 1,
            key: expect.any(String),
            preloadedRoutes: [],
            routeNames: ['_sitemap', '[slug]', '+not-found'],
            routes: [
              {
                key: expect.any(String),
                name: '[slug]',
                params: {
                  slug: 'banana',
                },
                path: undefined,
              },
              {
                key: expect.any(String),
                name: '[slug]',
                params: {
                  slug: 'apple',
                },
                path: undefined,
              },
            ],
            stale: false,
            type: 'stack',
          },
        },
      ],
      stale: false,
      type: 'stack',
    });
  });
});
