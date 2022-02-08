import type { EventArg, NavigationContainerRef, Route } from "@react-navigation/native";
import { FTReactNativeRUM } from '@cloudcare/react-native-mobile';
import { AppState, AppStateStatus } from 'react-native';

declare type NavigationListener = (event: EventArg<string, boolean, any>) => void | null


declare type AppStateListener = (appStateStatus: AppStateStatus) => void | null

export class FTRumReactNavigationTracking {

    private static registeredContainer: NavigationContainerRef<ReactNavigation.RootParamList> | null;
    
    private static navigationStateChangeListener: NavigationListener;

    private static appStateListener: AppStateListener;
   
    private static trackedComponentName : string = "";


    static startTrackingViews(
            navigationRef: NavigationContainerRef<ReactNavigation.RootParamList> | null,
        ): void {

        if (navigationRef == null) {
            console.log ("Cannot track views with a null navigationRef");
            return;
        }

        if (FTRumReactNavigationTracking.registeredContainer != null && this.registeredContainer !== navigationRef) {
        } else if (FTRumReactNavigationTracking.registeredContainer == null) {
            const listener = FTRumReactNavigationTracking.resolveNavigationStateChangeListener();
            FTRumReactNavigationTracking.handleRouteNavigation(navigationRef.getCurrentRoute());
            navigationRef.addListener("state", listener);
            FTRumReactNavigationTracking.registeredContainer = navigationRef;
        }


        FTRumReactNavigationTracking.registerAppStateListenerIfNeeded();
    }

    
    static stopTrackingViews(navigationRef: NavigationContainerRef<ReactNavigation.RootParamList> | null): void {
        if (navigationRef != null) {
            navigationRef.removeListener("state", FTRumReactNavigationTracking.navigationStateChangeListener);
            FTRumReactNavigationTracking.registeredContainer = null;
        }
    }

    private static handleRouteNavigation(
        route: Route<string, any | undefined> | undefined, 
        appStateStatus: AppStateStatus | undefined = undefined
        ) {
        if (route == undefined || route == null) {
            return
        }
        const key = route.key;

        const screenName =  route.name;

        if (key != null && screenName != null) {
            if (appStateStatus === 'background') {
                FTReactNativeRUM.stopView();
                FTRumReactNavigationTracking.trackedComponentName = '';
            } else if (appStateStatus === 'active' || appStateStatus == undefined) {
                
                FTReactNativeRUM.startView(screenName,FTRumReactNavigationTracking.trackedComponentName,0);
                FTRumReactNavigationTracking.trackedComponentName = screenName;

            }
        }
    }

    private static resolveNavigationStateChangeListener(): NavigationListener {
        if (FTRumReactNavigationTracking.navigationStateChangeListener == null) {
            FTRumReactNavigationTracking.navigationStateChangeListener = (event: EventArg<string, boolean, any>) => {
                let route = event.data?.state?.routes[event.data?.state?.index];

                if (route == undefined) {
                    return
                }

                while (route.state != undefined) {
                    const nestedRoute = route.state.routes[route.state.index];
                    if (nestedRoute == undefined) {
                        break;
                    }
                    route = nestedRoute
                }

                FTRumReactNavigationTracking.handleRouteNavigation(route);
            };
        }
        return FTRumReactNavigationTracking.navigationStateChangeListener;
    }

    private static registerAppStateListenerIfNeeded() {
        if (FTRumReactNavigationTracking.appStateListener == null) {
            FTRumReactNavigationTracking.appStateListener = (appStateStatus: AppStateStatus) => {

                const currentRoute = FTRumReactNavigationTracking.registeredContainer?.getCurrentRoute();
                if (currentRoute == undefined) {
                    return;
                }

                FTRumReactNavigationTracking.handleRouteNavigation(currentRoute, appStateStatus);
            };

            AppState.addEventListener("change", FTRumReactNavigationTracking.appStateListener);
        }
    }

}

