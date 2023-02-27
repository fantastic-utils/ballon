import * as React from 'react';
import { createStore as createReduxStore, applyMiddleware, Store } from 'redux';
import { create as produce } from 'mutative';
import { memo as memoizeOne, NormalizeArgCfg } from '@fantastic-utils/memo';
import useIsomorphicLayoutEffect from './utils/useIsomorphicLayoutEffect';

const { useContext, useState, useRef } = React;

export enum INTERNAL_TYPES {
  INIT_MODULE = '$$INIT_MODULE',
}

export interface RevocableProxy {
  revoke(): void;
  proxy: Object;
};

export type ByStoreAction = {
  type: string;
  [key: string]: any;
};
export type ByStoreActionFn = (state: Object, action: ByStoreAction) => void;
export type ByStoreGetterFn = (state: Object, getters: Object) => any;

export interface ByStoreActions {
  [key: string]: ByStoreActionFn;
}
export interface ByStoreGetters {
  [key: string]: ByStoreGetterFn;
}

export interface ByStoreModuleBase {
  default?: ByStoreModule;
  state: Object;
  actions?: ByStoreActions;
  getters?: ByStoreGetters;
}

export interface ByStoreModule extends ByStoreModuleBase {
  ns: string;
  namespaced?: boolean;
}

export interface ByStoreOptions extends ByStoreModuleBase {
  state: Object;
  actions: ByStoreActions;
  getters: ByStoreGetters;
  modules: Array<ByStoreModule>;
}

export interface NormalizedActions {
  [ns: string]: ByStoreActions;
}
export interface NormalizedGetters {
  [ns: string]: ByStoreGetters;
}
export interface NormalizedState {
  [ns: string]: Object;
}

export interface NormalizedModule {
  namespacedNs: Array<string>;
  actions: NormalizedActions
  getters: NormalizedGetters
  state: NormalizedState
}

export interface ByStateStore extends Store {
  getProxyGetters: () => RevocableProxy;
  destroyGetters: () => void;
}

export interface IStateProvider {
  store: ByStateStore;
  children: React.ReactNode;
}

export interface IDynamicModuleConfig {
  isLoaded?: boolean;
}

export interface DynamicModules {
  config: {
    [ns: string]: IDynamicModuleConfig;
  },
  actions: {
    [ns: string]: ByStoreActions;
  },
  getters: {
    [ns: string]: ByStoreGetters;
  },
  state: {
    [ns: string]: any;
  },
}

export type ContextValue = [any?, any?, any?, any?];

const dynamicModules: DynamicModules = {
  config: {},
  actions: {},
  getters: {},
  state: {},
};

const MyContext = React.createContext<ContextValue>([]);

export const StateProvider = ({ store, children }: IStateProvider) => {
  const { getState, dispatch } = store;
  const storeState = getState();
  const [state, setState] = useState(storeState);
  const refState = useRef(storeState);

  useIsomorphicLayoutEffect(() => {
    const unsubscribe = store.subscribe(() => {
      const newState = store.getState();
      setState(newState);
      refState.current = newState;
    });

    return () => {
      store.destroyGetters();
      unsubscribe();
    };
  }, [store]);

  return (
    <MyContext.Provider
      value={[state, dispatch, store.getProxyGetters(), refState]}
    >
      {children}
    </MyContext.Provider>
  );
};

export const useStore = () => useContext(MyContext);

const normalizeNamespace = (pattern = '') => {
  const [ns, target] = pattern.split('/');
  if (target) return { ns, target };
  return { target: ns };
};

const shouldCompare = (newArgs: any[] | undefined, cachedArgsCfg: NormalizeArgCfg[] | undefined) => {
  return !(newArgs?.[0] === cachedArgsCfg?.[0]?.r);
};

const getMemoGetters = (getters: ByStoreGetters = {}) => {
  const properties = Object.getOwnPropertyNames(getters);
  return properties.reduce(
    (prev, property) => ({
      ...prev,
      [property]: memoizeOne(getters[property], { shouldCompare }),
    }),
    {}
  );
};

const normalizeModules = (modules: Array<ByStoreModule> = []) => {
  const normalizedModules = modules.reduce((prev, cur) => {
    const { ns, namespaced, state, actions, getters } = cur;

    if (namespaced && !ns) {
      console.warn(`Namespaced module doesn't specify the 'ns' property, so this module will be discard.`);
      return prev;
    }

    const memoGetters = getMemoGetters(getters);
    const normalizedActions = namespaced ? { [ns as string]: actions } : actions;
    const normalizedGetters = namespaced ? { [ns as string]: memoGetters } : memoGetters;

    return {
      ...prev,
      namespacedNs: []
        .concat(prev.namespacedNs, (namespaced ? [ns] : []) as any)
        .filter(Boolean),
      state: { ...prev.state, [ns as string]: state },
      actions: { ...prev.actions, ...normalizedActions },
      getters: { ...prev.getters, ...normalizedGetters },
    };
  }, {} as any);
  return normalizedModules;
};

