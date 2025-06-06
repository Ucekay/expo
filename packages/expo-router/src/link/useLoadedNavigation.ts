import { NavigationProp, NavigationState, useNavigation } from '@react-navigation/native';
import { useCallback, useState, useEffect, useRef } from 'react';

import { store } from '../global-state/router-store';

type GenericNavigation = NavigationProp<ReactNavigation.RootParamList> & {
  getState(): NavigationState | undefined;
};

/** Returns a callback which is invoked when the navigation state has loaded. */
export function useLoadedNavigation() {
  const navigation = useNavigation();
  const isMounted = useRef(true);
  const pending = useRef<((navigation: GenericNavigation) => void)[]>([]);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  const flush = useCallback(() => {
    if (isMounted.current) {
      const pendingCallbacks = pending.current;
      pending.current = [];
      pendingCallbacks.forEach((callback) => {
        callback(navigation as GenericNavigation);
      });
    }
  }, [navigation]);

  useEffect(() => {
    if (store.navigationRef.current) {
      flush();
    }
  }, [flush]);

  const push = useCallback(
    (fn: (navigation: GenericNavigation) => void) => {
      pending.current.push(fn);
      if (store.navigationRef.current) {
        flush();
      }
    },
    [flush]
  );

  return push;
}

export function useOptionalNavigation(): GenericNavigation | null {
  const [navigation, setNavigation] = useState<GenericNavigation | null>(null);
  const loadNavigation = useLoadedNavigation();

  useEffect(() => {
    loadNavigation((nav) => setNavigation(nav));
  }, []);

  return navigation;
}
