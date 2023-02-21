# @fantastic-utils/ballon

A react state management and operation library, it's based on `redux`, `mutative` and `memoize-one`, the library is designed to have a good development experience and a good performance. The API is similar to `vuex` which can help vue developer to quickly work on react project.

- `redux`: is a famous statement management tool.
- `mutative`: is a `immer` like alternative library which get better performance.
- `memoize-one`: is a function cache tool, which used to improve performance.

## Installation

```bash
npm install @fantastic-utils/ballon

```

## Usage

Here is an basic usage case.

```js
// store.js
import { createStore } from '@fantastic-utils/ballon';

const store = createStore({
  state: { name: 'lucky', age: 12 },
  actions: {
    updateAge(state, { age }) {
      state.age = 20;
    },
  },
  getters: {
    isAdult(state) {
      return state.age > 18;
    },
    isLuckyAdult(state, getters) {
      return getters.isAdult && state.name === 'lucky';
    },
  },
});

export default store;
```

```jsx
// App.jsx
import React, { useCallback } from 'react';
import { useStore } from '@fantastic-utils/ballon';

const App = () => {
  const [state, dispatch, getters, refState] = useStore();
  const { name, age } = state;
  const { isLuckyAdult } = getters,

  const handleUpdateAge = useCallback(() => {
    dispatch({ type: 'updateAge', age: 20 });
  }, [dispatch]);

  useEffect(() => {
    const someTimer = setInterval(() => {
      dispatch({ type: 'doSomeIntervalUpdate', age: refState.current.age });
    }, 5000);
    return () => {
      clearInterval(someTimer);
    };
  }, []);

  return (
    <div>
      <h1>Name: { name }</h1>
      <p>Age: { age }</p>
      <p>{ isLuckyAdult? 'You are adult' : '' }</p>
      <button onClick={handleUpdateAge}>Update Age</button>
    </div>
  )
};

```

```js
// index.js
import ReactDOM from 'react-dom';
import { StateProvider } from '@fantastic-utils/ballon';
import App from './App';
import store from './store';

ReactDOM.render(
  <StateProvider store={store}>
    <App />
  </StateProvider>,
  document.getElementById('root')
);
```

---

### Api

`createStore(definitionObject: { state: object, getters: object, actions: object, modules: array }, middleware: array)`:

- definitionObject:
  - `state`: Is the base property object.
  - `getters`: Is the computed state which will be cached in 1 rendering for decreasing performance loss.
  - `actions`: Is the way to update state.
  - `modules`: A list of modules which follow properties.
    - `ns`: The module namespace.
    - `state`: The same as above.
    - `getters`: The same as above.
    - `actions`: The same as above.
    - `namespaced`: Is this module should be grouped into a namespaced field.
      - `state`: State will always grouped into a namespaced field, no matter what value `namespaced` is.
      - `getters`: Is controlled by `namespaced`, or you can access getters from root getters.
      - `actions`: Is controlled by `namespaced`, If truthy you should dispatch action with `ns` prefixed, like `dispatch({ type: 'user/updateAge', age: 20 })`, If falsy you can dispatch action directly like `dispatch({ type: 'updateAge', age: 20 })`;
- middleware: A list of middleware, which relay on `redux`, it's placed between `dispatch` and `action`;

**Returns**: (`ByStateStore` extends `Store` from `redux`)

- `getState()`: get current state.
- `subscribe(cb)`: subscribe store changes.
  - cb: the callback function when change happened.
- `dispatch(action)`: dispatch a action to trigger changes.
  - action: `{ type: 'xxx', ...other }`
- `registerModule(module, config)`: to register a module programmatically and dynamically.
  - moudle: the module response object
  - config: to config module behaviors.

---

`StateProvider`: The root component to provide store instance.

- `store`: to pass a store instance in.

---

`useStore()`

**Returns**: `[state, dispatch, getters, refState]`

- `state`: The store state
- `dispatch`: The dispatcher
- `getters`: the computed states like vuex.
- `refState`: A reference to state object which won't trigger view update, it's useful to use in hooks which has no dependency but need new state, and it's useful to improve some performance, but be careful with it, is you don't know what you are using.

---

## Advance Usage

### Module

Use Modular store example:

```js
// store/user.js
const ns = 'user';
const namespaced = true;

const state = {
  name: 'lucky',
  age: 12,
};

const getters = {
  isAdult(state) {
    return state.user.age > 18;
  },
  isLuckyAdult(state, getters) {
    return getters.user.isAdult && state.user.name === 'lucky';
  },
},

const actions = {
  updateAge(state, { age }) {
    state.age = 20;
  },
};

export {
  ns,
  namespaced,
  state,
  getters,
  actions,
};
```

```js
// store/index.js
import userStore from './user';

const store = createStore({
  state: { app: 'Demo' },
  actions: {},
  getters: {},
  modules: [userStore],
});

export default store;
```

### Dynamic module

Here is an example for dynamic importing an component and register its related module

```jsx
import loadable from '@loadable/component';
import { Switch, Route } from 'react-router-dom';
import store from './store';

const Home = loadable(() => import('./container/About'));

const About = loadable(() =>
  Promise.all([import('./container/About'), import('./store/about')]).then(
    ([Component, storeModule]) => {
      store.registerModule(storeModule);
      return Component;
    }
  )
);

function App() {
  return (
    <Switch>
      <Route path="/about">
        <About />
      </Route>
      <Route path="/">
        <Home />
      </Route>
    </Switch>
  );
}
```

## Install

```bash
$ npm install
```

```bash
$ npm run dev
$ npm run build
```

## LICENSE

MIT
