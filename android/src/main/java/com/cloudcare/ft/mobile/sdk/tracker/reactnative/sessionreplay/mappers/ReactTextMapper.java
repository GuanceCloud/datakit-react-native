/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

package com.cloudcare.ft.mobile.sdk.tracker.reactnative.sessionreplay.mappers;

import com.cloudcare.ft.mobile.sdk.tracker.reactnative.sessionreplay.NoopTextPropertiesResolver;
import com.cloudcare.ft.mobile.sdk.tracker.reactnative.sessionreplay.ReactTextPropertiesResolver;
import com.cloudcare.ft.mobile.sdk.tracker.reactnative.sessionreplay.TextPropertiesResolver;
import com.cloudcare.ft.mobile.sdk.tracker.reactnative.sessionreplay.TextViewUtils;
import com.facebook.react.bridge.ReactContext;
import com.facebook.react.uimanager.UIManagerModule;
import com.facebook.react.views.text.ReactTextView;
import com.ft.sdk.sessionreplay.model.Wireframe;
import com.ft.sdk.sessionreplay.recorder.MappingContext;
import com.ft.sdk.sessionreplay.recorder.mapper.TextViewMapper;
import com.ft.sdk.sessionreplay.utils.AsyncJobStatusCallback;
import com.ft.sdk.sessionreplay.utils.DefaultColorStringFormatter;
import com.ft.sdk.sessionreplay.utils.DefaultViewBoundsResolver;
import com.ft.sdk.sessionreplay.utils.DefaultViewIdentifierResolver;
import com.ft.sdk.sessionreplay.utils.DrawableToColorMapperFactory;
import com.ft.sdk.sessionreplay.utils.InternalLogger;

import java.util.List;

public class ReactTextMapper extends TextViewMapper<ReactTextView> {
    private final TextPropertiesResolver reactTextPropertiesResolver;
    private final TextViewUtils textViewUtils;

    public ReactTextMapper() {
        this(new NoopTextPropertiesResolver(), new TextViewUtils());
    }

    public ReactTextMapper(TextPropertiesResolver reactTextPropertiesResolver, TextViewUtils textViewUtils) {
        super(
                DefaultViewIdentifierResolver.get(),
                DefaultColorStringFormatter.get(),
                DefaultViewBoundsResolver.get(),
                DrawableToColorMapperFactory.getDefault()
        );
        this.reactTextPropertiesResolver = reactTextPropertiesResolver;
        this.textViewUtils = textViewUtils;
    }

    public ReactTextMapper(ReactContext reactContext, UIManagerModule uiManagerModule) {
        this(
                uiManagerModule == null ? new NoopTextPropertiesResolver() :
                        new ReactTextPropertiesResolver(reactContext, uiManagerModule),
                new TextViewUtils()
        );
    }

    @Override
    public List<Wireframe> map(ReactTextView view, MappingContext mappingContext, AsyncJobStatusCallback asyncJobStatusCallback, InternalLogger internalLogger) {
        List<Wireframe> wireframes = super.map(view, mappingContext, asyncJobStatusCallback, internalLogger);
        return textViewUtils.mapTextViewToWireframes(
                wireframes,
                view,
                mappingContext,
                reactTextPropertiesResolver
        );
    }
} 