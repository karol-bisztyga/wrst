import { createNavigation, useNavigation } from "wrst";
import { createAppState } from "wrst";
import { createAppConfig } from "wrst";
import { Component } from "wrst";
import { MenuScreen } from "./MenuScreen.tsx";
import { Effect } from "./Effect.tsx";
import { Timeouts } from "./Timeouts.tsx";
import { Fetch } from "./Fetch.tsx";
import { State } from "./State.tsx";
import { LocalStorage } from "./LocalStorage.tsx";
import { GlobalStateParent } from "./GlobalStateParent.tsx";
import { GlobalStateChildA } from "./GlobalStateChildA.tsx";
import { GlobalStateChildB } from "./GlobalStateChildB.tsx";
import { DeviceInfo } from "./DeviceInfo.tsx";
import { NativeModule } from "./NativeModule.tsx";

createAppConfig({ appBackgroundColor: "#000" });

createAppState({ value: 0 });

createNavigation({
  initial: "menu",
  routes: {
    menu: MenuScreen,
    state: State,
    effect: Effect,
    timeouts: Timeouts,
    fetch: Fetch,
    localStorage: LocalStorage,
    globalState: GlobalStateParent,
    globalChildA: GlobalStateChildA,
    globalChildB: GlobalStateChildB,
    deviceInfo: DeviceInfo,
    nativeModule: NativeModule,
  },
  showHeader: false,
});

const App: Component = () => {
  const { Screen } = useNavigation();
  return <Screen />;
};

export default App;
