import React from 'react'
import { FTReactNativeRUM } from '../ft_rum';

export class FTRumActionTracking {
	private static isTracking = false
	private static preActionTimestamp = Number.MIN_VALUE;
	private static originalMemo = React.memo;
    private static originalJsx = null;
    private static originalCreateElement = React.createElement;

	private static patchCreateElementFunction = (
        originalFunction: typeof React.createElement,
        [element, props, ...rest]: Parameters<typeof React.createElement>
    ): ReturnType<typeof React.createElement> => {
        if (
            props &&
            typeof (props as Record<string, unknown>).onPress === 'function'
        ) {
            const originalOnPress = (props as Record<string, unknown>) // eslint-disable-next-line @typescript-eslint/ban-types
                .onPress as Function;
            (props as Record<string, unknown>).onPress = (...args: any[]) => {
                FTRumActionTracking.interceptOnPress(
                    ...args
                );
                return originalOnPress(...args);
            };
            
            (props as Record<
                string,
                unknown
            >).__FT_INTERNAL_ORIGINAL_ON_PRESS__ = originalOnPress;
        }
        return originalFunction(element, props, ...rest);
    };
	static startTracking(): void {
		if (FTRumActionTracking.isTracking) {
			return
		}
		const original = React.createElement
		React.createElement = (
            ...args: Parameters<typeof React.createElement>
        ): any => {
            return this.patchCreateElementFunction(original, args);
        };
        try {
            const jsxRuntime = getJsxRuntime();
            const originaljsx = jsxRuntime.jsx;
            this.originalJsx = originaljsx;
            jsxRuntime.jsx = (
                ...args: Parameters<typeof React.createElement>
            ): ReturnType<typeof React.createElement> => {
                return this.patchCreateElementFunction(originaljsx, args);
            };
        } catch (e) {
           
        }

        const originalMemo = React.memo;
        React.memo = (
            component: any,
            propsAreEqual?: (prevProps: any, newProps: any) => boolean
        ) => {
            return originalMemo(component, (prev, next) => {
                if (!next.onPress || !prev.onPress) {
                    return propsAreEqual
                        ? propsAreEqual(prev, next)
                        : areObjectShallowEqual(prev, next);
                }

				const { onPress: _prevOnPress, ...partialPrevProps } = prev;
                const prevProps = {
                    ...partialPrevProps,
                    onPress: prev.__FT_INTERNAL_ORIGINAL_ON_PRESS__
                };

                const { onPress: _nextOnPress, ...partialNextProps } = next;
                const nextProps = {
                    ...partialNextProps,
                    onPress: next.__FT_INTERNAL_ORIGINAL_ON_PRESS__
                };

                return propsAreEqual
                    ? propsAreEqual(prevProps, nextProps)
                    : areObjectShallowEqual(nextProps, prevProps);
            });
        };
		FTRumActionTracking.isTracking = true
	}
	static stopTracking() {
        React.createElement = this.originalCreateElement;
        React.memo = this.originalMemo;
        FTRumActionTracking.isTracking = false;
        if (this.originalJsx) {
            const jsxRuntime = getJsxRuntime();
            jsxRuntime.jsx = this.originalJsx;
            this.originalJsx = null;
        }
    }

	private static interceptOnPress(...args: any[]): void {
		if (args.length > 0 && args[0] && args[0]._targetInst) {
			const currentTime = Date.now()
			const timestampDifference = Math.abs(Date.now() - FTRumActionTracking.preActionTimestamp)
			if (timestampDifference > 10) {
				const targetNode = args[0]._targetInst
				this.handleTargetEvent(targetNode)
				FTRumActionTracking.preActionTimestamp = currentTime 
			}
		}
	}

	private static handleTargetEvent(targetNode:any | null){
		if (targetNode) {
			const  elementTypeName = FTRumActionTracking.resolveActionName(targetNode);
			if (elementTypeName) {
				FTReactNativeRUM.startAction(elementTypeName,'click');
			}
		}
	}

	private static resolveActionName(targetNode:any): string | null {
		const accessibilityLabel = targetNode.memoizedProps?.accessibilityLabel
		if(accessibilityLabel != null){
			return  accessibilityLabel;
		}
		const accessibilityRole = targetNode.memoizedProps?.accessibilityRole;
			let subTitle = '';
			let children = targetNode.memoizedProps?.children;
			while (children){
				if(Array.isArray(children) && children.length>0 && children[0]){
					children = children[0];
				}else if(typeof children === 'object' && children.props && children.props.children){
					children = children.props.children;
				}else if(typeof children === 'string'){
					subTitle = children;
					children = null;
				}else{
					children = null;
				}
			}
			let elementTypeName = accessibilityRole;
			if(!accessibilityRole){
				let elementType = targetNode.elementType;
				if (typeof elementType === "string") {
					elementTypeName = elementType
				} else if (elementType && typeof elementType.name === "string") {
					elementTypeName = elementType.name
				}
			}
			if(elementTypeName){
				return '['+elementTypeName+']'+subTitle;
			}
			return null;
   
	}
}
const areObjectShallowEqual = (
	objectA: Record<string, unknown> | undefined | null,
	objectB: Record<string, unknown> | undefined | null
): boolean => {
	if (!objectA || !objectB) {
		return objectA === objectB;
	}

	const keys = Object.keys(objectA);
	if (keys.length !== Object.keys(objectB).length) {
		return false;
	}
	for (const key of keys) {
		if (objectA[key] !== objectB[key]) {
			return false;
		}
	}
	return true;
};
const getJsxRuntime = () => {
    // eslint-disable-next-line global-require, @typescript-eslint/no-var-requires
    const [major, minor] = require('react/package.json').version.split('.');
	// JSX Transform 适用于 > 16.14.0
    if (Number(major)<=16&&Number(minor)<14) {
         throw new Error('React version does not support new jsx transform');
    }

    // eslint-disable-next-line global-require, @typescript-eslint/no-var-requires
    const jsxRuntime = require('react/jsx-runtime');
    if (!jsxRuntime.jsx) {
        throw new Error('React jsx runtime does not export new jsx transform');
    }
    return jsxRuntime;
};
