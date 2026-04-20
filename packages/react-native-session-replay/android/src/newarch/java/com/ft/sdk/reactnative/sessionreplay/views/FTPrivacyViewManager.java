/*
 *
 *  * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 *  * This product includes software developed at Datadog (https://www.datadoghq.com/).
 *  * Copyright 2016-Present Datadog, Inc.
 *
 */
package com.ft.sdk.reactnative.sessionreplay.views;

import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReadableMap;
import com.facebook.react.uimanager.ThemedReactContext;
import com.facebook.react.uimanager.ViewGroupManager;
import com.facebook.react.uimanager.ViewManagerDelegate;
import com.facebook.react.uimanager.annotations.ReactProp;
import com.facebook.react.viewmanagers.FTPrivacyViewManagerDelegate;
import com.facebook.react.viewmanagers.FTPrivacyViewManagerInterface;

import java.util.HashMap;
import java.util.Map;

public class FTPrivacyViewManager extends ViewGroupManager<FTPrivacyView>
        implements FTPrivacyViewManagerInterface<FTPrivacyView> {
    public static final String REACT_CLASS = "FTPrivacyView";

    private final FTPrivacyViewManagerDelegate<FTPrivacyView, FTPrivacyViewManager> delegate =
            new FTPrivacyViewManagerDelegate<>(this);

    public FTPrivacyViewManager(ReactApplicationContext context) {
        super();
    }

    @Override
    public ViewManagerDelegate<FTPrivacyView> getDelegate() {
        return delegate;
    }

    @Override
    public String getName() {
        return REACT_CLASS;
    }

    @Override
    protected FTPrivacyView createViewInstance(ThemedReactContext themedReactContext) {
        return new FTPrivacyView(themedReactContext);
    }

    @ReactProp(name = "hide", defaultBoolean = false)
    @Override
    public void setHide(FTPrivacyView view, boolean value) {
        if (view != null) {
            view.setHide(value);
        }
    }

    @ReactProp(name = "textAndInputPrivacy")
    @Override
    public void setTextAndInputPrivacy(FTPrivacyView view, String value) {
        if (view != null) {
            view.setTextAndInputPrivacy(value);
        }
    }

    @ReactProp(name = "imagePrivacy")
    @Override
    public void setImagePrivacy(FTPrivacyView view, String value) {
        if (view != null) {
            view.setImagePrivacy(value);
        }
    }

    @ReactProp(name = "touchPrivacy")
    @Override
    public void setTouchPrivacy(FTPrivacyView view, String value) {
        if (view != null) {
            view.setTouchPrivacy(value);
        }
    }

    @ReactProp(name = "nativeID")
    @Override
    public void setNativeID(FTPrivacyView view, String value) {
        if (view != null) {
            view.setNativeID(value != null ? value : "");
        }
    }
}
