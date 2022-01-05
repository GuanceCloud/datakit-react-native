import {FTReactNativeTrace,FTReactNativeRUM,FTRUMResource ,FTTraceResource} from '../index';

export class FTResourceTracking {
	private static isTracking = false;
	private static originalXhrOpen: any
	private static originalXhrSend: any
	static isEnableTracing: boolean = false;
	static isEnableRumTracking: boolean = false;

	static startTracking(): void {
		if (FTResourceTracking.isTracking) {
			return
		}
		FTResourceTracking.startTrackingInternal(XMLHttpRequest);
		FTResourceTracking.isTracking = true;
	}
	static startTrackingInternal(xhrType: any){
		FTResourceTracking.originalXhrOpen = xhrType.prototype.open;
		FTResourceTracking.originalXhrSend = xhrType.prototype.send;

		FTResourceTracking.proxyXhr(xhrType)
	} 
	static stopTracking(): void {
		if (FTResourceTracking.isTracking) {
			FTResourceTracking.isTracking = false;
			XMLHttpRequest.prototype.open = FTResourceTracking.originalXhrOpen;
			XMLHttpRequest.prototype.send = FTResourceTracking.originalXhrSend;
		}
	}

	static proxyXhr(xhrType:any){
		this.proxyOpen(xhrType);
		this.proxySend(xhrType);
	}

	private static  proxyOpen(xhrType:any){
		const originalXhrOpen = this.originalXhrOpen;
		xhrType.prototype.open =async function(this:any) {
			return originalXhrOpen.apply(this, arguments as any);
		}
	}
	private static proxySend(xhrType:any){
		const originalXhrSend = this.originalXhrSend;
		xhrType.prototype.send = async function (this:any) {
			let key = FTResourceTracking.getUUID();
			this._traceKey = key;
			if(FTResourceTracking.isEnableTracing){

				let traceHeader = await FTReactNativeTrace.getTraceHeader(key,this._url);
				this._headers = Object.assign(traceHeader,this._headers); 
			}
			
			if(FTResourceTracking.isEnableRumTracking){
				FTReactNativeRUM.startResource(key);
			}
			FTResourceTracking.proxyOnReadyStateChange(this, xhrType);

			return originalXhrSend.apply(this, arguments as any);
		}
		
	}
	private static proxyOnReadyStateChange(xhrProxy: any, xhrType: any): void {
		const originalOnload = xhrProxy.onload
		const originalOnerror =  xhrProxy.onerror
		const originalOnabort = xhrProxy.onabort
		const originalOntimeout = xhrProxy.ontimeout
		xhrProxy.onload = function () {
			FTResourceTracking.reportXhr(xhrProxy);
			
			if (originalOnload) {
				originalOnload.apply(xhrProxy, arguments as any)
			}
		}
		xhrProxy.onerror = function(){
		     FTResourceTracking.reportXhr(xhrProxy,"Network error");

			if(originalOnerror){
				originalOnerror.apply(xhrProxy, arguments as any);
			}
		}
		xhrProxy.onabort = function(){
			FTResourceTracking.reportXhr(xhrProxy,"Network abort");

			if(originalOnabort){
				originalOnabort.apply(xhrProxy, arguments as any);
			}
		}
		xhrProxy.ontimeout = function(){
		      FTResourceTracking.reportXhr(xhrProxy,"Network timeout");

			if(originalOntimeout){
				originalOntimeout.apply(xhrProxy, arguments as any);
			}
		}
	}
	private static reportXhr(xhrProxy: any,errorMessage?:string): void {
		if(FTResourceTracking.isEnableTracing){
			let traceResource:FTTraceResource={
				httpMethod:xhrProxy._method,
				requestHeader:xhrProxy._headers,
				statusCode:xhrProxy.status,
			}

			if(xhrProxy.responseHeaders != undefined){
				traceResource.responseHeader = xhrProxy.responseHeaders;
			}
			if(xhrProxy._hasError == true && errorMessage){
				traceResource.errorMessage = errorMessage;
			}
			FTReactNativeTrace.addTrace(xhrProxy._traceKey,traceResource);
		}

		if(FTResourceTracking.isEnableRumTracking){
			let rumResource:FTRUMResource = {
				url:xhrProxy._url,
				httpMethod:xhrProxy._method,
				requestHeader:xhrProxy._headers,
				resourceStatus:xhrProxy.status,
			}
			if(xhrProxy._hasError == false){
				let response:XMLHttpRequest = xhrProxy;
				rumResource.responseBody = response.toString();
			}
			FTReactNativeRUM.stopResource(xhrProxy._traceKey);
			FTReactNativeRUM.addResource(xhrProxy._traceKey,rumResource);
		}
	}

	private static getUUID() {
		return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
			var r = Math.random()*16|0, v = c == 'x' ? r : (r&0x3|0x8);
			return v.toString(16);
		});
	}
} 