const normalizeImportModule = (module:  ByStoreModule) => module.default || module;

const createReducer = (actions: ByStoreActions) =>
  produce((draft: any, action) => {
    const { type } = action;
    if (!type) throw new Error("Can't dispatch a non-type action!");

    if (type === '$$INIT_MODULE') {
      const { ns, initState } = action;
      draft[ns] = initState;
      return draft;
    }

    const { ns, target } = normalizeNamespace(type);
    const actionsNs = ns
      ? (actions?.[ns] || dynamicModules.actions[ns])
      : actions;

    return (actionsNs as ByStoreActions)?.[target]?.(draft, action);
  });

export type proxyGetterMap = {
  [key: string]: RevocableProxy
}

let moduleProxyGettersMap: proxyGetterMap = {};
const clearModuleProxyGettersMap = () => {
  Object.keys(moduleProxyGettersMap).forEach((key) => {
    moduleProxyGettersMap[key].revoke();
  });
  moduleProxyGettersMap = {};
};

const gettersProxyHandler = (
  store: Store,
  rawGetters: NormalizedGetters | ByStoreGetters = {},
  namespacedNs: Array<string> = [],
  rootProxyGetters?: object,
) => {
  const properties = Object.getOwnPropertyNames(rawGetters);
  return {
    get(target: any, key: string, receiver: any): unknown {
      if (namespacedNs.indexOf(key) > -1) {
        const cachedGettersProxy = moduleProxyGettersMap[key];
        if (cachedGettersProxy) return cachedGettersProxy.proxy;
        const moduleGettersProxy = Proxy.revocable<NormalizedGetters | ByStoreGetters>(
          rawGetters[key] as ByStoreGetters,
          gettersProxyHandler(store, rawGetters[key] as ByStoreGetters, [], receiver)
        );
        moduleProxyGettersMap[key] = moduleGettersProxy;
        return moduleGettersProxy.proxy;
      }
      if (properties.indexOf(key) === -1) {
        return target[key];
      }
      const state = store.getState();
      return (rawGetters?.[key] as ByStoreGetterFn)?.(state, rootProxyGetters || receiver);
    },
    set() {
      return false;
    },
  };
};

const createProxyGetters = (
  store: Store,
  rawGetters: NormalizedGetters = {},
  namespacedNs: Array<string> = []
) => {
  const proxyGetters = new Proxy(
    rawGetters,
    gettersProxyHandler(store, rawGetters, namespacedNs, undefined)
  );

  return proxyGetters;
};

export const createStore = (opts: ByStoreOptions, middleware = []) => {
  const {
    modules = [] as Array<ByStoreModule>,
    state: rootState,
    actions: rootActions,
    getters: rootGetters,
  } = opts;
  const normalizedModules = normalizeModules(modules);

  const {
    namespacedNs,
    actions: moduleActions,
    state: moduleState,
    getters: moduleGetters,
  } = normalizedModules;

  const initState = { ...rootState, ...moduleState };
  const actions = { ...rootActions, ...moduleActions };
  const getters = { ...getMemoGetters(rootGetters), ...moduleGetters };

  const store: Store = createReduxStore(
    createReducer(actions),
    initState,
    applyMiddleware(...middleware)
  );

  let proxyGetters = createProxyGetters(store, getters, namespacedNs);

  const getProxyGetters = () => proxyGetters;

  const updateProxyGetters = () => {
    proxyGetters = createProxyGetters(store, getters, namespacedNs);
  };

  const registerModule = (module: ByStoreModule, config: IDynamicModuleConfig = {}) => {
    const normalizedModule = normalizeImportModule(module);
    const { ns } = normalizedModule;
    if (!ns) {
      // eslint-disable-next-line
      console.warn('Dynamic Module must specify the `ns` property for namespace.');
      return;
    }
    if (namespacedNs.indexOf(ns) > -1) {
      // eslint-disable-next-line
      console.warn(`Module ${ns} exists!`);
      return;
    }
    if (dynamicModules.config[ns] && dynamicModules.config[ns].isLoaded) return;

    dynamicModules.config[ns] = {
      isLoaded: true,
      ...config,
    };

    namespacedNs.push(ns);
    getters[ns] = normalizedModule.getters || {};
    dynamicModules.actions[ns] = normalizedModule.actions || {};

    store.dispatch({
      type: INTERNAL_TYPES.INIT_MODULE,
      ns,
      initState: normalizedModule.state,
    });

    updateProxyGetters();
  };

  const destroyGetters = () => {
    proxyGetters = null;
    clearModuleProxyGettersMap();
  };

  return {
    ...store,
    getProxyGetters,
    destroyGetters,
    registerModule,
    // unRegisterModule,
  };
};

export default createStore;
