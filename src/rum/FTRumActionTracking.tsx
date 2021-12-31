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
			const title = targetNode.memoizedProps?.title?'['+targetNode.memoizedProps?.title+']':'';
			let elementType = targetNode.elementType;
			let elementTypeName = null
			if (typeof elementType === "string") {
				elementTypeName = elementType
			} else if (elementType && typeof elementType.name === "string") {
				elementTypeName = elementType.name
			}
			if (elementTypeName) {
				FTReactNativeRUM.startAction('['+elementTypeName+']'+title,'click');
			}
		}
	}
}
