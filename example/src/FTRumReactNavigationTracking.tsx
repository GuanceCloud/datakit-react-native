import type { EventArg, NavigationContainerRef, Route ,EventListenerCallback,EventMapBase} from "@react-navigation/native";
import { FTReactNativeRUM } from '@cloudcare/react-native-mobile';
import { AppState, AppStateStatus } from 'react-native';

declare type NavigationListener = (event: EventArg<string, boolean, any>) => void | null


declare type AppStateListener = (appStateStatus: AppStateStatus) => void | null
declare type NavigationInfo = {
    startTime:number,
    route: Route<string, any | undefined> | undefined,
}
export class FTRumReactNavigationTracking {

    private static registeredContainer: NavigationContainerRef<ReactNavigation.RootParamList> | null;
    
    private static navigationStateChangeListener: NavigationListener;

    private static appStateListener: AppStateListener;


    static  trackRout:Route<string, any | undefined> | undefined = undefined;
    private static  currentTargetKey:string|  undefined = undefined; 
    private static  navigationInfoDict = new Map();

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
    static  StackListener:Partial<{
        transitionEnd?:EventListenerCallback<EventMapBase,"transitionEnd">| undefined;
        state?:EventListenerCallback<EventMapBase,"state">| undefined;
        focus?:EventListenerCallback<EventMapBase,"focus">| undefined
    }>
    = {
        transitionEnd:(e) =>{
            if(e.data?.closing == true){
                FTReactNativeRUM.stopView();
            }else{
                    const navInfo:NavigationInfo = FTRumReactNavigationTracking.navigationInfoDict.get(e.target);
                    if(navInfo != null){
                    const endTime =  new Date().getTime(); 
                    const duration = (endTime - navInfo.startTime)*1000;
                    FTRumReactNavigationTracking.handleRouteNavigation(navInfo.route,undefined,duration);
                    FTRumReactNavigationTracking.navigationInfoDict.delete(e.target);
                }
            }
        },
        state:(event:EventArg<string, boolean, any>) =>{
            let route = event.data?.state?.routes[event.data?.state?.index];
            let key = route.key;
            let time = new Date().getTime(); 

            while (route.state != undefined) {
                const nestedRoute = route.state.routes[route.state.index];
                if (nestedRoute == undefined) {
                    break;
                }
                route = nestedRoute
            }
            if(FTRumReactNavigationTracking.currentTargetKey == key){
                let nav:NavigationInfo ={
                    startTime : time,
                    route:route
                } 
                FTRumReactNavigationTracking.navigationInfoDict.set(key,nav);
            }else{
                FTRumReactNavigationTracking.handleRouteNavigation(route);
            }
            FTRumReactNavigationTracking.currentTargetKey = undefined;
        },
        focus:(e)=>{
            FTRumReactNavigationTracking.currentTargetKey = e.target;
        }
    }
    private static handleRouteNavigation(
        route: Route<string, any | undefined> | undefined, 
        appStateStatus: AppStateStatus | undefined = undefined,
        duration: number = 0,
        ) {
        if (route == undefined || route == null) {
            return
        }
        const key = route.key;

        const screenName =  route.name;

        if (key != null && screenName != null) {
            if (appStateStatus === 'background') {
                FTReactNativeRUM.stopView();
            } else if (appStateStatus === 'active' || appStateStatus == undefined) {
                FTReactNativeRUM.startView(screenName,duration);

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

