package com.ft.sdk.reactnative.utils;

import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertTrue;

import org.junit.Test;

public class ReactNativeUtilsTest {

    @Test
    public void filtersAndroidEmulatorInspectorResource() {
        assertTrue(ReactNativeUtils.isReactNativeDevUrl(
            "http://10.0.2.2:8081/inspector/device?name=sdk_gphone64_arm64%20-%2012%20-%20API%2032"
                + "&app=com.ft.sdk.reactnative.example&device=a520746d2418fde7c33ceff1d852b112040a08c0"
        ));
    }

    @Test
    public void filtersReactNativeAndExpoDevelopmentResources() {
        assertTrue(ReactNativeUtils.isReactNativeDevUrl("http://localhost:8081/hot?platform=android"));
        assertTrue(ReactNativeUtils.isReactNativeDevUrl("ws://10.0.2.2:8081/message?device=emulator"));
        assertTrue(ReactNativeUtils.isReactNativeDevUrl("http://192.168.1.2:8082/logs"));
        assertTrue(ReactNativeUtils.isReactNativeDevUrl("http://[::1]:8081/debugger-proxy?role=client"));
    }

    @Test
    public void doesNotFilterApplicationResources() {
        assertFalse(ReactNativeUtils.isReactNativeDevUrl("https://api.example.com/inspector/device"));
        assertFalse(ReactNativeUtils.isReactNativeDevUrl("http://10.0.2.2:9529/inspector/device"));
        assertFalse(ReactNativeUtils.isReactNativeDevUrl("http://10.0.2.2:8081/business"));
        assertFalse(ReactNativeUtils.isReactNativeDevUrl(null));
    }
}
