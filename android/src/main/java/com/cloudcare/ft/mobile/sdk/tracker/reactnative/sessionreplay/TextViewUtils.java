/*
 *
 *  * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 *  * This product includes software developed at Datadog (https://www.datadoghq.com/).
 *  * Copyright 2016-Present Datadog, Inc.
 *
 */

package com.cloudcare.ft.mobile.sdk.tracker.reactnative.sessionreplay;

import android.widget.TextView;
import com.ft.sdk.sessionreplay.model.TextWireframe;
import com.ft.sdk.sessionreplay.model.Wireframe;
import com.ft.sdk.sessionreplay.recorder.MappingContext;

import java.util.ArrayList;
import java.util.List;

public class TextViewUtils {
    public List<Wireframe> mapTextViewToWireframes(
            List<Wireframe> wireframes,
            TextView view,
            MappingContext mappingContext,
            TextPropertiesResolver reactTextPropertiesResolver
    ) {
        List<Wireframe> result = new ArrayList<>();
        float pixelDensity = mappingContext.getSystemInformation().getScreenDensity();

        for (Wireframe originalWireframe : wireframes) {
            if (!(originalWireframe instanceof TextWireframe)) {
                result.add(originalWireframe);
            } else {
                result.add(reactTextPropertiesResolver.addReactNativeProperties(
                        (TextWireframe) originalWireframe,
                        view,
                        pixelDensity
                ));
            }
        }

        return result;
    }
} 