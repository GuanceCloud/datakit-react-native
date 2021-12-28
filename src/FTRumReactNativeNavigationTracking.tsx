import React from 'react'
import { ComponentDidAppearEvent, Navigation } from 'react-native-navigation';
import { FTReactNativeRUM } from './index';


/**
 * 使用 react-native-navigation 时 RUM 采集 view 
 */
export class FTRumReactNativeNavigationTracking {

    private static isTracking = false
    private static trackedComponentIds : Array<any> = [];
    private static trackedComponentNames : Array<string> = [];

    private static originalCreateElement: any = undefined


    /**
     * 开始采集页面的生命周期
     */
    static startTracking(): void {
        // extra safety to avoid wrapping more than 1 time this function
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
                            const referer = FTRumReactNativeNavigationTracking.getViewReferer();
                            FTReactNativeRUM.startView(screenName,referer);
                        },
                        componentDidDisappear: () => {
                            FTReactNativeRUM.stopView();
                            if(FTRumReactNativeNavigationTracking.trackedComponentNames.length>0){
                             FTRumReactNativeNavigationTracking.trackedComponentNames.pop();   
                            }
                        },
                    },
                );
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
        FTRumReactNativeNavigationTracking.trackedComponentNames.splice(0, FTRumReactNativeNavigationTracking.trackedComponentNames.length)
        FTRumReactNativeNavigationTracking.isTracking = false
    }
    /**
     * 获取上一页面的名称
     */
    private static getViewReferer():string{
     if (FTRumReactNativeNavigationTracking.originalCreateElement == undefined) {
         return '';
     }else if (FTRumReactNativeNavigationTracking.trackedComponentNames.length == 0) {
         return '';
     }else{
         return FTRumReactNativeNavigationTracking.trackedComponentNames[FTRumReactNativeNavigationTracking.trackedComponentNames.length-1];
     }
    }
}