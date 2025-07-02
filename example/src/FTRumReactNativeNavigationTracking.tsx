import React from 'react'
import { ComponentDidAppearEvent, Navigation ,PreviewCompletedEvent} from 'react-native-navigation';
import { FTReactNativeRUM } from '@cloudcare/react-native-mobile';


/**
 * RUM collection view when using react-native-navigation
 */
export class FTRumReactNativeNavigationTracking {

    private static isTracking = false
    private static trackedComponentIds : Array<any> = [];
    private static originalCreateElement: any = undefined
    private static currentViewName: string | null = null;
    private static currentViewStartTime: number = 0;


    /**
     * Start collecting page lifecycle
     */
    static startTracking(): void {
        if (FTRumReactNativeNavigationTracking.isTracking) {
            return
        }
        const original = React.createElement
        FTRumReactNativeNavigationTracking.originalCreateElement = original
        React.createElement = (element: any, props: any, ...children: any): any => {
            if (props && props.componentId != undefined 
                && !FTRumReactNativeNavigationTracking.trackedComponentIds.includes(props.componentId)
            ) {
                const componentId = props.componentId
                var startTime:number|null = null; 
                Navigation.events().registerComponentListener(
                    {   
                        componentWillAppear:() => {
                           startTime = new Date().getTime(); 
                           console.log("startTime:"+startTime);
                        },
                        componentDidAppear: (event: ComponentDidAppearEvent) => {
                            const screenName = event.componentName;
                            const endTime =  new Date().getTime(); 
                            const duration = startTime != null ?(endTime - startTime)*1000:0;
                            FTReactNativeRUM.onCreateView(screenName,duration);
                            FTReactNativeRUM.startView(screenName);
                        },
                        componentDidDisappear: () => {
                            FTReactNativeRUM.stopView();
                        },
                        previewCompleted:(event:PreviewCompletedEvent) => {
                           console.log('PreviewCompletedEvent: ' + event.componentName);
                        }
                    },
                    componentId,
                );
  
               FTRumReactNativeNavigationTracking.trackedComponentIds.push(componentId);
            }

            return original(element, props, ...children)
        }
        FTRumReactNativeNavigationTracking.isTracking = true
    }

    /**
     * Stop collecting page navigation
     */
    static stopTracking(): void {
        if (!FTRumReactNativeNavigationTracking.isTracking) {
            return
        }
        if (FTRumReactNativeNavigationTracking.originalCreateElement != undefined) {
            React.createElement = FTRumReactNativeNavigationTracking.originalCreateElement;
        }
        FTRumReactNativeNavigationTracking.trackedComponentIds.splice(0, FTRumReactNativeNavigationTracking.trackedComponentIds.length)
        FTRumReactNativeNavigationTracking.isTracking = false
    }
}