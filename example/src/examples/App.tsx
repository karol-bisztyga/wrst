import { createNavigation, useNavigation } from "@wrst/core";
import { createAppState } from "@wrst/core";
import { createAppConfig } from "@wrst/core";
import { Component } from "@wrst/core";
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
import { Sensors } from "./Sensors.tsx";
import { ModuleSensors } from "./ModuleSensors.tsx";
import { Styling } from "./Styling.tsx";
import { Icons } from "./Icons.tsx";
import { ProgressScreen } from "./ProgressScreen.tsx";
import { Animations } from "./Animations.tsx";
import { Images } from "./Images.tsx";
import { Inputs } from "./Inputs.tsx";
import { CompanionScreen } from "./Companion.tsx";

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
    sensors: Sensors,
    moduleSensors: ModuleSensors,
    styling: Styling,
    icons: Icons,
    progress: ProgressScreen,
    animations: Animations,
    images: Images,
    inputs: Inputs,
    companion: CompanionScreen,
  },
  showHeader: false,
});

const App: Component = () => {
  const { Screen } = useNavigation();
  return <Screen />;
};

export default App;
