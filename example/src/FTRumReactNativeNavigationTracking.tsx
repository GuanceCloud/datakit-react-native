import React from 'react'
import { ComponentDidAppearEvent, Navigation ,PreviewCompletedEvent} from 'react-native-navigation';
import { FTReactNativeRUM } from '@cloudcare/react-native-mobile';


/**
 * 使用 react-native-navigation 时 RUM 采集 view 
 */
export class FTRumReactNativeNavigationTracking {

    private static isTracking = false
    private static trackedComponentIds : Array<any> = [];
    private static trackedComponentName : string = "";

    private static originalCreateElement: any = undefined


    /**
     * 开始采集页面的生命周期
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
                Navigation.events().registerComponentListener(
                    {
                        componentDidAppear: (event: ComponentDidAppearEvent) => {
                            const screenName = event.componentName;
                            const referer = FTRumReactNativeNavigationTracking.trackedComponentName;
                            FTReactNativeRUM.startView(screenName,referer);
                            FTRumReactNativeNavigationTracking.trackedComponentName = screenName;
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
                Navigation.events().registerCommandListener((name:string,params:any) => {
                   if (name == 'push') {
                       console.log('push: ' + params.componentName);
                   }else if(name == 'pop'){
                       console.log('pop: ' + params.componentName);
                   }
                });
               FTRumReactNativeNavigationTracking.trackedComponentIds.push(componentId);
            }

            return original(element, props, ...children)
        }
        FTRumReactNativeNavigationTracking.isTracking = true
    }

    /**
     * 停止采集页面跳转
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