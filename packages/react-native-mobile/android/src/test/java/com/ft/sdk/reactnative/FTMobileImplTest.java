package com.ft.sdk.reactnative;

import static org.junit.Assert.assertEquals;

import com.ft.sdk.FTSDKConfig;

import org.junit.Test;

public class FTMobileImplTest {
    @Test
    public void buildsConfigWithoutInitialUploadAddress() {
        FTSDKConfig config = FTMobileImpl.buildSDKConfig(null, null, null);

        assertEquals("", config.getDatakitUrl());
        assertEquals("", config.getDatawayUrl());
        assertEquals("", config.getClientToken());
    }

    @Test
    public void ignoresIncompleteDatawayConfig() {
        FTSDKConfig config = FTMobileImpl.buildSDKConfig(null, "https://openway.guance.com", null);

        assertEquals("", config.getDatakitUrl());
        assertEquals("", config.getDatawayUrl());
        assertEquals("", config.getClientToken());
    }

    @Test
    public void keepsExistingDatakitConfigBehavior() {
        FTSDKConfig config = FTMobileImpl.buildSDKConfig(
            "http://10.0.0.1:9529",
            "https://openway.guance.com",
            "client-token"
        );

        assertEquals("http://10.0.0.1:9529", config.getDatakitUrl());
        assertEquals("", config.getDatawayUrl());
        assertEquals("", config.getClientToken());
    }

    @Test
    public void keepsExistingDatawayConfigBehavior() {
        FTSDKConfig config = FTMobileImpl.buildSDKConfig(
            null,
            "https://openway.guance.com",
            "client-token"
        );

        assertEquals("", config.getDatakitUrl());
        assertEquals("https://openway.guance.com", config.getDatawayUrl());
        assertEquals("client-token", config.getClientToken());
    }
}
