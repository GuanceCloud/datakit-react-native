/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

package com.ft.sdk.reactnative.sessionreplay.views;

import androidx.annotation.NonNull;

import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.uimanager.ThemedReactContext;
import com.facebook.react.uimanager.ViewGroupManager;
import com.facebook.react.uimanager.annotations.ReactProp;


public class FTPrivacyViewManager extends ViewGroupManager<FTPrivacyView> {
    public static final String REACT_CLASS = "FTPrivacyView";

    public FTPrivacyViewManager(ReactApplicationContext context) {
        super();
    }

    @NonNull
    @Override
    public String getName() {
        return REACT_CLASS;
    }

    @NonNull
    @Override
    protected FTPrivacyView createViewInstance(@NonNull ThemedReactContext context) {
        return new FTPrivacyView(context);
    }

    @ReactProp(name = "hide", defaultBoolean = false)
    public void setHide(FTPrivacyView view, boolean value) {
        if (view != null) {
            view.setHide(value);
        }
    }

    @ReactProp(name = "textAndInputPrivacy")
    public void setTextAndInputPrivacy(FTPrivacyView view, String value) {
        if (view != null) {
            view.setTextAndInputPrivacy(value);
        }
    }

    @ReactProp(name = "imagePrivacy")
    public void setImagePrivacy(FTPrivacyView view, String value) {
        if (view != null) {
            view.setImagePrivacy(value);
        }
    }

    @ReactProp(name = "touchPrivacy")
    public void setTouchPrivacy(FTPrivacyView view, String value) {
        if (view != null) {
            view.setTouchPrivacy(value);
        }
    }

    @ReactProp(name = "nativeID")
    public void setNativeID(FTPrivacyView view, String value) {
        if (view != null) {
            view.setNativeID(value != null ? value : "");
        }
    }
}
