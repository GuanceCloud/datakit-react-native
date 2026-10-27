const React = require('react');
const { create, act } = require('react-test-renderer');
const { View, AppState, Platform } = require('react-native');
const root = process.env.GUANCE_REPO_ROOT;
const mockNativeRUM = {
  onCreateViewWithLoadStart: jest.fn().mockResolvedValue(undefined),
  startViewWithTrackingType: jest.fn().mockResolvedValue(undefined),
};
const mockRUM = { stopView: jest.fn().mockResolvedValue(undefined) };
jest.doMock(
  root + '/packages/react-native-mobile/src/specs/NativeFTReactNativeRUM',
  () => ({ default: mockNativeRUM })
);
jest.doMock(root + '/packages/react-native-mobile/src/ft_rum', () => ({
  FTReactNativeRUM: mockRUM,
}));
jest.doMock(root + '/packages/react-native-mobile/src/ft_mobile_agent', () => ({
  bridgeContextManager: {
    mergeWithLocalPropertiesSync: () => ({ fixture: true }),
  },
}));
jest.doMock(
  '@cloudcare/react-native-mobile',
  () => ({
    FTRumViewTracking: jest.requireActual(
      root + '/packages/react-native-mobile/src/rum/FTRumViewTracking'
    ).FTRumViewTracking,
  }),
  { virtual: true }
);
jest.mock(
  'react-native-safe-area-context',
  () => require('react-native-safe-area-context/jest/mock').default
);
jest.mock('react-native-screens', () => {
  const React = require('react');
  const host = (name) => {
    const Component = React.forwardRef((props, ref) =>
      React.createElement(name, { ...props, ref }, props.children)
    );
    Component.displayName = name;
    return Component;
  };
  return {
    Screen: host('NativeScreen'),
    ScreenStack: host('NativeScreenStack'),
    ScreenStackHeaderConfig: host('NativeHeader'),
    ScreenStackHeaderBackButtonImage: host('NativeHeaderBackButtonImage'),
    ScreenStackHeaderCenterView: host('NativeHeaderCenterView'),
    ScreenStackHeaderLeftView: host('NativeHeaderLeftView'),
    ScreenStackHeaderRightView: host('NativeHeaderRightView'),
    ScreenStackHeaderSearchBarView: host('NativeHeaderSearchBarView'),
    SearchBar: host('NativeSearchBar'),
    isSearchBarAvailableForCurrentPlatform: false,
    isNewBackTitleImplementation: false,
  };
});
const {
  NavigationContainer,
  createNavigationContainerRef,
  StackActions,
} = require('@react-navigation/native');
const {
  createNativeStackNavigator,
} = require('@react-navigation/native-stack');
const { FTRumReactNavigationTracking: tracker } = require(root +
  '/packages/react-navigation/src');
let tree;
let ref;
beforeEach(() => {
  jest.clearAllMocks();
  AppState.currentState = 'active';
  jest
    .spyOn(AppState, 'addEventListener')
    .mockReturnValue({ remove: jest.fn() });
  ref = createNavigationContainerRef();
});
afterEach(async () => {
  tracker.stopTrackingViews();
  if (tree) await act(async () => tree.unmount());
  tree = undefined;
  jest.restoreAllMocks();
});
const Page = () => React.createElement(View);
const InnerStack = createNativeStackNavigator();
const Nested = () =>
  React.createElement(
    InnerStack.Navigator,
    { screenOptions: { headerShown: false } },
    React.createElement(InnerStack.Screen, {
      name: 'InnerHome',
      component: Page,
    }),
    React.createElement(InnerStack.Screen, {
      name: 'InnerDetail',
      component: Page,
    })
  );
async function mount(stackMode = false) {
  const Stack = createNativeStackNavigator();
  await act(async () => {
    tree = create(
      React.createElement(
        NavigationContainer,
        {
          ref,
          onReady: stackMode
            ? undefined
            : () => tracker.startTrackingViews(ref),
        },
        React.createElement(
          Stack.Navigator,
          {
            screenOptions: { headerShown: false },
            screenListeners: stackMode ? tracker.StackListener : undefined,
          },
          React.createElement(Stack.Screen, { name: 'Home', component: Page }),
          React.createElement(Stack.Screen, {
            name: 'Detail',
            component: Page,
          }),
          React.createElement(Stack.Screen, {
            name: 'Nested',
            component: Nested,
          })
        )
      )
    );
  });
}
const views = () =>
  mockNativeRUM.startViewWithTrackingType.mock.calls.map(([name]) => name);
