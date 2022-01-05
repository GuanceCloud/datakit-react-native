import React from 'react'
import { FTReactNativeRUM } from '../index';

export class FTRumActionTracking {
	private static isTracking = false
	private static preActionTimestamp = Number.MIN_VALUE;

	static startTracking(): void {
		if (FTRumActionTracking.isTracking) {
			return
		}
		const original = React.createElement
		React.createElement = (element: any, props: any, ...children: any): any => {
			if (props && typeof props.onPress === "function") {
				const originalOnPress = props.onPress
				props.onPress = (...args: any[]) => {
					FTRumActionTracking.interceptOnPress(...args)
					return originalOnPress(...args)
				}
			}
			return original(element, props, ...children)
		}
		FTRumActionTracking.isTracking = true
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
