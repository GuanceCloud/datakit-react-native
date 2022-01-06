import {FTReactNativeTrace,FTReactNativeRUM,FTRUMResource ,FTTraceResource} from '../index';
function addResource(xhrProxy:any):void{
	let rumResource:FTRUMResource = {
		url:xhrProxy._url,
		httpMethod:xhrProxy._method,
		requestHeader:xhrProxy._headers,
		resourceStatus:xhrProxy.status,
	}
	FTReactNativeRUM.stopResource(xhrProxy._traceKey);
	if(xhrProxy._hasError == false){		
		getResponseBody(xhrProxy).then((data)=>{
			rumResource.responseBody = data;
			FTReactNativeRUM.addResource(xhrProxy._traceKey,rumResource);
		});
	}else{
		FTReactNativeRUM.addResource(xhrProxy._traceKey,rumResource);
	}
}
function  getResponseBody(xhr: XMLHttpRequest): Promise<string>{
	const response = xhr.response
	try {
		switch (xhr.responseType) {
			case '':
			case 'text':
			// String
			return Promise.resolve(xhr.responseText);
			case 'blob':
			return new Promise(function(resolve) {
				let reader = new FileReader()
				reader.readAsText(response);
				reader.onload = function() {
					resolve(this.result)
				}
				reader.onerror = function(){
					resolve('')
				}
			});  
			case 'arraybuffer':
			return Promise.resolve(String.fromCharCode.apply(null, new Uint8Array(response)));
			case 'document':
			return Promise.resolve('');

			case 'json':

			return Promise.resolve(JSON.stringify(response));
			default:
			return Promise.resolve('');

		}


	} catch (e) {
		return Promise.resolve('');
	}
}

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
		console.log('FTResourceTracking startTracking');
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
				this.responseType = 'arraybuffer';
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

			if(originalOntimeout){
				originalOntimeout.apply(xhrProxy, arguments as any);
			}
			FTResourceTracking.reportXhr(xhrProxy,"Network timeout");

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
			addResource(xhrProxy);
		}
	}

	private static getUUID() {
		return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
			var r = Math.random()*16|0, v = c == 'x' ? r : (r&0x3|0x8);
			return v.toString(16);
		});
	}
} 