test('exact screenshot dependency versions', () => {
  expect(Platform.OS).toBe(process.env.GUANCE_TEST_PLATFORM);
  expect(require('@react-navigation/native/package.json').version).toBe(
    '7.0.17'
  );
  expect(require('@react-navigation/core/package.json').version).toBe('7.6.0');
  expect(require('@react-navigation/native-stack/package.json').version).toBe(
    '6.9.26'
  );
  // Check the versions actually resolved by the libraries, not just the fixture.
  const path = require('path');
  const native = path.dirname(
    require.resolve('@react-navigation/native/package.json')
  );
  const stack = path.dirname(
    require.resolve('@react-navigation/native-stack/package.json')
  );
  expect(require.resolve('@react-navigation/core', { paths: [native] })).toBe(
    require.resolve('@react-navigation/core')
  );
  expect(require.resolve('@react-navigation/native', { paths: [stack] })).toBe(
    require.resolve('@react-navigation/native')
  );
});
test('route collection: initial screen, push, duplicate params change, back, disposal', async () => {
  await mount();
  expect(views()).toEqual(['Home']);
  await act(async () => ref.navigate('Detail'));
  expect(views()).toEqual(['Home', 'Detail']);
  await act(async () => ref.setParams({ id: 1 }));
  expect(views()).toEqual(['Home', 'Detail']);
  await act(async () => ref.goBack());
  expect(views()).toEqual(['Home', 'Detail', 'Home']);
  tracker.stopTrackingViews(ref);
  await act(async () => ref.navigate('Detail'));
  expect(views()).toEqual(['Home', 'Detail', 'Home']);
  expect(mockNativeRUM.onCreateViewWithLoadStart).not.toHaveBeenCalled();
});
test('two pushed instances of the same screen are separate Views', async () => {
  await mount();
  await act(async () => ref.dispatch(StackActions.push('Detail')));
  const firstKey = ref.getCurrentRoute().key;
  await act(async () => ref.dispatch(StackActions.push('Detail')));
  expect(ref.getCurrentRoute().key).not.toBe(firstKey);
  await act(async () => ref.goBack());
  expect(ref.getCurrentRoute().key).toBe(firstKey);
  expect(views()).toEqual(['Home', 'Detail', 'Detail', 'Detail']);
});
test('nested stacks collect their active leaf route', async () => {
  await mount();
  await act(async () => ref.navigate('Nested', { screen: 'InnerDetail' }));
  expect(ref.getCurrentRoute().name).toBe('InnerDetail');
  expect(views()).toEqual(['Home', 'InnerDetail']);
  await act(async () => ref.navigate('Nested', { screen: 'InnerHome' }));
  expect(views()).toEqual(['Home', 'InnerDetail', 'InnerHome']);
});
test('stack collection: real state and focus events plus native appearance boundary', async () => {
  let time = 100;
  jest.spyOn(performance, 'now').mockImplementation(() => time);
  jest.spyOn(Date, 'now').mockReturnValue(1700000000000);
  await mount(true);
  const activeScreen = () =>
    tree.root.findAllByType('NativeScreen').slice(-1)[0];
  time = 125.5;
  await act(async () => activeScreen().props.onAppear());
  expect(views()).toEqual(['Home']);
  mockNativeRUM.onCreateViewWithLoadStart.mockClear();
  time = 200;
  await act(async () => ref.navigate('Detail'));
  time = 210;
  await act(async () => ref.setParams({ id: 1 }));
  expect(views()).toEqual(['Home']);
  time = 225.5;
  await act(async () => activeScreen().props.onAppear());
  expect(views()).toEqual(['Home', 'Detail']);
  expect(mockNativeRUM.onCreateViewWithLoadStart.mock.calls).toEqual([
    ['Detail', 25500000, 1700000000000],
  ]);
  await act(async () => activeScreen().props.onAppear());
  expect(views()).toEqual(['Home', 'Detail']);
  expect(mockNativeRUM.onCreateViewWithLoadStart).toHaveBeenCalledTimes(1);
  time = 300;
  await act(async () => ref.goBack());
  time = 340;
  await act(async () => activeScreen().props.onAppear());
  expect(views()).toEqual(['Home', 'Detail', 'Home']);
  expect(mockNativeRUM.onCreateViewWithLoadStart.mock.calls).toEqual([
    ['Detail', 25500000, 1700000000000],
    ['Home', 40000000, 1700000000000],
  ]);
});
