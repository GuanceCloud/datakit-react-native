/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

package com.cloudcare.ft.mobile.sdk.tracker.reactnative.sessionreplay.utils;

import android.graphics.drawable.Drawable;
import android.graphics.drawable.InsetDrawable;
import android.graphics.drawable.LayerDrawable;
import com.facebook.react.views.view.ReactViewBackgroundDrawable;

public class DrawableUtils {
    public ReactViewBackgroundDrawable getReactBackgroundFromDrawable(Drawable drawable) {
        if (drawable instanceof ReactViewBackgroundDrawable) {
            return (ReactViewBackgroundDrawable) drawable;
        }

        if (drawable instanceof InsetDrawable) {
            return getReactBackgroundFromDrawable(((InsetDrawable) drawable).getDrawable());
        }

        if (drawable instanceof LayerDrawable) {
            LayerDrawable layerDrawable = (LayerDrawable) drawable;
            for (int layerNumber = 0; layerNumber < layerDrawable.getNumberOfLayers(); layerNumber++) {
                Drawable layer = layerDrawable.getDrawable(layerNumber);
                if (layer instanceof ReactViewBackgroundDrawable) {
                    return (ReactViewBackgroundDrawable) layer;
                }
            }
        }

        return null;
    }
} 